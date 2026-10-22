// Normalización y utilidades de texto para producción científica (RF-020, RF-021).
// Reglas puras sin dependencias externas.

/**
 * Recorta y colapsa espacios en blanco repetidos.
 */
export function limpiarTexto(s?: string | null): string {
  if (!s) return "";
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Normaliza un título para comparación y búsqueda:
 * - Sin acentos ni diacríticos (ej. "ñ" pasa a "n", "ó" pasa a "o")
 * - En minúsculas
 * - Sin puntuación ni caracteres especiales (solo letras y números)
 * - Espacios colapsados
 */
export function normalizarTitulo(titulo?: string | null): string {
  const limpio = limpiarTexto(titulo);
  if (!limpio) return "";

  return limpio
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Limpia y normaliza un DOI (Digital Object Identifier):
 * - Extrae el prefijo estándar '10.xxxx/...' si viene envuelto en URL (http, https, dx.doi.org, doi.org)
 * - En minúsculas
 * - Sin espacios ni diagonales sobrantes
 */
export function limpiarDoi(doi?: string | null): string | null {
  const limpio = limpiarTexto(doi);
  if (!limpio) return null;

  // Busca el patrón estándar de un DOI: 10.xxxx/...
  const coincidencia = limpio.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
  if (coincidencia) {
    return coincidencia[0].toLowerCase().replace(/[.,;:]$/, "");
  }

  // Si no coincide pero parece un DOI plano sin el prefijo estándar 10.
  const sinPrefijos = limpio
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim()
    .toLowerCase();

  return sinPrefijos.length > 0 ? sinPrefijos : null;
}

/**
 * Normaliza un código ISSN o ISBN:
 * - Solo dígitos y 'X' mayúscula
 * - Sin guiones ni espacios
 */
export function normalizarIssnIsbn(codigo?: string | null): string | null {
  const limpio = limpiarTexto(codigo);
  if (!limpio) return null;

  const soloAlfanumerico = limpio.toUpperCase().replace(/[^0-9X]/g, "");
  return soloAlfanumerico.length > 0 ? soloAlfanumerico : null;
}

/**
 * Extrae el conjunto de trigramas (secuencias de 3 caracteres) de una cadena.
 * Emula el comportamiento del operador % y similarity() de pg_trgm.
 */
export function extraerTrigramas(texto: string): Set<string> {
  const trigramas = new Set<string>();
  if (!texto) return trigramas;

  // En pg_trgm se añade un prefijo de dos espacios y un sufijo de un espacio
  const padding = `  ${texto} `;
  for (let i = 0; i < padding.length - 2; i++) {
    trigramas.add(padding.substring(i, i + 3));
  }
  return trigramas;
}

/**
 * Calcula la similitud de trigramas entre dos textos (entre 0.0 y 1.0).
 * Coincide con la fórmula de similitud de Dice / pg_trgm:
 *   similitud = 2 * |A ∩ B| / (|A| + |B|)
 */
export function calcularSimilitudTrigramas(a: string, b: string): number {
  const normA = normalizarTitulo(a);
  const normB = normalizarTitulo(b);

  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const triA = extraerTrigramas(normA);
  const triB = extraerTrigramas(normB);

  if (triA.size === 0 && triB.size === 0) return 1;
  if (triA.size === 0 || triB.size === 0) return 0;

  let interseccion = 0;
  for (const tri of triA) {
    if (triB.has(tri)) {
      interseccion++;
    }
  }

  return (2 * interseccion) / (triA.size + triB.size);
}
