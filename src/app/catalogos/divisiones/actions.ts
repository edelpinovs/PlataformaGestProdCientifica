"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { idDeFormulario } from "@/modules/catalogos/comun";
import { buscarDuplicada, division, motivoDivisionNoEliminable } from "@/modules/catalogos/divisiones";

export type EstadoDivision = {
  error?: string;
  campo?: "nombre" | "clave";
  registrada?: string;
  valores?: { nombre: string; clave: string };
};

// CU-002: el administrador registra una División Académica (RF-002).
export async function registrarDivision(_: EstadoDivision, formData: FormData): Promise<EstadoDivision> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    clave: String(formData.get("clave") ?? ""),
  };
  const datos = division.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoDivision["campo"], valores };
  }

  const existentes = await prisma.division.findMany({ select: { nombre: true, clave: true } });
  const duplicada = buscarDuplicada(datos.data, existentes);
  if (duplicada) return { error: duplicada.mensaje, campo: duplicada.campo, valores };

  try {
    await prisma.division.create({ data: datos.data });
  } catch (e) {
    // Otro administrador la registró entre la consulta y el alta; la BD lo impide con @unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa clave institucional ya existe en el catálogo.", campo: "clave", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/divisiones");
  return { registrada: datos.data.nombre };
}

const NO_EXISTE = "Esa división ya no existe en el catálogo. Recarga la página.";

// #59: cambia nombre y clave con las mismas reglas del registro.
export async function editarDivision(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    clave: String(formData.get("clave") ?? ""),
  };
  const datos = division.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const catalogo = await prisma.division.findMany({ select: { id: true, nombre: true, clave: true } });
  if (!catalogo.some((d) => d.id === id)) return { error: NO_EXISTE };
  const duplicada = buscarDuplicada(datos.data, catalogo, id);
  if (duplicada) return { error: duplicada.mensaje, campo: duplicada.campo, valores };

  try {
    await prisma.division.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: otro administrador tomó esa clave entre la consulta y el cambio.
      if (e.code === "P2002") return { error: "Esa clave institucional ya existe en el catálogo.", campo: "clave", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/catalogos/divisiones");
  revalidatePath("/catalogos/departamentos");
  redirect(`/catalogos/divisiones?editada=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina una división solo si no tiene departamentos.
export async function eliminarDivision(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const actual = await prisma.division.findUnique({
    where: { id },
    select: { nombre: true, _count: { select: { departamentos: true } } },
  });
  if (!actual) return { error: NO_EXISTE };

  const motivo = motivoDivisionNoEliminable(actual.nombre, actual._count.departamentos);
  if (motivo) return { error: motivo };

  // La condición va en el mismo DELETE; además la base lo impide (relación obligatoria, P2003).
  let borradas = 0;
  try {
    ({ count: borradas } = await prisma.division.deleteMany({ where: { id, departamentos: { none: {} } } }));
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")) throw e;
  }
  if (borradas === 0) {
    const departamentos = await prisma.departamento.count({ where: { divisionId: id } });
    return { error: motivoDivisionNoEliminable(actual.nombre, departamentos) ?? NO_EXISTE };
  }

  revalidatePath("/catalogos/divisiones");
  revalidatePath("/catalogos/departamentos");
  redirect(`/catalogos/divisiones?eliminada=${encodeURIComponent(actual.nombre)}`, RedirectType.replace);
}
