"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  hayTraslapeProdep,
  reconocimientoProdep,
  type ReconocimientoProdep,
} from "@/modules/reconocimientos/prodep";

const RUTA = "/reconocimientos/prodep";

export type EstadoProdep = {
  error?: string;
  campo?: "profesorId" | "tipoSolicitud" | "resultado" | "fechaInicio" | "fechaFin" | "fechas";
  valores?: {
    profesorId: string;
    tipoSolicitud: string;
    resultado: string;
    fechaInicio: string;
    fechaFin: string;
  };
  registrado?: boolean;
};

function leerValores(formData: FormData) {
  return {
    profesorId: Number(formData.get("profesorId")),
    tipoSolicitud: String(formData.get("tipoSolicitud") ?? ""),
    resultado: String(formData.get("resultado") ?? ""),
    fechaInicio: String(formData.get("fechaInicio") ?? ""),
    fechaFin: String(formData.get("fechaFin") ?? ""),
  };
}

function leerId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorValidacion(
  datos: ReturnType<typeof leerValores>,
  mensaje: string,
  campo?: EstadoProdep["campo"],
): EstadoProdep {
  return {
    error: mensaje,
    campo,
    valores: { ...datos, profesorId: Number.isFinite(datos.profesorId) ? String(datos.profesorId) : "" },
  };
}

function validar(formData: FormData) {
  const valores = leerValores(formData);
  const datos = reconocimientoProdep.safeParse(valores);
  if (!datos.success) {
    const problema = datos.error.issues[0];
    const campo = problema?.path[0];
    return {
      error: errorValidacion(
        valores,
        problema?.message ?? "Revisa los datos ingresados.",
        campo === "profesorId" || campo === "tipoSolicitud" || campo === "resultado"
          || campo === "fechaInicio" || campo === "fechaFin" ? campo : undefined,
      ),
    };
  }
  return { datos: datos.data, valores };
}

async function guardarProdep(datos: ReconocimientoProdep, id?: number) {
  const profesor = await prisma.profesor.findUnique({ where: { id: datos.profesorId }, select: { id: true } });
  if (!profesor) return { error: "El profesor seleccionado ya no existe." };

  const inicio = new Date(`${datos.fechaInicio}T00:00:00.000Z`);
  const fin = new Date(`${datos.fechaFin}T00:00:00.000Z`);
  if (datos.resultado !== "NO_APROBADO") {
    const periodos = await prisma.reconocimientoProdep.findMany({
      where: { profesorId: datos.profesorId, resultado: { not: "NO_APROBADO" } },
      select: { id: true, inicio: true, fin: true, resultado: true },
    });
    const choque = hayTraslapeProdep(periodos, { inicio, fin, resultado: datos.resultado }, id);
    if (choque) {
      const inicioExistente = choque.inicio.toISOString().slice(0, 10);
      const finExistente = choque.fin.toISOString().slice(0, 10);
      return {
        error: `El periodo se traslapa con una vigencia PRODEP del ${inicioExistente} al ${finExistente}.`,
        campo: "fechas" as const,
      };
    }
  }

  const data = {
    profesorId: datos.profesorId,
    tipoSolicitud: datos.tipoSolicitud,
    resultado: datos.resultado,
    inicio,
    fin,
  };

  if (id === undefined) {
    await prisma.reconocimientoProdep.create({ data });
    return { error: null };
  }

  const actualizacion = await prisma.reconocimientoProdep.updateMany({
    where: { id, convocatoriaId: null },
    data,
  });
  if (actualizacion.count === 0) {
    const reconocimiento = await prisma.reconocimientoProdep.findUnique({ where: { id }, select: { id: true } });
    return {
      error: reconocimiento
        ? "No se puede editar: este reconocimiento forma parte de un resultado oficial de convocatoria."
        : "Ese reconocimiento ya no existe. Recarga la página.",
    };
  }
  return { error: null };
}

export async function registrarReconocimientoProdep(_: EstadoProdep, formData: FormData): Promise<EstadoProdep> {
  await requireModulo("reconocimientos");

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  const guardado = await guardarProdep(validacion.datos);
  if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);

  revalidatePath(RUTA);
  return { registrado: true };
}

export async function editarReconocimientoProdep(_: EstadoProdep, formData: FormData): Promise<EstadoProdep> {
  await requireModulo("reconocimientos");

  const id = leerId(formData);
  if (!id) return { error: "Ese reconocimiento ya no existe. Recarga la página." };

  const reconocimiento = await prisma.reconocimientoProdep.findUnique({
    where: { id },
    select: { convocatoriaId: true },
  });
  if (!reconocimiento) return { error: "Ese reconocimiento ya no existe. Recarga la página." };
  if (reconocimiento.convocatoriaId !== null) {
    return { error: "No se puede editar: este reconocimiento forma parte de un resultado oficial de convocatoria." };
  }

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  const guardado = await guardarProdep(validacion.datos, id);
  if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);

  revalidatePath(RUTA);
  redirect(`${RUTA}?editado=1`, RedirectType.replace);
}

export async function eliminarReconocimientoProdep(_: EstadoProdep, formData: FormData): Promise<EstadoProdep> {
  await requireModulo("reconocimientos");

  const id = leerId(formData);
  if (!id) return { error: "Ese reconocimiento ya no existe. Recarga la página." };

  try {
    const { count } = await prisma.reconocimientoProdep.deleteMany({ where: { id, convocatoriaId: null } });
    if (count === 0) {
      const reconocimiento = await prisma.reconocimientoProdep.findUnique({
        where: { id },
        select: { convocatoriaId: true },
      });
      if (!reconocimiento) return { error: "Ese reconocimiento ya no existe. Recarga la página." };
      return { error: "No se puede eliminar: este reconocimiento forma parte de un resultado oficial de convocatoria." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: "No se puede eliminar: el reconocimiento tiene registros oficiales relacionados." };
    }
    throw error;
  }

  revalidatePath(RUTA);
  redirect(`${RUTA}?eliminado=1`, RedirectType.replace);
}
