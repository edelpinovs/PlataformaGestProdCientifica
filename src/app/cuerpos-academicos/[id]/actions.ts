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
import {
  designarLider,
  errorSiNoGuardoLider,
  filtroLiderIntegrante,
  mensajeTrasDesignar,
  revisarDesignacionLider,
} from "@/modules/cuerpos-academicos/lider";
import { altaLgac, idsDeProfesores, revisarLgac } from "@/modules/cuerpos-academicos/lgac";
import { idDeFormulario } from "@/modules/catalogos/comun";

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

export type EstadoLider = {
  error?: string;
  campo?: "profesorId";
  designado?: string;
  valores?: { profesorId: string };
};

export type ValoresLgac = { nombre: string; descripcion: string; profesorIds: string[] };

export type EstadoLgac = {
  error?: string;
  campo?: "nombre" | "descripcion" | "profesorIds";
  registrada?: string;
  valores?: ValoresLgac;
};

export type EstadoFilaLgac = {
  error?: string;
  campo?: "nombre" | "descripcion" | "profesorIds";
  valores?: ValoresLgac;
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

  const [profesorNuevo, integrantes, cuerpo] = await Promise.all([
    prisma.profesor.findUnique({ where: { id: datos.data.profesorId }, select: selectProfesor }),
    integrantesDe(cuerpoId),
    prisma.cuerpoAcademico.findUnique({ where: { id: cuerpoId }, select: { liderId: true } }),
  ]);
  const problema = revisarCambioIntegrante(
    profesorIdActual,
    profesorNuevo ? aProfesor(profesorNuevo) : undefined,
    integrantes,
  );
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  const dejaDeSerLider = cuerpo?.liderId === profesorIdActual && datos.data.profesorId !== profesorIdActual;
  const destinoEditado = `${ruta(cuerpoId)}?editado=${encodeURIComponent(nombreProfesor(profesorNuevo!))}${dejaDeSerLider ? "&lider=1" : ""}`;

  if (datos.data.profesorId === profesorIdActual) {
    redirect(destinoEditado, RedirectType.replace);
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
      await desvincularDeLgacs(tx, cuerpoId, profesorIdActual);
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
  redirect(destinoEditado, RedirectType.replace);
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
  const cuerpo = await prisma.cuerpoAcademico.findUnique({
    where: { id: cuerpoId },
    select: { liderId: true },
  });
  const eraLider = cuerpo?.liderId === profesorId;

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.integranteCa.deleteMany({ where: { cuerpoId, profesorId } });
      if (count === 0) throw new Error("NO_INTEGRANTE");
      await tx.cuerpoAcademico.updateMany({
        where: { id: cuerpoId, liderId: profesorId },
        data: { liderId: null },
      });
      await desvincularDeLgacs(tx, cuerpoId, profesorId);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_INTEGRANTE") {
      return { error: "Esa persona ya no es integrante. Recarga la página." };
    }
    throw e;
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  redirect(
    `${ruta(cuerpoId)}?eliminado=${encodeURIComponent(nombre)}${eraLider ? "&lider=1" : ""}`,
    RedirectType.replace,
  );
}

// RF-014 · CU-008: un único líder, que sea integrante.
export async function guardarLider(
  _: EstadoLider,
  formData: FormData,
): Promise<EstadoLider> {
  await requireModulo("cuerpos-academicos");

  const valores = { profesorId: String(formData.get("profesorId") ?? "") };
  const datos = designarLider.safeParse({
    cuerpoId: String(formData.get("cuerpoId") ?? ""),
    profesorId: valores.profesorId,
  });
  if (!datos.success) {
    return { error: datos.error.issues[0].message, campo: "profesorId", valores };
  }

  const { cuerpoId, profesorId } = datos.data;
  const [cuerpo, integrantes] = await Promise.all([
    prisma.cuerpoAcademico.findUnique({ where: { id: cuerpoId }, select: { id: true, liderId: true } }),
    integrantesDe(cuerpoId),
  ]);
  if (!cuerpo) return { error: NO_CUERPO, valores };

  const problema = revisarDesignacionLider(profesorId, integrantes);
  if (problema) return { error: problema.mensaje, campo: "profesorId", valores };

  const { count } = await prisma.cuerpoAcademico.updateMany({
    where: filtroLiderIntegrante(cuerpoId, profesorId),
    data: { liderId: profesorId },
  });
  if (count === 0) {
    const sigue = await prisma.cuerpoAcademico.findUnique({ where: { id: cuerpoId }, select: { id: true } });
    return { error: errorSiNoGuardoLider(Boolean(sigue)), campo: "profesorId", valores };
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  const nombre = integrantes.find((i) => i.profesorId === profesorId)?.nombre ?? "integrante";
  return { designado: mensajeTrasDesignar(nombre, cuerpo.liderId === profesorId) };
}

const NO_LGAC = "Esa LGAC ya no existe. Recarga la página.";

function valoresLgacDe(formData: FormData): ValoresLgac {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    profesorIds: idsDeProfesores(formData),
  };
}

