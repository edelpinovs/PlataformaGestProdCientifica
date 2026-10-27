"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  buscarDuplicadoProfesor,
  generarNombreNormalizado,
  registrarProfesor,
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
  registrado?: string; // nombre completo del profesor registrado
  valores?: Record<string, string>;
};

// CU-004: el administrador registra un profesor investigador (RF-004).
export async function crearProfesor(
  _: EstadoProfesor,
  formData: FormData,
): Promise<EstadoProfesor> {
  await requireModulo("profesores");

  // Captura todos los valores para repoblar el formulario si hay error.
  const valores = Object.fromEntries(
    [
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
    ].map((k) => [k, String(formData.get(k) ?? "")]),
  );

  const datos = registrarProfesor.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return {
      error: issue.message,
      campo: issue.path[0] as CampoProfesor,
      valores,
    };
  }

  // Verificamos unicidad antes del insert.
  const existentes = await prisma.profesor.findMany({
    select: { codigo: true, correo: true, orcid: true, scholarId: true, scopusId: true, cvu: true },
  });
  const duplicado = buscarDuplicadoProfesor(datos.data, existentes);
  if (duplicado) {
    return { error: duplicado.mensaje, campo: duplicado.campo, valores };
  }

  const { departamentoId, gradoId, ...resto } = datos.data;

  try {
    await prisma.profesor.create({
      data: {
        ...resto,
        nombreNormalizado: generarNombreNormalizado(datos.data.nombres, datos.data.apellidos),
        ...(departamentoId !== undefined ? { departamentoId } : {}),
        ...(gradoId !== undefined ? { gradoId } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Algunos de los identificadores ingresados ya están registrados.", valores };
    }
    throw e;
  }

  revalidatePath("/profesores");
  return { registrado: `${datos.data.nombres} ${datos.data.apellidos}` };
}
