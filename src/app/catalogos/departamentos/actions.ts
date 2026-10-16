"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { departamento, revisarDepartamento } from "@/modules/catalogos/departamentos";

export type EstadoDepartamento = {
  error?: string;
  campo?: "nombre" | "nomenclatura" | "divisionId";
  registrado?: string;
  valores?: { nombre: string; nomenclatura: string; divisionId: string };
};

// CU-003: el administrador registra un Departamento dentro de una División existente (RF-003).
export async function registrarDepartamento(
  _: EstadoDepartamento,
  formData: FormData,
): Promise<EstadoDepartamento> {
  await requireModulo("catalogos");

  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    nomenclatura: String(formData.get("nomenclatura") ?? ""),
    divisionId: String(formData.get("divisionId") ?? ""),
  };
  const datos = departamento.safeParse(valores);
  if (!datos.success) {
    const issue = datos.error.issues[0];
    return { error: issue.message, campo: issue.path[0] as EstadoDepartamento["campo"], valores };
  }

  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ select: { id: true, nombre: true } }),
    prisma.departamento.findMany({ select: { nombre: true, nomenclatura: true, divisionId: true } }),
  ]);
  const problema = revisarDepartamento(datos.data, { divisiones, departamentos });
  if (problema) return { error: problema.mensaje, campo: problema.campo, valores };

  try {
    await prisma.departamento.create({ data: datos.data });
  } catch (e) {
    // Cambios simultáneos de otro administrador: la BD impide la nomenclatura repetida
    // (@unique, P2002) y la división inexistente (llave foránea, P2003).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Esa nomenclatura ya existe en el catálogo.", campo: "nomenclatura", valores };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "La división elegida ya no existe. Recarga la página.", campo: "divisionId", valores };
    }
    throw e;
  }

  revalidatePath("/catalogos/departamentos");
  revalidatePath("/catalogos/divisiones");
  return { registrado: datos.data.nombre };
}
