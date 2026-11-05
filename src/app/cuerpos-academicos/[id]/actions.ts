"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  altaIntegrante,
  nombreProfesor,
  revisarAltaIntegrante,
  revisarBajaIntegrante,
  revisarCambioIntegrante,
  tieneProdepActivo,
  type IntegranteResumen,
  type ProfesorParaCa,
} from "@/modules/cuerpos-academicos/integrantes";

export type EstadoIntegrante = {
  error?: string;
  campo?: "profesorId";
  asignado?: string;
  valores?: { profesorId: string };
};

export type EstadoFilaIntegrante = {
  error?: string;
  campo?: "profesorId";
  valores?: { profesorId: string };
};

function hoyUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function aProfesor(p: {
  id: number;
  nombres: string;
  apellidos: string;
  codigo: string;
  tipoContratacion: ProfesorParaCa["tipoContratacion"];
  estatusLaboral: string;
  reconocimientosProdep: { resultado: string; inicio: Date; fin: Date }[];
}): ProfesorParaCa {
  return {
    id: p.id,
    nombres: p.nombres,
    apellidos: p.apellidos,
    codigo: p.codigo,
    tipoContratacion: p.tipoContratacion,
    estatusLaboral: p.estatusLaboral,
    prodepActivo: tieneProdepActivo(p.reconocimientosProdep, hoyUtc()),
  };
}

const selectProfesor = {
  id: true,
  nombres: true,
  apellidos: true,
  codigo: true,
  tipoContratacion: true,
  estatusLaboral: true,
  reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
} as const;

async function integrantesDe(cuerpoId: number): Promise<IntegranteResumen[]> {
  const filas = await prisma.integranteCa.findMany({
    where: { cuerpoId },
    include: { profesor: { select: selectProfesor } },
  });
  return filas.map((f) => ({
    profesorId: f.profesorId,
    nombre: nombreProfesor(f.profesor),
    prodepActivo: tieneProdepActivo(f.profesor.reconocimientosProdep, hoyUtc()),
  }));
}

function ruta(cuerpoId: number) {
  return `/cuerpos-academicos/${cuerpoId}`;
}

function leerProfesorId(formData: FormData, campo = "profesorId") {
  const id = Number(formData.get(campo));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const NO_CUERPO = "Ese cuerpo académico ya no existe. Recarga la página.";

// CU-008: asigna un profesor de tiempo completo como integrante (RF-013).
export async function asignarIntegrante(
  _: EstadoIntegrante,
  formData: FormData,
): Promise<EstadoIntegrante> {
  await requireModulo("cuerpos-academicos");

  const valores = { profesorId: String(formData.get("profesorId") ?? "") };
  const datos = altaIntegrante.safeParse({
    cuerpoId: String(formData.get("cuerpoId") ?? ""),
    profesorId: valores.profesorId,
  });
  if (!datos.success) {
    return { error: datos.error.issues[0].message, campo: "profesorId", valores };
  }

  const { cuerpoId, profesorId } = datos.data;
  const cuerpo = await prisma.cuerpoAcademico.findUnique({ where: { id: cuerpoId }, select: { id: true } });
  if (!cuerpo) return { error: NO_CUERPO, valores };

  const [profesor, integrantes] = await Promise.all([
    prisma.profesor.findUnique({ where: { id: profesorId }, select: selectProfesor }),
    integrantesDe(cuerpoId),
  ]);
  const problema = revisarAltaIntegrante(profesor ? aProfesor(profesor) : undefined, integrantes);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.integranteCa.create({ data: { cuerpoId, profesorId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese profesor ya es integrante de este cuerpo académico.", campo: "profesorId", valores };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "El profesor o el cuerpo académico ya no existen. Recarga la página.", campo: "profesorId", valores };
    }
    throw e;
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  return { asignado: nombreProfesor(profesor!) };
}

// #59: cambia el profesor del vínculo con las mismas reglas del alta.
export async function cambiarIntegrante(
  _: EstadoFilaIntegrante,
  formData: FormData,
): Promise<EstadoFilaIntegrante> {
  await requireModulo("cuerpos-academicos");

  const cuerpoId = leerProfesorId(formData, "cuerpoId");
  const profesorIdActual = leerProfesorId(formData, "id");
  if (!cuerpoId || !profesorIdActual) return { error: NO_CUERPO };

  const valores = { profesorId: String(formData.get("profesorId") ?? "") };
  const datos = altaIntegrante.safeParse({ cuerpoId: String(cuerpoId), profesorId: valores.profesorId });
  if (!datos.success) {
    return { error: datos.error.issues[0].message, campo: "profesorId", valores };
  }

  const [profesorNuevo, integrantes] = await Promise.all([
    prisma.profesor.findUnique({ where: { id: datos.data.profesorId }, select: selectProfesor }),
    integrantesDe(cuerpoId),
  ]);
  const problema = revisarCambioIntegrante(
    profesorIdActual,
    profesorNuevo ? aProfesor(profesorNuevo) : undefined,
    integrantes,
  );
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  if (datos.data.profesorId === profesorIdActual) {
    redirect(`${ruta(cuerpoId)}?editado=${encodeURIComponent(nombreProfesor(profesorNuevo!))}`, RedirectType.replace);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.integranteCa.deleteMany({
        where: { cuerpoId, profesorId: profesorIdActual },
      });
      if (count === 0) throw new Error("NO_INTEGRANTE");
      await tx.integranteCa.create({ data: { cuerpoId, profesorId: datos.data.profesorId } });
      await tx.cuerpoAcademico.updateMany({
        where: { id: cuerpoId, liderId: profesorIdActual },
        data: { liderId: null },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_INTEGRANTE") {
      return { error: "Esa persona ya no es integrante. Recarga la página." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese profesor ya es integrante de este cuerpo académico.", campo: "profesorId", valores };
    }
    throw e;
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  redirect(`${ruta(cuerpoId)}?editado=${encodeURIComponent(nombreProfesor(profesorNuevo!))}`, RedirectType.replace);
}

// #59: quita al integrante si el CA no se queda sin PRODEP activo.
export async function quitarIntegrante(
  _: EstadoFilaIntegrante,
  formData: FormData,
): Promise<EstadoFilaIntegrante> {
  await requireModulo("cuerpos-academicos");

  const cuerpoId = leerProfesorId(formData, "cuerpoId");
  const profesorId = leerProfesorId(formData, "id");
  if (!cuerpoId || !profesorId) return { error: NO_CUERPO };

  const integrantes = await integrantesDe(cuerpoId);
  const motivo = revisarBajaIntegrante(profesorId, integrantes);
  if (motivo) return { error: motivo };

  const nombre = integrantes.find((i) => i.profesorId === profesorId)?.nombre ?? "integrante";

  const { count } = await prisma.integranteCa.deleteMany({ where: { cuerpoId, profesorId } });
  if (count === 0) return { error: "Esa persona ya no es integrante. Recarga la página." };

  await prisma.cuerpoAcademico.updateMany({
    where: { id: cuerpoId, liderId: profesorId },
    data: { liderId: null },
  });

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  redirect(`${ruta(cuerpoId)}?eliminado=${encodeURIComponent(nombre)}`, RedirectType.replace);
}
