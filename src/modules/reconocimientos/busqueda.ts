import { escaparBusqueda, type CondicionTexto } from "@/lib/listados/consulta";

/**
 * Búsqueda por nombre completo en los listados de Reconocimientos (revisión del PR 433): con dos o
 * más palabras, cada una debe aparecer en alguno de los campos («Ana Prueba» encuentra a quien se
 * llama Ana y se apellida Prueba). Devuelve null con una sola palabra: entonces basta la búsqueda
 * normal. Escapa `%`, `_` y `\` igual que condicionTexto.
 */
export function porPalabras<T>(q: string, campos: (contiene: CondicionTexto) => T[]): { AND: { OR: T[] }[] } | null {
  const palabras = q.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 2) return null;
  return { AND: palabras.map((palabra) => ({ OR: campos({ contains: escaparBusqueda(palabra), mode: "insensitive" }) })) };
}
