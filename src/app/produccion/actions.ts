"use server";

import { revalidatePath } from "next/cache";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo, type ResumenEscaneo } from "@/modules/produccion/escaneo";

export type EstadoEscaneo = {
  error?: string;
  exito?: boolean;
  mensaje?: string;
  resumen?: ResumenEscaneo;
};

/**
 * Server Action para disparar el escaneo incremental desde la interfaz (RF-020, RNF-001).
 * Protegido por requireModulo("produccion") (RNF-005).
 */
export async function iniciarEscaneoAction(
  _: EstadoEscaneo,
  formData: FormData,
): Promise<EstadoEscaneo> {
  await requireModulo("produccion");

  const profesorIdRaw = formData.get("profesorId");
  const anioRaw = formData.get("anio");

  const profesorId =
    profesorIdRaw && String(profesorIdRaw) !== "todos" ? parseInt(String(profesorIdRaw), 10) : undefined;
  const anio = anioRaw && String(anioRaw).trim() !== "" ? parseInt(String(anioRaw), 10) : undefined;

  try {
    const job = await prisma.job.create({
      data: {
        tipo: "escaneo-manual",
        estado: "PENDIENTE",
      },
    });

    const resumen = await ejecutarEscaneo({
      profesorId: !isNaN(profesorId!) ? profesorId : undefined,
      anio: !isNaN(anio!) ? anio : undefined,
      jobId: job.id,
    });

    revalidatePath("/produccion");

    const mensaje = `Escaneo finalizado: ${resumen.publicacionesEncontradas} publicaciones encontradas, ${resumen.publicacionesGuardadas} guardadas, ${resumen.coautoriasDetectadas} coautorías vinculadas.`;

    return {
      exito: true,
      mensaje,
      resumen,
    };
  } catch (err: unknown) {
    return {
      error: `Error al ejecutar el escaneo: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
