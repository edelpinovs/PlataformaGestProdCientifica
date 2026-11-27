import { FUENTES_ESCANEO, NOMBRES_FUENTE, type FuenteEscaneo } from "./fuentes";
import { fechaCorta } from "./rango-escaneo";

/** Une una lista en español: «A», «A y B», «A, B y C». */
function unirLista(elementos: string[]): string {
  if (elementos.length <= 1) return elementos[0] ?? "";
  return `${elementos.slice(0, -1).join(", ")} y ${elementos[elementos.length - 1]}`;
}

/**
 * Frase que resume, antes de enviar, qué hará la búsqueda con lo elegido en el formulario.
 * Solo orienta: el servidor vuelve a validar fuentes, profesor y rango.
 */
export function resumenBusqueda({ fuentes, profesor, departamento = "", desde, hasta }: {
  fuentes: FuenteEscaneo[];
  /** «todos», el nombre del profesor elegido o vacío si aún no se elige. */
  profesor: string;
  /** Con «todos»: el nombre del departamento, «sin departamento» o vacío para todos. */
  departamento?: string;
  desde: string;
  hasta: string;
}): string {
  const elegidas = FUENTES_ESCANEO.filter((fuente) => fuentes.includes(fuente)).map((fuente) => NOMBRES_FUENTE[fuente]);
  const enFuentes = elegidas.length ? `en ${unirLista(elegidas)}` : "sin fuentes elegidas";
  const quien = profesor !== "todos" ? profesor || "un profesor por elegir"
    : departamento === "sin departamento" ? "los profesores activos sin departamento"
      : departamento ? `los profesores activos de ${departamento}` : "todos los profesores activos";
  const cuando = desde && hasta ? `del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`
    : desde ? `del ${fechaCorta(desde)} a hoy`
      : hasta ? "falta la fecha Desde"
        : "sin periodo fijo, desde la última búsqueda de cada fuente";
  return `Se buscará ${enFuentes}, para ${quien}, ${cuando}.`;
}
