import { Prisma } from "@/generated/prisma/client";

/**
 * Regla de continuidad del escaneo (#169, #189), escrita una sola vez.
 * La usan el motor (qué año consultar), la pantalla de puntos de continuación
 * (texto) y su SQL de búsqueda y orden, generado con estas mismas constantes.
 */
export const SOLAPAMIENTO_ANIOS = 1;
export const ANIO_MINIMO_CONTINUIDAD = 1900;
/** Fuentes que, sin corte previo, empiezan en el año en curso en lugar de traer todo el historial. */
export const FUENTES_SIN_HISTORIAL_INICIAL = ["SCOPUS"] as const;

const sinHistorialInicial = (fuente: string) => (FUENTES_SIN_HISTORIAL_INICIAL as readonly string[]).includes(fuente);

/** Año desde el que se consulta una fuente; `undefined` = historial completo. Años en UTC, igual que el motor. */
export function anioDesdeContinuidad(fuente: string, corte: Date | null | undefined, ahora = new Date()): number | undefined {
  const anio = ahora.getUTCFullYear();
  if (!corte) return sinHistorialInicial(fuente) ? anio : undefined;
  return Math.max(ANIO_MINIMO_CONTINUIDAD, Math.min(corte.getUTCFullYear() - SOLAPAMIENTO_ANIOS, anio));
}

export const TEXTO_HISTORIAL_INICIAL = "Historial inicial completo";
export const TEXTO_INICIO_FUENTE = "(inicio según la fuente)";
export const TEXTO_SOLAPAMIENTO = "(incluye solapamiento)";

export function periodoProximaConsulta(fuente: string, corte: Date | null, ahora = new Date()) {
  const anio = ahora.getUTCFullYear();
  const desde = anioDesdeContinuidad(fuente, corte, ahora);
  if (desde === undefined) return TEXTO_HISTORIAL_INICIAL;
  if (!corte) return `${desde} ${TEXTO_INICIO_FUENTE}`;
  return `${desde}–${anio} ${TEXTO_SOLAPAMIENTO}`;
}

/** Texto constante del código como literal SQL (nunca datos de la persona). */
export function literalSql(texto: string) {
  return Prisma.raw(`'${texto.replaceAll("'", "''")}'`);
}

/** `CASE expr WHEN 'clave' THEN 'etiqueta' … ELSE otro END` a partir de un mapa de etiquetas del código. */
export function etiquetaSql(expresion: Prisma.Sql, etiquetas: Record<string, string>, otro: Prisma.Sql) {
  const casos = Object.entries(etiquetas).map(([clave, texto]) => Prisma.sql`WHEN ${literalSql(clave)} THEN ${literalSql(texto)}`);
  return Prisma.sql`CASE ${expresion} ${Prisma.join(casos, " ")} ELSE ${otro} END`;
}

const ANIO_ACTUAL_SQL = Prisma.sql`EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::int`;
const FUENTES_SIN_HISTORIAL_SQL = Prisma.join(FUENTES_SIN_HISTORIAL_INICIAL.map(literalSql));

/** Equivalente SQL de `anioDesdeContinuidad` (NULL = historial completo). */
export function anioDesdeContinuidadSql(fuente: Prisma.Sql, corte: Prisma.Sql) {
  return Prisma.sql`CASE WHEN ${corte} IS NULL THEN CASE WHEN ${fuente} IN (${FUENTES_SIN_HISTORIAL_SQL}) THEN ${ANIO_ACTUAL_SQL} END
    ELSE GREATEST(${Prisma.raw(String(ANIO_MINIMO_CONTINUIDAD))}, LEAST(EXTRACT(YEAR FROM ${corte})::int - ${Prisma.raw(String(SOLAPAMIENTO_ANIOS))}, ${ANIO_ACTUAL_SQL})) END`;
}

/** Equivalente SQL de `periodoProximaConsulta`, para buscar sobre el texto que muestra la pantalla. */
export function periodoProximaConsultaSql(fuente: Prisma.Sql, corte: Prisma.Sql) {
  const desde = anioDesdeContinuidadSql(fuente, corte);
  return Prisma.sql`CASE WHEN (${desde}) IS NULL THEN ${literalSql(TEXTO_HISTORIAL_INICIAL)}
    WHEN ${corte} IS NULL THEN (${desde})::text || ' ' || ${literalSql(TEXTO_INICIO_FUENTE)}
    ELSE (${desde})::text || '–' || ${ANIO_ACTUAL_SQL}::text || ' ' || ${literalSql(TEXTO_SOLAPAMIENTO)} END`;
}
