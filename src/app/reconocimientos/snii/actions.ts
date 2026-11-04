"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { reconocimientoSnii, resultadoSnii, type ReconocimientoSnii } from "@/modules/reconocimientos/snii";

export type EstadoSnii = {
  error?: string;
  campo?: "profesorId" | "cvu" | "nivel" | "tipoParticipacion" | "fechaInicio" | "fechaFin" | "enRecursoReconsideracion";
  valores?: {
    profesorId: string;
    cvu: string;
    nivel: string;
    tipoParticipacion: string;
    fechaInicio: string;
    fechaFin: string;
    enRecursoReconsideracion: boolean;
  };
  registrado?: string;
};

function leerValores(formData: FormData) {
  return {
    profesorId: Number(formData.get("profesorId")),
    cvu: String(formData.get("cvu") ?? ""),
    nivel: String(formData.get("nivel") ?? ""),
    tipoParticipacion: String(formData.get("tipoParticipacion") ?? ""),
    fechaInicio: String(formData.get("fechaInicio") ?? ""),
    fechaFin: String(formData.get("fechaFin") ?? ""),
    enRecursoReconsideracion: formData.get("enRecursoReconsideracion") === "on",
  };
}

function leerId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorValidacion(datos: ReturnType<typeof leerValores>, mensaje: string, campo?: EstadoSnii["campo"]): EstadoSnii {
  return {
    error: mensaje,
    campo,
    valores: { ...datos, profesorId: Number.isFinite(datos.profesorId) ? String(datos.profesorId) : "" },
  };
}

function validar(formData: FormData) {
  const valores = leerValores(formData);
  const datos = reconocimientoSnii.safeParse(valores);
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return { error: errorValidacion(valores, problema?.message ?? "Revisa los datos ingresados.", problema?.path[0] as EstadoSnii["campo"]) };
  }
  return { datos: datos.data, valores };
}

async function guardarSnii(datos: ReconocimientoSnii, id?: number) {
  const profesor = await prisma.profesor.findUnique({ where: { id: datos.profesorId }, select: { id: true } });
  if (!profesor) return { error: "El profesor seleccionado ya no existe." };

  const otroProfesor = await prisma.profesor.findFirst({
    where: { cvu: datos.cvu, NOT: { id: datos.profesorId } },
    select: { id: true },
  });
  if (otroProfesor) return { error: "Ese CVU ya está asociado a otro profesor.", campo: "cvu" as const };

  const data = {
    profesorId: datos.profesorId,
    nivel: datos.nivel,
    tipoParticipacion: datos.tipoParticipacion,
    resultado: resultadoSnii(datos.nivel, datos.enRecursoReconsideracion),
    inicio: new Date(`${datos.fechaInicio}T00:00:00.000Z`),
    fin: new Date(`${datos.fechaFin}T00:00:00.000Z`),
  };

  await prisma.$transaction(async (transaccion) => {
    await transaccion.profesor.update({ where: { id: datos.profesorId }, data: { cvu: datos.cvu } });
    if (id === undefined) {
      await transaccion.reconocimientoSnii.create({ data });
    } else {
      await transaccion.reconocimientoSnii.update({ where: { id }, data });
    }
  });
  return { error: null };
}

export async function registrarReconocimientoSnii(_: EstadoSnii, formData: FormData): Promise<EstadoSnii> {
  await requireModulo("reconocimientos");

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await guardarSnii(validacion.datos);
    if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorValidacion(validacion.valores, "Ese CVU ya está asociado a otro profesor.", "cvu");
    }
    throw error;
  }

  revalidatePath("/reconocimientos/snii");
  return { registrado: validacion.datos.cvu };
}

export async function editarReconocimientoSnii(_: EstadoSnii, formData: FormData): Promise<EstadoSnii> {
  await requireModulo("reconocimientos");

  const id = leerId(formData);
  if (!id) return { error: "Ese reconocimiento ya no existe. Recarga la página." };

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await guardarSnii(validacion.datos, id);
    if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return errorValidacion(validacion.valores, "Ese CVU ya está asociado a otro profesor.", "cvu");
      if (error.code === "P2025") return { error: "Ese reconocimiento ya no existe. Recarga la página." };
    }
    throw error;
  }

  revalidatePath("/reconocimientos/snii");
  redirect("/reconocimientos/snii?editado=1", RedirectType.replace);
}

export async function eliminarReconocimientoSnii(_: EstadoSnii, formData: FormData): Promise<EstadoSnii> {
  await requireModulo("reconocimientos");

  const id = leerId(formData);
  if (!id) return { error: "Ese reconocimiento ya no existe. Recarga la página." };

  try {
    const { count } = await prisma.reconocimientoSnii.deleteMany({ where: { id, convocatoriaId: null } });
    if (count === 0) {
      const reconocimiento = await prisma.reconocimientoSnii.findUnique({ where: { id }, select: { convocatoriaId: true } });
      if (!reconocimiento) return { error: "Ese reconocimiento ya no existe. Recarga la página." };
      return { error: "No se puede eliminar: este reconocimiento forma parte de un resultado oficial de convocatoria." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "No se puede eliminar: el reconocimiento tiene registros oficiales relacionados." };
    }
    throw error;
  }

  revalidatePath("/reconocimientos/snii");
  redirect("/reconocimientos/snii?eliminado=1", RedirectType.replace);
}