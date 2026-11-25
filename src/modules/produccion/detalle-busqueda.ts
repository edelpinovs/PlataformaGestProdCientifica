import type { DatosLote } from "./lotes";
import { NOMBRES_FUENTE, type FuenteEscaneo } from "./fuentes";

/** Cuántas filas muestra el detalle de una búsqueda antes de resumir «y N más». */
export const LIMITE_DETALLE = 20;

export type FilaProfesorBusqueda = { profesorId: number; obras: number; fuentesConFallo: string[]; revisado: boolean };

/**
 * Lo que encontró una búsqueda, a partir de lo que guarda en `Job.datos` (issue 342):
 * total de obras recibidas, resultado por profesor y publicaciones guardadas.
 */
export function analizarBusqueda(datos: DatosLote) {
  const consultas = datos.resumen.consultasFuentes ?? [];
  const porProfesor = new Map<number, FilaProfesorBusqueda>();
  const revisados = new Set(datos.profesoresIds.slice(0, datos.indice));
  for (const id of datos.profesoresIds) porProfesor.set(id, { profesorId: id, obras: 0, fuentesConFallo: [], revisado: revisados.has(id) });
  for (const consulta of consultas) {
    const fila = porProfesor.get(consulta.profesorId);
    if (!fila) continue;
    fila.obras += consulta.cantidad;
    if (consulta.estado === "INCIDENCIA" && !fila.fuentesConFallo.includes(NOMBRES_FUENTE[consulta.fuente])) fila.fuentesConFallo.push(NOMBRES_FUENTE[consulta.fuente]);
  }
  // Primero quien tuvo fallos, después quien recibió más obras; los no revisados al final.
  const profesores = [...porProfesor.values()].sort((a, b) =>
    Number(b.revisado) - Number(a.revisado) || b.fuentesConFallo.length - a.fuentesConFallo.length || b.obras - a.obras || a.profesorId - b.profesorId);
  const procedencia = datos.resumen.procedencia ?? [];
  return {
    obrasRecibidas: consultas.reduce((suma, consulta) => suma + consulta.cantidad, 0),
    profesores,
    publicaciones: procedencia.map(({ publicacionId, fuentes }) => ({ publicacionId, fuentes: fuentes.map((fuente) => NOMBRES_FUENTE[fuente as FuenteEscaneo] ?? fuente) })),
  };
}

/** «Menos de un minuto», «12 min», «1 h 5 min»; vacío si falta un extremo o no es válido. */
export function textoDuracion(inicio: Date, fin: Date | string | null | undefined): string {
  if (!fin) return "";
  const milisegundos = new Date(fin).getTime() - inicio.getTime();
  if (!Number.isFinite(milisegundos) || milisegundos < 0) return "";
  const minutos = Math.round(milisegundos / 60000);
  if (minutos < 1) return "Menos de un minuto";
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ""}`;
}
