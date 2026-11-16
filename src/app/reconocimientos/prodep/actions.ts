"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  calcularVigenciaProdep,
  camposReconocimientoProdep,
  crearEsquemaReconocimientoProdep,
  reconocimientoProdep,
  textoVigenciaProdep,
  validarContratacionProdep,
  type ReconocimientoProdep,
  type RegistroHistorialProdep,
} from "@/modules/reconocimientos/prodep";
import { z } from "zod";

type CampoProdep = "profesorId" | "tipoSolicitud" | "resultado" | "fechaInicio" | "fechaFin";

export type EstadoProdep = {
  error?: string;
  campo?: CampoProdep;
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

function errorValidacion(datos: ReturnType<typeof leerValores>, mensaje: string, campo?: CampoProdep): EstadoProdep {
  return {
    error: mensaje,
    campo,
    valores: { ...datos, profesorId: Number.isFinite(datos.profesorId) ? String(datos.profesorId) : "" },
  };
}

function campoDe(problema: PropertyKey | undefined): CampoProdep | undefined {
  if (problema === "profesorId" || problema === "tipoSolicitud" || problema === "resultado"
    || problema === "fechaInicio" || problema === "fechaFin") return problema;
  return undefined;
}

function validar(formData: FormData) {
  const valores = leerValores(formData);
  const datos = reconocimientoProdep.safeParse(valores);
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return {
      error: errorValidacion(
        valores,
        problema?.message ?? "Revisa los datos ingresados.",
        campoDe(problema?.path[0]),
      ),
    };
  }
  return { datos: datos.data, valores };
}

// Historial del profesor que decide si una renovación consolida los seis años. Al editar, el registro
// que se edita no cuenta como antecedente de sí mismo.
async function historialDelProfesor(profesorId: number, excluirId?: number): Promise<RegistroHistorialProdep[]> {
  const registros = await prisma.reconocimientoProdep.findMany({
    where: { profesorId, ...(excluirId === undefined ? {} : { id: { not: excluirId } }) },
    select: { id: true, tipoSolicitud: true, resultado: true, inicio: true, fin: true },
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
  });
  return registros.map((registro) => ({
    id: registro.id,
    tipoSolicitud: registro.tipoSolicitud,
    resultado: registro.resultado,
    fechaInicio: registro.inicio.toISOString().slice(0, 10),
    fechaFin: registro.fin.toISOString().slice(0, 10),
  }));
}

async function guardarProdep(datos: ReconocimientoProdep, id?: number) {
  const profesor = await prisma.profesor.findUnique({
    where: { id: datos.profesorId },
    select: { id: true, tipoContratacion: true },
  });
  if (!profesor) return { error: "El profesor seleccionado ya no existe.", campo: "profesorId" as const };

  const errorContratacion = validarContratacionProdep(profesor.tipoContratacion);
  if (errorContratacion) {
    return { error: errorContratacion, campo: "profesorId" as const };
  }

  // RF-010: la fecha de fin la fija la regla de vigencia (3 o 6 años), no la persona.
  const historial = await historialDelProfesor(datos.profesorId, id);
  const vigencia = crearEsquemaReconocimientoProdep(historial).safeParse(datos);
  if (!vigencia.success) {
    const problema = vigencia.error.issues[0];
    return {
      error: problema?.message ?? "Revisa los datos ingresados.",
      campo: campoDe(problema?.path[0]),
    };
  }

  const data = {
    profesorId: datos.profesorId,
    tipoSolicitud: datos.tipoSolicitud,
    resultado: datos.resultado,
    inicio: new Date(`${datos.fechaInicio}T00:00:00.000Z`),
    fin: new Date(`${datos.fechaFin}T00:00:00.000Z`),
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
  return { error: null };
}

export async function registrarReconocimientoProdep(_: EstadoProdep, formData: FormData): Promise<EstadoProdep> {
  await requireModulo("reconocimientos");

  const validacion = validar(formData);
  if (validacion.error) return validacion.error;

  try {
    const guardado = await guardarProdep(validacion.datos);
    if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorValidacion(validacion.valores, "El profesor seleccionado ya no existe.", "profesorId");
    }
    throw error;
  }

  revalidatePath("/reconocimientos/prodep");
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

  try {
    const guardado = await guardarProdep(validacion.datos, id);
    if (guardado.error) return errorValidacion(validacion.valores, guardado.error, guardado.campo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorValidacion(validacion.valores, "El profesor seleccionado ya no existe.", "profesorId");
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

export type VigenciaCalculada = { fechaFin: string; duracionAnios: 3 | 6; texto: string };

const entradaVigencia = camposReconocimientoProdep
  .pick({ profesorId: true, tipoSolicitud: true, resultado: true, fechaInicio: true })
  .extend({ excluirId: z.number().int().positive().optional() });

// Vista previa de la vigencia mientras se llena el formulario. El historial se consulta aquí, en el
// servidor, para no enviar al navegador los reconocimientos de todos los profesores.
export async function consultarVigenciaProdep(entrada: unknown): Promise<VigenciaCalculada | null> {
  await requireModulo("reconocimientos");

  const datos = entradaVigencia.safeParse(entrada);
  if (!datos.success) return null;

  const { excluirId, ...reconocimiento } = datos.data;
  const vigencia = calcularVigenciaProdep(reconocimiento, await historialDelProfesor(reconocimiento.profesorId, excluirId));
  return {
    fechaFin: vigencia.fechaFin,
    duracionAnios: vigencia.duracionAnios,
    texto: textoVigenciaProdep(vigencia),
  };
}
