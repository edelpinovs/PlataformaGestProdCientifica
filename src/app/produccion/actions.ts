"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRol } from "@/lib/auth/session";
import { ROLES_ESCANEO } from "@/modules/produccion/permisos";
import { debeEnriquecerAutores, FUENTES_ANTERIORES, type FuenteEscaneo } from "@/modules/produccion/fuentes";
import { TrabajoEscaneoPendiente } from "@/modules/produccion/fechas-escaneo";
import { prisma } from "@/lib/prisma";
import { datosLoteEsquema, seleccionReintento, solicitudEscaneoEsquema } from "@/modules/produccion/lotes";
import { idRegistroHistorial } from "@/modules/produccion/historial";
import type { ResumenEscaneo } from "@/modules/produccion/escaneo";
import { cancelarTrabajoEscaneo, crearTrabajoEscaneo, MENSAJE_REINTENTO_SIN_ACTIVOS, procesarSiguienteProfesor, TIPOS_ESCANEO } from "./trabajos";
import { presentarResultadoEscaneo } from "@/modules/produccion/resultado-escaneo";
import { rangoEfectivo, type RangoEscaneo } from "@/modules/produccion/rango-escaneo";

export type EstadoEscaneo = {
  resultado?: ReturnType<typeof presentarResultadoEscaneo>;
  error?: string; exito?: boolean; mensaje?: string; resumen?: ResumenEscaneo;
  jobId?: number; pendiente?: boolean; avance?: number; total?: number;
  fuenteEnCurso?: FuenteEscaneo | null;
  continuar?: boolean; fuentes?: FuenteEscaneo[]; enriquecerAutores?: boolean; rango?: RangoEscaneo;
  intento?: number;
  erroresCampos?: { profesorId?: string; desde?: string; hasta?: string; fuentes?: string; enriquecerAutores?: string };
};

function actualizarPantallasProduccion() {
  for (const ruta of ["/produccion", "/produccion/escaneo", "/produccion/publicaciones", "/produccion/historial"]) revalidatePath(ruta);
}

export async function iniciarEscaneoAction(_: EstadoEscaneo, formData: FormData): Promise<EstadoEscaneo> {
  await requireRol([...ROLES_ESCANEO]);
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
        profesorId: formData.get("profesorId") ?? "todos", desde: formData.get("desde") ?? "", hasta: formData.get("hasta") ?? "",
        fuentes: formData.getAll("fuentes"), enriquecerAutores: formData.get("enriquecerAutores"),
      });
      if (!parseo.success) return {
        error: parseo.error.issues[0]?.message ?? "Revisa los datos del escaneo.",
        erroresCampos: {
          profesorId: parseo.error.issues.find((error) => error.path[0] === "profesorId")?.message,
          desde: parseo.error.issues.find((error) => error.path[0] === "desde")?.message,
          hasta: parseo.error.issues.find((error) => error.path[0] === "hasta")?.message,
          fuentes: parseo.error.issues.find((error) => error.path[0] === "fuentes")?.message,
          enriquecerAutores: parseo.error.issues.find((error) => error.path[0] === "enriquecerAutores")?.message,
        },
      };
      trabajo = await crearTrabajoEscaneo("escaneo-manual",
        parseo.data.profesorId === "todos" ? undefined : Number(parseo.data.profesorId),
        parseo.data.rango, parseo.data.fuentes, parseo.data.enriquecerAutores);
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
      fuenteEnCurso: trabajo.estado === "EN_PROCESO" && datos.success ? datos.data.fuenteEnCurso : null,
      fuentes: datos.success ? datos.data.fuentes ?? [...FUENTES_ANTERIORES] : [...FUENTES_ANTERIORES],
      enriquecerAutores: datos.success ? debeEnriquecerAutores(datos.data) : undefined,
      rango: datos.success ? rangoEfectivo(datos.data) : undefined,
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

/** Resultado de cancelar o reintentar una búsqueda (#279). */
export type EstadoControlEscaneo = { error?: string; mensaje?: string };

/** Detiene una búsqueda pendiente o en proceso; lo guardado hasta ese momento se conserva. */
export async function cancelarEscaneoAction(_: EstadoControlEscaneo, formData: FormData): Promise<EstadoControlEscaneo> {
  await requireRol([...ROLES_ESCANEO]);
  const id = idRegistroHistorial.safeParse(formData.get("jobId") ?? "");
  if (!id.success) return { error: id.error.issues[0]?.message ?? "Selecciona una búsqueda válida." };
  try {
    const cancelada = await cancelarTrabajoEscaneo(id.data);
    actualizarPantallasProduccion();
    return cancelada
      ? { mensaje: "Búsqueda cancelada. Se conserva lo guardado hasta ese momento." }
      : { error: "La búsqueda ya había terminado; no hay nada que cancelar." };
  } catch {
    return { error: "No se pudo cancelar la búsqueda. Inténtalo de nuevo." };
  }
}

/**
 * Crea una búsqueda nueva solo con lo que falló o quedó sin revisar (`seleccionReintento`),
 * con el mismo periodo y la misma opción de completar coautores. Al crearla lleva a Escanear.
 */
export async function reintentarEscaneoAction(_: EstadoControlEscaneo, formData: FormData): Promise<EstadoControlEscaneo> {
  await requireRol([...ROLES_ESCANEO]);
  const id = idRegistroHistorial.safeParse(formData.get("jobId") ?? "");
  if (!id.success) return { error: id.error.issues[0]?.message ?? "Selecciona una búsqueda válida." };
  try {
    const original = await prisma.job.findFirst({ where: { id: id.data, tipo: { in: TIPOS_ESCANEO } } });
    if (!original) return { error: "No se encontró la búsqueda." };
    if (original.estado !== "FALLIDO" && original.estado !== "CANCELADO") return { error: "Solo se reintentan búsquedas con incidencias o canceladas." };
    const datos = datosLoteEsquema.safeParse(original.datos);
    if (!datos.success) return { error: "Esta búsqueda no guardó los datos necesarios para reintentarla. Inicia una nueva desde Escanear." };
    const seleccion = seleccionReintento(datos.data);
    if (!seleccion.ok) return { error: seleccion.error };
    const nuevo = await crearTrabajoEscaneo("escaneo-manual", seleccion.profesoresIds, rangoEfectivo(datos.data), seleccion.fuentes, debeEnriquecerAutores(datos.data));
    if (nuevo.estado === "PENDIENTE") after(async () => { await procesarSiguienteProfesor(nuevo.id); actualizarPantallasProduccion(); });
    actualizarPantallasProduccion();
  } catch (error) {
    if (error instanceof TrabajoEscaneoPendiente) return { error: "Ya hay una búsqueda en curso. Continúala o cancélala antes de reintentar." };
    if (error instanceof Error && error.message === MENSAJE_REINTENTO_SIN_ACTIVOS) return { error: MENSAJE_REINTENTO_SIN_ACTIVOS };
    return { error: "No se pudo crear el reintento. Inténtalo de nuevo más tarde." };
  }
  redirect("/produccion/escaneo");
}
