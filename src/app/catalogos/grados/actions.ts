"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buscarDuplicado, gradoCientifico, motivoNoEliminable } from "@/modules/catalogos/grados";

export type EstadoGrado = {
  error?: string;
  campo?: "nombre" | "nomenclatura";
  registrado?: string;
  valores?: { nombre: string; nomenclatura: string };
};

// CU-001: el administrador registra un Grado Científico (RF-001).
export async function registrarGrado(_: EstadoGrado, formData: FormData): Promise<EstadoGrado> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
  };
  const datos = gradoCientifico.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoGrado["campo"], valores };
  }

  const existentes = await prisma.gradoCientifico.findMany({ select: { nombre: true, nomenclatura: true } });
  const duplicado = buscarDuplicado(datos.data, existentes);
  if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

  try {
    await prisma.gradoCientifico.create({ data: datos.data });
  } catch (e) {
    // Otro administrador lo registró entre la consulta y el alta; la BD lo impide con @unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese grado científico ya existe en el catálogo.", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/grados");
  return { registrado: datos.data.nombre };
}

export type EstadoFila = {
  error?: string;
  campo?: "nombre" | "nomenclatura";
  valores?: { nombre: string; nomenclatura: string };
};

const NO_EXISTE = "Ese grado ya no existe en el catálogo. Recarga la página.";

function leerId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// #55: cambia nombre y nomenclatura con las mismas reglas del registro.
export async function editarGrado(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = leerId(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
  };
  const datos = gradoCientifico.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoFila["campo"], valores };
  }

  const catalogo = await prisma.gradoCientifico.findMany({ select: { id: true, nombre: true, nomenclatura: true } });
  if (!catalogo.some((g) => g.id === id)) return { error: NO_EXISTE };
  const duplicado = buscarDuplicado(datos.data, catalogo, id);
  if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

  try {
    await prisma.gradoCientifico.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: otro administrador tomó ese nombre o nomenclatura entre la consulta y el cambio.
      if (e.code === "P2002") return { error: "Ese grado científico ya existe en el catálogo.", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/catalogos/grados");
  redirect(`/catalogos/grados?editado=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #55: elimina un grado solo si ningún profesor lo tiene asignado.
export async function eliminarGrado(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("catalogos");

  const id = leerId(formData);
  if (!id) return { error: NO_EXISTE };

  const grado = await prisma.gradoCientifico.findUnique({
    where: { id },
    select: { nombre: true, _count: { select: { profesores: true } } },
  });
  if (!grado) return { error: NO_EXISTE };

  const motivo = motivoNoEliminable(grado.nombre, grado._count.profesores);
  if (motivo) return { error: motivo };

  // La condición va en el mismo DELETE (... AND NOT EXISTS profesor): si alguien asigna el grado
  // a un profesor en este instante, no se borra. Sin ella, la base dejaría a ese profesor sin grado.
  const { count } = await prisma.gradoCientifico.deleteMany({ where: { id, profesores: { none: {} } } });
  if (count === 0) {
    const profesores = await prisma.profesor.count({ where: { gradoId: id } });
    return { error: motivoNoEliminable(grado.nombre, profesores) ?? NO_EXISTE };
  }

  revalidatePath("/catalogos/grados");
  redirect(`/catalogos/grados?eliminado=${encodeURIComponent(grado.nombre)}`, RedirectType.replace);
}
