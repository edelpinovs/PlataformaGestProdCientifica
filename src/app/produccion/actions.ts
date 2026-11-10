"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRol } from "@/lib/auth/session";
import { TrabajoEscaneoPendiente } from "@/modules/produccion/fechas-escaneo";
import { prisma } from "@/lib/prisma";
import { datosLoteEsquema, solicitudEscaneoEsquema } from "@/modules/produccion/lotes";
import type { ResumenEscaneo } from "@/modules/produccion/escaneo";
import { crearTrabajoEscaneo, procesarSiguienteProfesor, TIPOS_ESCANEO } from "./trabajos";
import { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";

export type EstadoEscaneo = {
  resultado?: ReturnType<typeof presentarResultadoEscaneo>;
  error?: string; exito?: boolean; mensaje?: string; resumen?: ResumenEscaneo;
  jobId?: number; pendiente?: boolean; avance?: number; total?: number;
  continuar?: boolean;
  erroresCampos?: { profesorId?: string; anio?: string };
};

function actualizarPantallasProduccion() {
  for (const ruta of ["/produccion", "/produccion/escaneo", "/produccion/publicaciones"]) revalidatePath(ruta);
}

export async function iniciarEscaneoAction(_: EstadoEscaneo, formData: FormData): Promise<EstadoEscaneo> {
  await requireRol(["COORDINADOR"]);
  try {
    const jobId = formData.get("jobId");
    let trabajo;
    if (jobId !== null) {
      if (typeof jobId !== "string" || !/^[1-9]\d*$/.test(jobId) || !Number.isSafeInteger(Number(jobId))) {
        return { error: "El escaneo solicitado no es válido." };
      }
      trabajo = await prisma.job.findFirst({ where: { id: Number(jobId), tipo: { in: TIPOS_ESCANEO } } });
      if (!trabajo) return { error: "No se encontró el escaneo solicitado." };
    } else {
      const parseo = solicitudEscaneoEsquema.safeParse({
        profesorId: formData.get("profesorId") ?? "todos", anio: formData.get("anio") ?? "",
      });
      if (!parseo.success) return {
        error: parseo.error.issues[0]?.message ?? "Revisa los datos del escaneo.",
        erroresCampos: {
          profesorId: parseo.error.issues.find((error) => error.path[0] === "profesorId")?.message,
          anio: parseo.error.issues.find((error) => error.path[0] === "anio")?.message,
        },
      };
      trabajo = await crearTrabajoEscaneo("escaneo-manual",
        parseo.data.profesorId === "todos" ? undefined : Number(parseo.data.profesorId),
        parseo.data.anio ? Number(parseo.data.anio) : undefined);
    }
    const pendiente = trabajo.estado === "PENDIENTE" || trabajo.estado === "EN_PROCESO";
    if (pendiente) {
      const id = trabajo.id;
      after(async () => {
        await procesarSiguienteProfesor(id);
        actualizarPantallasProduccion();
      });
    }
    const datos = datosLoteEsquema.safeParse(trabajo.datos);
    actualizarPantallasProduccion();
    return {
      resultado: presentarResultadoEscaneo(trabajo.estado, trabajo.datos),
      jobId: trabajo.id, pendiente, avance: trabajo.avance, total: trabajo.total,
      resumen: datos.success ? {
        ...datos.data.resumen,
        errores: datos.data.resumen.errores.map(() => "No se pudo completar una consulta o guardar sus resultados."),
      } : undefined,
      error: trabajo.estado === "FALLIDO" ? "El escaneo terminó con incidencias. Puedes iniciar otro para reintentar los datos pendientes." : undefined,
      exito: trabajo.estado === "COMPLETADO",
      mensaje: pendiente ? `Escaneo en curso: ${trabajo.avance} de ${trabajo.total} profesores revisados.` :
        trabajo.estado === "COMPLETADO" ? "Escaneo finalizado." : undefined,
    };
  } catch (error) {
    if (error instanceof TrabajoEscaneoPendiente) return { error: error.message, jobId: error.trabajoId, continuar: true };
    return { error: "No se pudo consultar o iniciar el escaneo. Inténtalo de nuevo más tarde." };
  }
}
