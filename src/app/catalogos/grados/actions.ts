"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buscarDuplicado, gradoCientifico } from "@/modules/catalogos/grados";

export type EstadoGrado = {
  error?: string;
  campo?: "nombre" | "nomenclatura";
  registrado?: string;
  valores?: { nombre: string; nomenclatura: string };
};

// CU-001: el administrador registra un Grado Científico (RF-001).
export async function registrarGrado(_: EstadoGrado, formData: FormData): Promise<EstadoGrado> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
  };
  const datos = gradoCientifico.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoGrado["campo"], valores };
  }

  const existentes = await prisma.gradoCientifico.findMany({ select: { nombre: true, nomenclatura: true } });
  const duplicado = buscarDuplicado(datos.data, existentes);
  if (duplicado) return { error: duplicado.mensaje, campo: duplicado.campo, valores };

  try {
    await prisma.gradoCientifico.create({ data: datos.data });
  } catch (e) {
    // Otro administrador lo registró entre la consulta y el alta; la BD lo impide con @unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ese grado científico ya existe en el catálogo.", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/grados");
  return { registrado: datos.data.nombre };
}
