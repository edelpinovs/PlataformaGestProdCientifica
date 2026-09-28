export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

// Meses antes del vencimiento en que una distinción pasa a amarillo (CU-014).
// Propuesta pendiente de confirmar con la Coordinación (plan, §8 punto 5).
export const MESES_AVISO = 12;

// RF-026: estado de una distinción SNII, PRODEP o CA según su fecha de FIN.
export function calcularSemaforo(fin: Date, hoy: Date = new Date()): Semaforo {
  if (fin < hoy) return "ROJO";

  const limiteAviso = new Date(hoy);
  limiteAviso.setMonth(limiteAviso.getMonth() + MESES_AVISO);
  return fin <= limiteAviso ? "AMARILLO" : "VERDE";
}
