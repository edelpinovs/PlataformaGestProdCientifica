"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { reconocimientoSnii, resultadoSnii, type ReconocimientoSnii } from "@/modules/reconocimientos/snii";
import { hayTraslape } from "@/modules/reconocimientos/vigencia";

export type EstadoSnii = {
  error?: string;
  campo?: "profesorId" | "cvu" | "nivel" | "tipoParticipacion" | "fechaInicio" | "fechaFin" | "enRecursoReconsideracion";
  valores?: {
    profesorId: string;
    cvu: string;
    confirmarCambioCvu: boolean;
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
    confirmarCambioCvu: formData.get("confirmarCambioCvu") === "on",
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

async function guardarSnii(datos: ReconocimientoSnii, confirmarCambioCvu: boolean, id?: number) {
  const profesor = await prisma.profesor.findUnique({ where: { id: datos.profesorId }, select: { id: true, cvu: true } });
  if (!profesor) return { error: "El profesor seleccionado ya no existe." };
  if (profesor.cvu && profesor.cvu !== datos.cvu && !confirmarCambioCvu) {
    return { error: "El profesor ya tiene un CVU distinto. Confirma el reemplazo para continuar.", campo: "cvu" as const };
  }

  const otroProfesor = await prisma.profesor.findFirst({
    where: { cvu: datos.cvu, NOT: { id: datos.profesorId } },
    select: { id: true },
  });
  if (otroProfesor) return { error: "Ese CVU ya está asociado a otro profesor.", campo: "cvu" as const };

  const inicio = new Date(`${datos.fechaInicio}T00:00:00.000Z`);
  const fin = new Date(`${datos.fechaFin}T00:00:00.000Z`);
  if (datos.nivel !== "NO_APROBADO") {
    const periodos = await prisma.reconocimientoSnii.findMany({
      where: { profesorId: datos.profesorId, resultado: { not: "NO_APROBADO" } },
      select: { id: true, inicio: true, fin: true },
    });
    const choque = hayTraslape(periodos, { inicio, fin }, id);
    if (choque) {
      return {
        error: "Ese periodo se traslapa con otro reconocimiento SNII del mismo profesor. Ajusta las fechas.",
        campo: "fechaInicio" as const,
      };
    }
  }

  const data = {
    profesorId: datos.profesorId,
    nivel: datos.nivel,
    tipoParticipacion: datos.tipoParticipacion,
    resultado: resultadoSnii(datos.nivel, datos.enRecursoReconsideracion),
    inicio,
    fin,
  };

  return prisma.$transaction(async (transaccion) => {
    if (id === undefined) {
      await transaccion.profesor.update({ where: { id: datos.profesorId }, data: { cvu: datos.cvu } });
      await transaccion.reconocimientoSnii.create({ data });
    } else {
      const actualizacion = await transaccion.reconocimientoSnii.updateMany({ where: { id, convocatoriaId: null }, data });
      if (actualizacion.count === 0) {
        const reconocimiento = await transaccion.reconocimientoSnii.findUnique({ where: { id }, select: { id: true } });
        return { error: reconocimiento
          ? "No se puede editar: este reconocimiento forma parte de un resultado oficial de convocatoria."
          : "Ese reconocimiento ya no existe. Recarga la página." };
      }
      await transaccion.profesor.update({ where: { id: datos.profesorId }, data: { cvu: datos.cvu } });
    }
    return { error: null };
  });
}

export async function registrarReconocimientoSnii(_: EstadoSnii, formData: FormData): Promise<EstadoSnii> {
  await requireModulo("reconocimientos");

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await guardarSnii(validacion.datos, validacion.valores.confirmarCambioCvu);
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

  const reconocimiento = await prisma.reconocimientoSnii.findUnique({ where: { id }, select: { convocatoriaId: true } });
  if (!reconocimiento) return { error: "Ese reconocimiento ya no existe. Recarga la página." };
  if (reconocimiento.convocatoriaId !== null) {
    return { error: "No se puede editar: este reconocimiento forma parte de un resultado oficial de convocatoria." };
  }

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await guardarSnii(validacion.datos, validacion.valores.confirmarCambioCvu, id);
    if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return errorValidacion(validacion.valores, "Ese CVU ya está asociado a otro profesor.", "cvu");
      if (error.code === "P2025") return { error: "El profesor seleccionado ya no existe." };
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