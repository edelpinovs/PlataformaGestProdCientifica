import { FUENTES_ESCANEO, NOMBRES_FUENTE, type FuenteEscaneo } from "@/modules/produccion/fuentes";

// Control del escaneo (issue 243), solo lectura: resume lo que el motor de Producción ya guarda.
// Lanzar, reintentar o continuar un escaneo sigue siendo del módulo de Producción; aquí no se
// duplica su lógica, solo se leen sus trabajos y sus cortes.

/** Días hacia atrás que cuentan como «recientes» en el resumen. */
export const VENTANA_DIAS = 30;
const MS_DIA = 24 * 60 * 60 * 1000;

export type EstadoTrabajo = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "FALLIDO";

export type TrabajoResumen = {
  id: number;
  estado: EstadoTrabajo;
  avance: number;
  total: number;
  creadoEn: Date;
  actualizadoEn: Date;
};

export type ResumenTrabajos = {
  ultimo: TrabajoResumen | null;
  /** Pendientes o en proceso ahora. */
  enCurso: number;
  completados: number;
  /** Terminaron con incidencias dentro de la ventana. */
  conIncidencias: number;
};

/** Desde cuándo cuenta la ventana de «recientes». */
export function ventanaDesde(ahora: Date): Date {
  return new Date(ahora.getTime() - VENTANA_DIAS * MS_DIA);
}

/** Forma que devuelve `prisma.job.groupBy({ by: ["estado"], _count: { _all: true } })`. */
export type ConteoPorEstado = { estado: EstadoTrabajo; _count: { _all: number } };

/**
 * Arma el resumen con cifras que ya calculó la base, sin cargar los trabajos: `enCurso` son los
 * pendientes o en proceso de cualquier antigüedad, `ventana` agrupa por estado los trabajos creados
 * dentro de `VENTANA_DIAS` y `ultimo` es el más reciente de todos.
 */
export function resumirTrabajos(datos: {
  ultimo: TrabajoResumen | null;
  enCurso: number;
  ventana: ConteoPorEstado[];
}): ResumenTrabajos {
  const enVentana = (estado: EstadoTrabajo) =>
    datos.ventana.filter((g) => g.estado === estado).reduce((suma, g) => suma + g._count._all, 0);
  return {
    ultimo: datos.ultimo,
    enCurso: datos.enCurso,
    completados: enVentana("COMPLETADO"),
    conIncidencias: enVentana("FALLIDO"),
  };
}

export type CorteFuente = { fuente: string; profesores: number; ultimaFecha: Date | null };

export type FilaFuente = {
  fuente: FuenteEscaneo;
  nombre: string;
  profesoresConCorte: number;
  /** Profesores activos que todavía no se han buscado en esta fuente. */
  sinCorte: number;
  ultimaFecha: Date | null;
};

/**
 * Una fila por fuente de escaneo, aunque no tenga cortes todavía. `cortes` debe contar solo
 * profesores activos; `profesoresActivos` es el total contra el que se compara.
 */
export function resumirFuentes(cortes: CorteFuente[], profesoresActivos: number): FilaFuente[] {
  return FUENTES_ESCANEO.map((fuente) => {
    const corte = cortes.find((c) => c.fuente === fuente);
    const conCorte = corte?.profesores ?? 0;
    return {
      fuente,
      nombre: NOMBRES_FUENTE[fuente],
      profesoresConCorte: conCorte,
      sinCorte: Math.max(0, profesoresActivos - conCorte),
      ultimaFecha: corte?.ultimaFecha ?? null,
    };
  });
}

/** Texto de avance de un trabajo: «12 de 40 profesores revisados». */
export function textoAvance(avance: number, total: number): string {
  if (total <= 0) return "Sin profesores en el lote";
  return `${avance} de ${total} ${total === 1 ? "profesor revisado" : "profesores revisados"}`;
}
