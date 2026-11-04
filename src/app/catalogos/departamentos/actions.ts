"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { idDeFormulario } from "@/modules/catalogos/comun";
import { departamento, motivoDepartamentoNoEliminable, revisarDepartamento } from "@/modules/catalogos/departamentos";

export type EstadoDepartamento = {
  error?: string;
  campo?: "nombre" | "nomenclatura" | "divisionId";
  registrado?: string;
  valores?: { nombre: string; nomenclatura: string; divisionId: string };
};

// CU-003: el administrador registra un Departamento dentro de una División existente (RF-003).
export async function registrarDepartamento(
  _: EstadoDepartamento,
  formData: FormData,
): Promise<EstadoDepartamento> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
    divisionId: String(formData.get("divisionId") ?? ""),
  };
  const datos = departamento.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoDepartamento["campo"], valores };
  }

  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ select: { id: true, nombre: true } }),
    prisma.departamento.findMany({ select: { nombre: true, nomenclatura: true, divisionId: true } }),
  ]);
  const problema = revisarDepartamento(datos.data, { divisiones, departamentos });
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.departamento.create({ data: datos.data });
  } catch (e) {
    // Cambios simultáneos de otro administrador: la BD impide la nomenclatura repetida
    // (@unique, P2002) y la división inexistente (llave foránea, P2003).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa nomenclatura ya existe en el catálogo.", campo: "nomenclatura", valores };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "La división elegida ya no existe. Recarga la página.", campo: "divisionId", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/departamentos");
  revalidatePath("/catalogos/divisiones");
  return { registrado: datos.data.nombre };
}

const NO_EXISTE = "Ese departamento ya no existe en el catálogo. Recarga la página.";

// #59: cambia división, nombre y nomenclatura con las mismas reglas del registro.
export async function editarDepartamento(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
    divisionId: String(formData.get("divisionId") ?? ""),
  };
  const datos = departamento.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ select: { id: true, nombre: true } }),
    prisma.departamento.findMany({ select: { id: true, nombre: true, nomenclatura: true, divisionId: true } }),
  ]);
  if (!departamentos.some((d) => d.id === id)) return { error: NO_EXISTE };
  const problema = revisarDepartamento(datos.data, { divisiones, departamentos }, id);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.departamento.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: "Esa nomenclatura ya existe en el catálogo.", campo: "nomenclatura", valores };
      if (e.code === "P2003") return { error: "La división elegida ya no existe. Recarga la página.", campo: "divisionId", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/catalogos/departamentos");
  revalidatePath("/catalogos/divisiones");
  redirect(`/catalogos/departamentos?editado=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina un departamento solo si no tiene profesores, programas educativos ni cuerpos académicos.
export async function eliminarDepartamento(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const actual = await prisma.departamento.findUnique({
    where: { id },
    select: { nombre: true, _count: { select: { profesores: true, programas: true, cuerposAcademicos: true } } },
  });
  if (!actual) return { error: NO_EXISTE };

  const uso = ({ profesores, programas, cuerposAcademicos }: typeof actual._count) =>
    ({ profesores, programas, cuerpos: cuerposAcademicos });
  const motivo = motivoDepartamentoNoEliminable(actual.nombre, uso(actual._count));
  if (motivo) return { error: motivo };

  // Profesores y programas apuntan con relación opcional: sin esta condición dentro del DELETE,
  // la base los dejaría sin departamento (SetNull). Cuerpos académicos: relación obligatoria (P2003).
  let borrados = 0;
  try {
    ({ count: borrados } = await prisma.departamento.deleteMany({
      where: { id, profesores: { none: {} }, programas: { none: {} }, cuerposAcademicos: { none: {} } },
    }));
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")) throw e;
  }
  if (borrados === 0) {
    const ahora = await prisma.departamento.findUnique({
      where: { id },
      select: { _count: { select: { profesores: true, programas: true, cuerposAcademicos: true } } },
    });
    return { error: (ahora && motivoDepartamentoNoEliminable(actual.nombre, uso(ahora._count))) || NO_EXISTE };
  }

  revalidatePath("/catalogos/departamentos");
  revalidatePath("/catalogos/divisiones");
  redirect(`/catalogos/departamentos?eliminado=${encodeURIComponent(actual.nombre)}`, RedirectType.replace);
}
