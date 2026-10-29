"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { EstadoFila } from "@/components/fila-editable";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  buscarDuplicadoProfesor,
  datosProfesor,
  filtroCandidatosDuplicado,
  idDeFormulario,
  mensajeUnicidadPrisma,
  motivoProfesorNoEliminable,
  registrarProfesor,
  type UsoProfesor,
} from "@/modules/profesores/profesores";

export type CampoProfesor =
  | "codigo"
  | "nombres"
  | "apellidos"
  | "correo"
  | "genero"
  | "tipoContratacion"
  | "estatusLaboral"
  | "departamentoId"
  | "gradoId"
  | "cvu"
  | "orcid"
  | "scholarId"
  | "scopusId";

export type EstadoProfesor = {
  error?: string;
  campo?: CampoProfesor;
  registrado?: string;
  valores?: Record<string, string>;
};

const CAMPOS: CampoProfesor[] = [
  "codigo",
  "nombres",
  "apellidos",
  "correo",
  "genero",
  "tipoContratacion",
  "estatusLaboral",
  "departamentoId",
  "gradoId",
  "cvu",
  "orcid",
  "scholarId",
  "scopusId",
];

const NO_EXISTE = "Ese profesor ya no existe en el directorio. Recarga la página.";
const CATALOGO_AUSENTE = "El departamento o el grado elegido ya no existe. Recarga la página.";

function valoresDe(formData: FormData) {
  return Object.fromEntries(CAMPOS.map((k) => [k, String(formData.get(k) ?? "")]));
}

function usoDeConteo(
  perfil: boolean,
  conteo: {
    reconocimientosSnii: number;
    reconocimientosProdep: number;
    cuerposAcademicos: number;
    cuerposLiderados: number;
    lgacs: number;
    participaciones: number;
    autorias: number;
    cortesEscaneo: number;
    programas: number;
  },
): UsoProfesor {
  return {
    perfil: perfil ? 1 : 0,
    reconocimientos: conteo.reconocimientosSnii + conteo.reconocimientosProdep,
    cuerpos: conteo.cuerposAcademicos,
    liderazgos: conteo.cuerposLiderados,
    lgacs: conteo.lgacs,
    participaciones: conteo.participaciones,
    autorias: conteo.autorias,
    cortes: conteo.cortesEscaneo,
    programas: conteo.programas,
  };
}

const seleccionUso = {
  reconocimientosSnii: true,
  reconocimientosProdep: true,
  cuerposAcademicos: true,
  cuerposLiderados: true,
  lgacs: true,
  participaciones: true,
  autorias: true,
  cortesEscaneo: true,
  programas: true,
} as const;

const sinRelaciones = {
  perfil: { is: null },
  reconocimientosSnii: { none: {} },
  reconocimientosProdep: { none: {} },
  cuerposAcademicos: { none: {} },
  cuerposLiderados: { none: {} },
  lgacs: { none: {} },
  participaciones: { none: {} },
  autorias: { none: {} },
  cortesEscaneo: { none: {} },
  programas: { none: {} },
} as const;

const SELECCION_UNICIDAD = {
  id: true,
  codigo: true,
  correo: true,
  orcid: true,
  scholarId: true,
  scopusId: true,
  cvu: true,
} as const;

function errorPrisma(e: unknown, valores: Record<string, string>): EstadoProfesor | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (e.code === "P2002") {
    const duplicado = mensajeUnicidadPrisma(e.meta?.target);
    return { error: duplicado.mensaje, campo: duplicado.campo, valores };
  }
  if (e.code === "P2003") return { error: CATALOGO_AUSENTE, valores };
  if (e.code === "P2025") return { error: NO_EXISTE };
  return null;
}

// CU-004: el administrador registra un profesor investigador (RF-004).
export async function crearProfesor(_: EstadoProfesor, formData: FormData): Promise<EstadoProfesor> {
  await requireModulo("profesores");

  const valores = valoresDe(formData);
  const datos = registrarProfesor.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as CampoProfesor, valores };
  }

  const existentes = await prisma.profesor.findMany({
    where: { OR: filtroCandidatosDuplicado(datos.data) },
    select: SELECCION_UNICIDAD,
  });
  const duplicado = buscarDuplicadoProfesor(datos.data, existentes);
  if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

  try {
    await prisma.profesor.create({ data: datosProfesor(datos.data) });
  } catch (e) {
    const prismaError = errorPrisma(e, valores);
    if (prismaError) return prismaError;
    throw e;
  }

  revalidatePath("/profesores");
  return { registrado: `${datos.data.nombres} ${datos.data.apellidos}` };
}

// #59: cambia el perfil con las mismas reglas del registro.
export async function editarProfesor(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("profesores");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const valores = valoresDe(formData);
  const datos = registrarProfesor.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: String(issue.path[0]), valores };
  }

  const actual = await prisma.profesor.findUnique({ where: { id }, select: { id: true } });
  if (!actual) return { error: NO_EXISTE };
  const existentes = await prisma.profesor.findMany({
    where: { OR: filtroCandidatosDuplicado(datos.data) },
    select: SELECCION_UNICIDAD,
  });
  const duplicado = buscarDuplicadoProfesor(datos.data, existentes, id);
  if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

  try {
    await prisma.profesor.update({ where: { id }, data: datosProfesor(datos.data) });
  } catch (e) {
    const prismaError = errorPrisma(e, valores);
    if (prismaError) return prismaError;
    throw e;
  }

  revalidatePath("/profesores");
  redirect(
    `/profesores?editado=${encodeURIComponent(`${datos.data.nombres} ${datos.data.apellidos}`)}`,
    RedirectType.replace,
  );
}

// #59: elimina un profesor solo si no tiene perfil, reconocimientos, producción u otras relaciones.
export async function eliminarProfesor(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("profesores");

  const id = idDeFormulario(formData);
  if (!id) return { error: NO_EXISTE };

  const actual = await prisma.profesor.findUnique({
    where: { id },
    select: {
      nombres: true,
      apellidos: true,
      perfil: { select: { id: true } },
      _count: { select: seleccionUso },
    },
  });
  if (!actual) return { error: NO_EXISTE };

  const nombre = `${actual.nombres} ${actual.apellidos}`;
  const motivo = motivoProfesorNoEliminable(nombre, usoDeConteo(Boolean(actual.perfil), actual._count));
  if (motivo) return { error: motivo };

  let borrados = 0;
  try {
    ({ count: borrados } = await prisma.profesor.deleteMany({ where: { id, ...sinRelaciones } }));
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")) throw e;
  }
  if (borrados === 0) {
    const ahora = await prisma.profesor.findUnique({
      where: { id },
      select: { perfil: { select: { id: true } }, _count: { select: seleccionUso } },
    });
    return {
      error:
        (ahora && motivoProfesorNoEliminable(nombre, usoDeConteo(Boolean(ahora.perfil), ahora._count))) || NO_EXISTE,
    };
  }

  revalidatePath("/profesores");
  redirect(`/profesores?eliminado=${encodeURIComponent(nombre)}`, RedirectType.replace);
}