async function desvincularDeLgacs(
  tx: { lgac: typeof prisma.lgac },
  cuerpoId: number,
  profesorId: number,
) {
  const lineas = await tx.lgac.findMany({
    where: { cuerpoId, profesores: { some: { id: profesorId } } },
    select: { id: true },
  });
  for (const linea of lineas) {
    await tx.lgac.update({
      where: { id: linea.id },
      data: { profesores: { disconnect: { id: profesorId } } },
    });
  }
}

async function lineasDelCa(cuerpoId: number) {
  return prisma.lgac.findMany({ where: { cuerpoId }, select: { id: true, nombre: true } });
}

// RF-015 · CU-009: registra una LGAC del CA con integrantes vinculados.
export async function registrarLgac(_: EstadoLgac, formData: FormData): Promise<EstadoLgac> {
  await requireModulo("cuerpos-academicos");

  const valores = valoresLgacDe(formData);
  const datos = altaLgac.safeParse({
    cuerpoId: String(formData.get("cuerpoId") ?? ""),
    ...valores,
  });
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoLgac["campo"], valores };
  }

  const { cuerpoId } = datos.data;
  const cuerpo = await prisma.cuerpoAcademico.findUnique({ where: { id: cuerpoId }, select: { id: true } });
  if (!cuerpo) return { error: NO_CUERPO, valores };

  const [integrantes, existentes] = await Promise.all([integrantesDe(cuerpoId), lineasDelCa(cuerpoId)]);
  const problema = revisarLgac(datos.data, integrantes, existentes);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.lgac.create({
      data: {
        cuerpoId,
        nombre: datos.data.nombre,
        descripcion: datos.data.descripcion,
        profesores: { connect: datos.data.profesorIds.map((id) => ({ id })) },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "El profesor o el cuerpo académico ya no existen. Recarga la página.", valores };
    }
    throw e;
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  return { registrada: datos.data.nombre };
}

// #59: edita nombre, descripción e integrantes de la línea.
export async function editarLgac(_: EstadoFilaLgac, formData: FormData): Promise<EstadoFilaLgac> {
  await requireModulo("cuerpos-academicos");

  const id = idDeFormulario(formData);
  const cuerpoId = leerProfesorId(formData, "cuerpoId");
  if (!id || !cuerpoId) return { error: NO_LGAC };

  const valores = valoresLgacDe(formData);
  const datos = altaLgac.safeParse({ cuerpoId: String(cuerpoId), ...valores });
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoFilaLgac["campo"], valores };
  }

  const [actual, integrantes, existentes] = await Promise.all([
    prisma.lgac.findFirst({ where: { id, cuerpoId }, select: { id: true } }),
    integrantesDe(cuerpoId),
    lineasDelCa(cuerpoId),
  ]);
  if (!actual) return { error: NO_LGAC, valores };

  const problema = revisarLgac(datos.data, integrantes, existentes, id);
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.lgac.update({
      where: { id },
      data: {
        nombre: datos.data.nombre,
        descripcion: datos.data.descripcion,
        profesores: { set: datos.data.profesorIds.map((pid) => ({ id: pid })) },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "El profesor o el cuerpo académico ya no existen. Recarga la página.", valores };
    }
    throw e;
  }

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  redirect(`${ruta(cuerpoId)}?lgac=${encodeURIComponent(datos.data.nombre)}`, RedirectType.replace);
}

// #59: elimina la LGAC del CA.
export async function eliminarLgac(_: EstadoFilaLgac, formData: FormData): Promise<EstadoFilaLgac> {
  await requireModulo("cuerpos-academicos");

  const id = idDeFormulario(formData);
  const cuerpoId = leerProfesorId(formData, "cuerpoId");
  if (!id || !cuerpoId) return { error: NO_LGAC };

  const actual = await prisma.lgac.findFirst({ where: { id, cuerpoId }, select: { nombre: true } });
  if (!actual) return { error: NO_LGAC };

  const { count } = await prisma.lgac.deleteMany({ where: { id, cuerpoId } });
  if (count === 0) return { error: NO_LGAC };

  revalidatePath(ruta(cuerpoId));
  revalidatePath("/cuerpos-academicos");
  redirect(`${ruta(cuerpoId)}?lgacEliminada=${encodeURIComponent(actual.nombre)}`, RedirectType.replace);
}
