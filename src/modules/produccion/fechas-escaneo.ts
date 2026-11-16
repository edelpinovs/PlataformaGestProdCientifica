export const ZONA_FECHAS_ESCANEO = "America/Mexico_City";

export function fechaEscaneo(fecha: Date | string | null | undefined) {
  if (!fecha) return "Sin fecha registrada";
  const valor = new Date(fecha);
  if (!Number.isFinite(valor.getTime())) return "Sin fecha registrada";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: ZONA_FECHAS_ESCANEO,
  }).format(valor);
}

export class TrabajoEscaneoPendiente extends Error {
  constructor(public readonly trabajoId: number) {
    super("Ya hay una búsqueda pendiente. Continúala antes de iniciar otra.");
  }
}
