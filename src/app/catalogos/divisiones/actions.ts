"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buscarClaveDuplicada, division } from "@/modules/catalogos/divisiones";

export type EstadoDivision = {
  error?: string;
  campo?: "nombre" | "clave";
  registrada?: string;
  valores?: { nombre: string; clave: string };
};

// CU-002: el administrador registra una División Académica (RF-002).
export async function registrarDivision(_: EstadoDivision, formData: FormData): Promise<EstadoDivision> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    clave: String(formData.get("clave") ?? ""),
  };
  const datos = division.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoDivision["campo"], valores };
  }

  const existentes = await prisma.division.findMany({ select: { nombre: true, clave: true } });
  const duplicada = buscarClaveDuplicada(datos.data, existentes);
  if (duplicada) return { error: duplicada, campo: "clave", valores };

  try {
    await prisma.division.create({ data: datos.data });
  } catch (e) {
    // Otro administrador la registró entre la consulta y el alta; la BD lo impide con @unique.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa clave institucional ya existe en el catálogo.", campo: "clave", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/divisiones");
  return { registrada: datos.data.nombre };
}
