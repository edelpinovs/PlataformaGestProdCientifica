"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo, type ResumenEscaneo } from "@/modules/produccion/escaneo";
import { repositorioPrisma } from "./repositorio";

export type EstadoEscaneo = {
  error?: string;
  exito?: boolean;
  mensaje?: string;
  resumen?: ResumenEscaneo;
};

const anioActual = new Date().getFullYear();

const esquemaEscaneo = z.object({
  profesorId: z.string().optional().default("todos"),
  anio: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1990 && Number(v) <= anioActual + 1), {
      message: `El año debe ser un valor de 4 dígitos entre 1990 y ${anioActual + 1}.`,
    }),
});

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

  const parseo = esquemaEscaneo.safeParse({
    profesorId: profesorIdRaw ? String(profesorIdRaw) : "todos",
    anio: anioRaw ? String(anioRaw) : "",
  });

  if (!parseo.success) {
    return {
      error: parseo.error.issues[0]?.message || "Datos del formulario inválidos.",
    };
  }

  const { profesorId: profVal, anio: anioVal } = parseo.data;
  const profesorId = profVal !== "todos" && !isNaN(Number(profVal)) ? Number(profVal) : undefined;
  const anio = anioVal && anioVal !== "" ? Number(anioVal) : undefined;

  let jobId: number | undefined;

  try {
    const job = await prisma.job.create({
      data: {
        tipo: "escaneo-manual",
        estado: "PENDIENTE",
      },
    });
    jobId = job.id;

    const resumen = await ejecutarEscaneo(
      {
        profesorId,
        anio,
        jobId,
      },
      repositorioPrisma,
    );

    revalidatePath("/produccion");

    if (
      resumen.errores.length > 0 &&
      resumen.publicacionesEncontradas === 0 &&
      resumen.publicacionesGuardadas === 0
    ) {
      if (jobId) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            estado: "FALLIDO",
            error: resumen.errores.slice(0, 3).join("; "),
          },
        });
      }
      return {
        error: "No se pudo consultar ninguna de las fuentes externas. Revise la conexión o las claves de API.",
        resumen,
      };
    }

    const mensaje = `Escaneo finalizado: ${resumen.publicacionesEncontradas} publicaciones encontradas, ${resumen.publicacionesGuardadas} guardadas, ${resumen.coautoriasDetectadas} coautorías vinculadas.`;

    return {
      exito: true,
      mensaje,
      resumen,
    };
  } catch {
    if (jobId) {
      try {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            estado: "FALLIDO",
            error: "Error inesperado al ejecutar el escaneo.",
          },
        });
      } catch {
        // Ignorar fallo secundario de conexión
      }
    }
    return {
      error: "Ocurrió un error al ejecutar el escaneo. Por favor intente más tarde.",
    };
  }
}
