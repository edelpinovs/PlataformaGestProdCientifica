import { calcularSemaforo, MESES_AVISO, type Semaforo } from "@/modules/reportes/semaforo";
import { cuentaParaSemaforo, ETIQUETA_SEMAFORO } from "@/modules/reportes/vigencias";

// Issue 248: estatus de vigencia de cada reconocimiento SNII o PRODEP en su listado, con la misma
// regla del reporte de vigencias (RF-026, D-226): vigente, por vencer (vence en MESES_AVISO meses o
// menos) o vencido. Un no aprobado no otorga vigencia (D-104). «Estatus» es el término del cliente;
// el cambio de nombre en todo el sistema sigue pendiente (D-250, #258).

export const ESTATUS = ["VERDE", "AMARILLO", "ROJO"] as const satisfies readonly Semaforo[];
export type Estatus = (typeof ESTATUS)[number];

export const ETIQUETAS_ESTATUS: Record<Estatus, string> = ETIQUETA_SEMAFORO;
export const SIN_VIGENCIA = "Sin vigencia";

/** Tono de la etiqueta de cada estatus (colores con nombre de la pauta). */
export const TONO_ESTATUS: Record<Estatus, "exito" | "aviso" | "error"> = { VERDE: "exito", AMARILLO: "aviso", ROJO: "error" };

const RESULTADOS = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;
/** Resultados que tienen vigencia, según la regla del reporte. */
const CON_VIGENCIA = RESULTADOS.filter(cuentaParaSemaforo);

/** Estatus del reconocimiento, o null si su resultado no otorga vigencia. */
export function estatusReconocimiento(resultado: string, fin: Date, hoy: Date): Estatus | null {
  return cuentaParaSemaforo(resultado) ? calcularSemaforo(fin, hoy) : null;
}

/**
 * El mismo estatus como condición de la consulta, para filtrar y paginar en la base. Los límites son
 * los de calcularSemaforo (su prueba lo compara fecha por fecha): vencido antes de hoy; por vencer
 * desde hoy hasta MESES_AVISO meses después; vigente después de esa fecha.
 */
export function condicionEstatus(estatus: Estatus, hoy: Date) {
  const limite = new Date(hoy);
  limite.setMonth(limite.getMonth() + MESES_AVISO);
  const fin = estatus === "ROJO" ? { lt: hoy } : estatus === "AMARILLO" ? { gte: hoy, lte: limite } : { gt: limite };
  return { fin, resultado: { in: [...CON_VIGENCIA] } };
}
