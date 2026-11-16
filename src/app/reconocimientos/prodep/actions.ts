"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  camposReconocimientoProdep,
  crearEsquemaReconocimientoProdep,
  type ReconocimientoProdep,
  type RegistroHistorialProdep,
} from "@/modules/reconocimientos/prodep";
import { hayTraslape } from "@/modules/reconocimientos/vigencia";

export type EstadoProdep = {
  error?: string;
  campo?: "profesorId" | "tipoSolicitud" | "resultado" | "fechaInicio" | "fechaFin";
  valores?: {
    profesorId: string;
    tipoSolicitud: string;
    resultado: string;
    fechaInicio: string;
    fechaFin: string;
  };
  registrado?: string;
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

function valorCampo(valor: PropertyKey | undefined): EstadoProdep["campo"] {
  if (valor === "profesorId" || valor === "tipoSolicitud" || valor === "resultado"
    || valor === "fechaInicio" || valor === "fechaFin") return valor;
  return undefined;
}

function errorValidacion(
  datos: ReturnType<typeof leerValores>,
  mensaje: string,
  campo?: EstadoProdep["campo"],
): EstadoProdep {
  return {
    error: mensaje,
    campo,
    valores: {
      ...datos,
      profesorId: Number.isFinite(datos.profesorId) ? String(datos.profesorId) : "",
    },
  };
}

function obtenerHistorial(
  historial: {
    id: number;
    tipoSolicitud: RegistroHistorialProdep["tipoSolicitud"];
    resultado: RegistroHistorialProdep["resultado"];
    inicio: Date;
    fin: Date;
  }[],
): RegistroHistorialProdep[] {
  return historial.map((registro) => ({
    id: registro.id,
    tipoSolicitud: registro.tipoSolicitud,
    resultado: registro.resultado,
    fechaInicio: registro.inicio.toISOString().slice(0, 10),
    fechaFin: registro.fin.toISOString().slice(0, 10),
  }));
}

async function validarYGuardar(datos: ReconocimientoProdep, id?: number) {
  const profesor = await prisma.profesor.findUnique({
    where: { id: datos.profesorId },
    select: { id: true },
  });
  if (!profesor) return { error: "El profesor seleccionado ya no existe." };

  const historialRegistros = await prisma.reconocimientoProdep.findMany({
    where: { profesorId: datos.profesorId, ...(id === undefined ? {} : { id: { not: id } }) },
    select: { id: true, tipoSolicitud: true, resultado: true, inicio: true, fin: true },
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
  });
  const historial = obtenerHistorial(historialRegistros);
  const validacion = crearEsquemaReconocimientoProdep(historial).safeParse(datos);
  if (!validacion.success) {
    const problema = validacion.error.issues[0];
    return {
      error: problema?.message ?? "Revisa los datos ingresados.",
      campo: valorCampo(problema?.path[0]),
    };
  }

  const inicio = new Date(`${datos.fechaInicio}T00:00:00.000Z`);
  const fin = new Date(`${datos.fechaFin}T00:00:00.000Z`);
  const resultado = datos.resultado;
  if (resultado !== "NO_APROBADO") {
    const periodos = historialRegistros
      .filter((registro) => registro.resultado !== "NO_APROBADO")
      .map((registro) => ({ id: registro.id, inicio: registro.inicio, fin: registro.fin }));
    const choque = hayTraslape(periodos, { inicio, fin }, id);
    if (choque) {
      return {
        error: "Ese periodo se traslapa con otro reconocimiento PRODEP del mismo profesor. Ajusta las fechas.",
        campo: "fechaInicio" as const,
      };
    }
  }

  const datosGuardar = {
    profesorId: datos.profesorId,
    tipoSolicitud: datos.tipoSolicitud,
    resultado: datos.resultado,
    inicio,
    fin,
  };

  if (id === undefined) {
    await prisma.reconocimientoProdep.create({ data: datosGuardar });
  } else {
    const actualizacion = await prisma.reconocimientoProdep.updateMany({
      where: { id, convocatoriaId: null },
      data: datosGuardar,
    });
    if (actualizacion.count === 0) {
      const reconocimiento = await prisma.reconocimientoProdep.findUnique({
        where: { id },
        select: { id: true },
      });
      return {
        error: reconocimiento
          ? "No se puede editar: este reconocimiento forma parte de un resultado oficial de convocatoria."
          : "Ese reconocimiento ya no existe. Recarga la página.",
      };
    }
  }

  return { error: null };
}

function validarCampos(datos: ReturnType<typeof leerValores>) {
  const validacion = camposReconocimientoProdep.safeParse(datos);
  if (!validacion.success) {
    const problema = validacion.error.issues[0];
    return {
      error: errorValidacion(datos, problema?.message ?? "Revisa los datos ingresados.", valorCampo(problema?.path[0])),
    };
  }
  return { datos: validacion.data, valores: datos };
}

export async function registrarReconocimientoProdep(_: EstadoProdep, formData: FormData): Promise<EstadoProdep> {
  await requireModulo("reconocimientos");

  const valores = leerValores(formData);
  const validacion = validarCampos(valores);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await validarYGuardar(validacion.datos);
    if (guardado.error) return errorValidacion(valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return errorValidacion(valores, "No se pudo guardar: revisa el profesor y los datos relacionados.");
    }
    throw error;
  }

  revalidatePath("/reconocimientos/prodep");
  return { registrado: String(validacion.datos.profesorId) };
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

  const valores = leerValores(formData);
  const validacion = validarCampos(valores);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await validarYGuardar(validacion.datos, id);
    if (guardado.error) return errorValidacion(valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return errorValidacion(valores, "No se pudo guardar: revisa el profesor y los datos relacionados.");
    }
    throw error;
  }

  revalidatePath("/reconocimientos/prodep");
  redirect("/reconocimientos/prodep?editado=1", RedirectType.replace);
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

  revalidatePath("/reconocimientos/prodep");
  redirect("/reconocimientos/prodep?eliminado=1", RedirectType.replace);
}
