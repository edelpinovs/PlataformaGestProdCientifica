import { FUENTES_ESCANEO, NOMBRES_FUENTE, type FuenteEscaneo } from "@/modules/produccion/fuentes";

// Control del escaneo (issue 243), solo lectura: resume lo que el motor de Producción ya guarda.
// Lanzar, reintentar o continuar un escaneo sigue siendo del módulo de Producción; aquí no se
// duplica su lógica, solo se leen sus trabajos y sus cortes.

/** Días hacia atrás que cuentan como «recientes» en el resumen. */
export const VENTANA_DIAS = 30;
const MS_DIA = 24 * 60 * 60 * 1000;

export type EstadoTrabajo = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "FALLIDO" | "CANCELADO";

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
  /** Pendientes o en proceso ahora, de cualquier antigüedad. */
  enCurso: number;
  /** De los que están en proceso, los que no se actualizan desde hace `TIEMPO_SIN_AVANCE_MS`. */
  sinAvance: number;
  completados: number;
  /** Terminaron con incidencias dentro de la ventana. */
  conIncidencias: number;
};

/**
 * Tiempo sin actualizarse tras el que un escaneo «en proceso» se considera sin avance. Es el mismo
 * valor con que Producción deja de reservar un escaneo (`TIEMPO_RESERVA_MS` en
 * src/app/produccion/trabajos.ts, 10 minutos); mientras no se unifique, hay que cambiar los dos.
 */
export const TIEMPO_SIN_AVANCE_MS = 10 * 60 * 1000;

/** Fecha límite: un trabajo en proceso actualizado antes de esta fecha está sin avance. */
export function sinAvanceDesde(ahora: Date): Date {
  return new Date(ahora.getTime() - TIEMPO_SIN_AVANCE_MS);
}

/** Un escaneo está «sin avance» si sigue en proceso y no se actualiza desde hace `TIEMPO_SIN_AVANCE_MS`. */
export function estaSinAvance(trabajo: Pick<TrabajoResumen, "estado" | "actualizadoEn">, ahora: Date): boolean {
  return trabajo.estado === "EN_PROCESO" && trabajo.actualizadoEn.getTime() < sinAvanceDesde(ahora).getTime();
}

/** Desde cuándo cuenta la ventana de «recientes». */
export function ventanaDesde(ahora: Date): Date {
  return new Date(ahora.getTime() - VENTANA_DIAS * MS_DIA);
}

/** Forma que devuelve `prisma.job.groupBy({ by: ["estado"], _count: { _all: true } })`. */
export type ConteoPorEstado = { estado: EstadoTrabajo; _count: { _all: number } };

/**
 * Arma el resumen con cifras que ya calculó la base, sin cargar los trabajos: `enCurso` son los
 * pendientes o en proceso de cualquier antigüedad, `sinAvance` los en proceso que dejaron de actualizarse, `ventana` agrupa por estado los trabajos creados
 * dentro de `VENTANA_DIAS` y `ultimo` es el más reciente de todos.
 */
export function resumirTrabajos(datos: {
  ultimo: TrabajoResumen | null;
  enCurso: number;
  sinAvance: number;
  ventana: ConteoPorEstado[];
}): ResumenTrabajos {
  const enVentana = (estado: EstadoTrabajo) =>
    datos.ventana.filter((g) => g.estado === estado).reduce((suma, g) => suma + g._count._all, 0);
  return {
    ultimo: datos.ultimo,
    enCurso: datos.enCurso,
    sinAvance: datos.sinAvance,
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
