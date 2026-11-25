export const ZONA_FECHAS_ESCANEO = "America/Mexico_City";

/** Año en curso en Ciudad de México (no en UTC): el 31 de diciembre a las 18:00 sigue siendo el mismo año. */
export function anioActualMexico(ahora: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: ZONA_FECHAS_ESCANEO }).format(ahora));
}

/** Fecha de hoy (AAAA-MM-DD) en Ciudad de México. */
export function hoyMexico(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONA_FECHAS_ESCANEO }).format(ahora);
}

/** «31/12/2025 22:00» en Ciudad de México: el mismo formato dd/mm/aaaa de los periodos. */
export function fechaEscaneo(fecha: Date | string | null | undefined) {
  if (!fecha) return "Sin fecha registrada";
  const valor = new Date(fecha);
  if (!Number.isFinite(valor.getTime())) return "Sin fecha registrada";
  const partes = Object.fromEntries(new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ZONA_FECHAS_ESCANEO,
  }).formatToParts(valor).map((parte) => [parte.type, parte.value]));
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

export class TrabajoEscaneoPendiente extends Error {
  constructor(public readonly trabajoId: number) {
    super("Ya hay una búsqueda pendiente. Continúala antes de iniciar otra.");
  }
}
