"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cuerpoAcademico, motivoNoEliminable, revisarCuerpo } from "@/modules/cuerpos-academicos/cuerpo";

export type ValoresCuerpo = {
  clave: string;
  nombre: string;
  nivel: string;
  areaProdep: string;
  disciplina: string;
  departamentoId: string;
  anioRegistro: string;
  anioVencimiento: string;
};

export type EstadoCuerpo = {
  error?: string;
  campo?: keyof ValoresCuerpo;
  registrado?: string;
  valores?: ValoresCuerpo;
};

export type EstadoFila = {
  error?: string;
  campo?: keyof ValoresCuerpo;
  valores?: ValoresCuerpo;
};

function leerValores(formData: FormData): ValoresCuerpo {
  return {
    clave: String(formData.get("clave") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    nivel: String(formData.get("nivel") ?? ""),
    areaProdep: String(formData.get("areaProdep") ?? ""),
    disciplina: String(formData.get("disciplina") ?? ""),
    departamentoId: String(formData.get("departamentoId") ?? ""),
    anioRegistro: String(formData.get("anioRegistro") ?? ""),
    anioVencimiento: String(formData.get("anioVencimiento") ?? ""),
  };
}

async function contexto() {
  const [departamentos, cuerpos] = await Promise.all([
    prisma.departamento.findMany({ select: { id: true, nombre: true } }),
    prisma.cuerpoAcademico.findMany({ select: { id: true, clave: true } }),
  ]);
  return { departamentos, cuerpos };
}

const NO_EXISTE = "Ese cuerpo académico ya no existe. Recarga la página.";

function leerId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// CU-007: el administrador o coordinador registra un Cuerpo Académico (RF-012).
export async function registrarCuerpo(_: EstadoCuerpo, formData: FormData): Promise<EstadoCuerpo> {
  await requireModulo("cuerpos-academicos");

  const valores = leerValores(formData);
  const datos = cuerpoAcademico.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoCuerpo["campo"], valores };
  }

  const problema = revisarCuerpo(datos.data, await contexto());
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.cuerpoAcademico.create({ data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa clave ya existe en el catálogo de cuerpos académicos.", campo: "clave", valores };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "El departamento elegido ya no existe. Recarga la página.", campo: "departamentoId", valores };
    }
    throw e;
  }

  revalidatePath("/cuerpos-academicos");
  revalidatePath("/");
  return { registrado: datos.data.nombre };
}

// #59: cambia los datos del CA con las mismas reglas del registro.
export async function editarCuerpo(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("cuerpos-academicos");

  const id = leerId(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = leerValores(formData);
  const datos = cuerpoAcademico.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoFila["campo"], valores };
  }

  const ctx = await contexto();
  if (!ctx.cuerpos.some((c) => c.id === id)) return { error: NO_EXISTE };
  const problema = revisarCuerpo(datos.data, ctx, id);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.cuerpoAcademico.update({ where: { id }, data: datos.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { error: "Esa clave ya existe en el catálogo de cuerpos académicos.", campo: "clave", valores };
      if (e.code === "P2003") return { error: "El departamento elegido ya no existe. Recarga la página.", campo: "departamentoId", valores };
      if (e.code === "P2025") return { error: NO_EXISTE };
    }
    throw e;
  }

  revalidatePath("/cuerpos-academicos");
  revalidatePath("/");
  redirect(`/cuerpos-academicos?editado=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina un CA solo si no tiene integrantes ni LGAC.
export async function eliminarCuerpo(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("cuerpos-academicos");

  const id = leerId(formData);
  if (!id) return { error: NO_EXISTE };

  const cuerpo = await prisma.cuerpoAcademico.findUnique({
    where: { id },
    select: { nombre: true, _count: { select: { integrantes: true, lgacs: true } } },
  });
  if (!cuerpo) return { error: NO_EXISTE };

  const motivo = motivoNoEliminable(cuerpo.nombre, cuerpo._count.integrantes, cuerpo._count.lgacs);
  if (motivo) return { error: motivo };

  const { count } = await prisma.cuerpoAcademico.deleteMany({
    where: { id, integrantes: { none: {} }, lgacs: { none: {} } },
  });
  if (count === 0) {
    const actual = await prisma.cuerpoAcademico.findUnique({
      where: { id },
      select: { nombre: true, _count: { select: { integrantes: true, lgacs: true } } },
    });
    if (!actual) return { error: NO_EXISTE };
    return { error: motivoNoEliminable(actual.nombre, actual._count.integrantes, actual._count.lgacs) ?? NO_EXISTE };
  }

  revalidatePath("/cuerpos-academicos");
  revalidatePath("/");
  redirect(`/cuerpos-academicos?eliminado=${encodeURIComponent(cuerpo.nombre)}`, RedirectType.replace);
}
