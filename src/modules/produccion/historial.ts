import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { escaparBusqueda, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

export const ESTADOS_HISTORIAL = { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", COMPLETADO: "Completado", FALLIDO: "Con incidencias" };
export const COLUMNAS_HISTORIAL = [{ clave: "inicio", texto: "Inicio" }, { clave: "estado", texto: "Estado" }, { clave: "tipo", texto: "Tipo" }, { clave: "alcance", texto: "Alcance" }, { clave: "fuentes", texto: "Fuentes" }, { clave: "avance", texto: "Avance" }, { clave: "actualizacion", texto: "Última actualización" }];
export const LISTADO_HISTORIAL: DefinicionListado = {
  columnas: COLUMNAS_HISTORIAL.map(c => c.clave), ordenInicial: { columna: "inicio", dir: "desc" },
  filtros: { estado: Object.keys(ESTADOS_HISTORIAL), tipo: ["escaneo-manual", "escaneo-diario"] },
};
export const idRegistroHistorial = z.string({ error: "Selecciona una sola búsqueda." }).regex(/^[1-9]\d*$/, "Selecciona una búsqueda válida.").transform(Number).pipe(z.number({ error: "Selecciona una búsqueda válida." }).int().max(Number.MAX_SAFE_INTEGER, "Selecciona una búsqueda válida."));
export const FUENTES_CONTINUIDAD = ["ORCID", "OPENALEX", "SCOPUS"] as const;
export const COLUMNAS_CONTINUIDAD = [{ clave: "profesor", texto: "Profesor" }, { clave: "fuente", texto: "Fuente" }, { clave: "corte", texto: "Último corte válido" }, { clave: "periodo", texto: "Próxima consulta" }];
export const LISTADO_CONTINUIDAD: DefinicionListado = {
  columnas: COLUMNAS_CONTINUIDAD.map(c => c.clave), ordenInicial: { columna: "profesor", dir: "asc" }, filtros: { fuente: FUENTES_CONTINUIDAD },
};

export function periodoProximaConsulta(fuente: string, corte: Date | null, ahora = new Date()) {
  const anio = ahora.getUTCFullYear();
  if (!corte) return fuente === "SCOPUS" ? `${anio} (inicio según la fuente)` : "Historial inicial completo";
  return `${Math.min(corte.getUTCFullYear() - 1, anio)}–${anio} (incluye solapamiento)`;
}

export type FilaHistorial = { id: number; creadoEn: Date; actualizadoEn: Date; inicio: string; actualizacion: string; estado: keyof typeof ESTADOS_HISTORIAL; estadoTexto: string; tipoTexto: string; alcance: string; fuentes: string; avance: number; total: number };
export type FilaContinuidad = { profesorId: number; profesor: string; fuente: string; corte: Date | null };

/** Todo identificador SQL proviene de este mapa; el texto y los filtros son parámetros. */
export function sqlHistorial(consulta: ConsultaListado) {
  const base = Prisma.sql`SELECT j.id, j."creadoEn", j."actualizadoEn", j.estado, j.avance, j.total,
    to_char(j."creadoEn" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') inicio,
    to_char(j."actualizadoEn" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') actualizacion,
    CASE j.estado::text WHEN 'PENDIENTE' THEN 'Pendiente' WHEN 'EN_PROCESO' THEN 'En proceso' WHEN 'COMPLETADO' THEN 'Completado' ELSE 'Con incidencias' END AS "estadoTexto",
    CASE j.tipo WHEN 'escaneo-manual' THEN 'Manual' ELSE 'Programado (histórico)' END AS "tipoTexto",
    CASE WHEN jsonb_typeof(j.datos->'profesoresIds') = 'array' THEN
      CASE WHEN jsonb_array_length(j.datos->'profesoresIds') = 1 THEN 'Profesor #' || (j.datos->'profesoresIds'->>0)
      ELSE 'Profesores: ' || jsonb_array_length(j.datos->'profesoresIds')::text END
      || CASE WHEN (j.datos->>'anio') ~ '^\\d{4}$' THEN '; año ' || (j.datos->>'anio') ELSE '; novedades' END
    ELSE 'No registrado' END alcance,
    CASE WHEN jsonb_typeof(j.datos->'fuentes') = 'array' THEN
      (SELECT string_agg(CASE f WHEN 'SCOPUS' THEN 'Scopus' WHEN 'OPENALEX' THEN 'OpenAlex' WHEN 'CROSSREF' THEN 'Crossref' WHEN 'GOOGLE_SCHOLAR' THEN 'Google Scholar' WHEN 'ORCID' THEN 'ORCID' ELSE 'Fuente no reconocida' END, ', ' ORDER BY f) FROM jsonb_array_elements_text(j.datos->'fuentes') valores(f))
      ELSE 'No registradas' END fuentes, j.tipo
    FROM "Job" j WHERE j.tipo IN ('escaneo-manual','escaneo-diario')`;
  const condiciones: Prisma.Sql[] = [];
  if (consulta.q) condiciones.push(Prisma.sql`concat_ws(' ', inicio, actualizacion, "estadoTexto", "tipoTexto", alcance, fuentes, avance::text || ' de ' || total::text) ILIKE ${`%${escaparBusqueda(consulta.q)}%`}`);
  if (consulta.filtros.estado) condiciones.push(Prisma.sql`estado::text = ${consulta.filtros.estado}`);
  if (consulta.filtros.tipo) condiciones.push(Prisma.sql`tipo = ${consulta.filtros.tipo}`);
  const filtro = condiciones.length ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
  const mapa: Record<string, Prisma.Sql> = { inicio: Prisma.sql`"creadoEn"`, actualizacion: Prisma.sql`"actualizadoEn"`, estado: Prisma.sql`"estadoTexto"`, tipo: Prisma.sql`"tipoTexto"`, alcance: Prisma.sql`alcance`, fuentes: Prisma.sql`fuentes`, avance: Prisma.sql`avance` };
  const columna = mapa[consulta.orden] ?? mapa.inicio;
  const dir = consulta.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return { contar: Prisma.sql`SELECT count(*)::int total FROM (${base}) h ${filtro}`, pagina: (salto: number, tamanio: number) => Prisma.sql`SELECT * FROM (${base}) h ${filtro} ORDER BY ${columna} ${dir}, id ${dir} LIMIT ${tamanio} OFFSET ${salto}` };
}

export function sqlContinuidad(consulta: ConsultaListado) {
  const fuentes = Prisma.join(FUENTES_CONTINUIDAD.map(f => Prisma.sql`(${f}::text)`));
  const base = Prisma.sql`SELECT p.id "profesorId", p.apellidos || ', ' || p.nombres || ' · ' || p.codigo profesor, f.fuente,
    c."ultimaFecha" corte, CASE f.fuente WHEN 'OPENALEX' THEN 'OpenAlex' WHEN 'SCOPUS' THEN 'Scopus' ELSE f.fuente END "fuenteTexto",
    COALESCE(to_char(c."ultimaFecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'), 'Sin búsqueda previa completada') "corteTexto",
    CASE WHEN c."ultimaFecha" IS NULL AND f.fuente <> 'SCOPUS' THEN 'Historial inicial completo' ELSE
      CASE WHEN c."ultimaFecha" IS NULL THEN EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::text || ' (inicio según la fuente)'
      ELSE (LEAST(EXTRACT(YEAR FROM c."ultimaFecha") - 1, EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')))::int::text || '–' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::int::text || ' (incluye solapamiento)' END END periodo
    FROM "Profesor" p CROSS JOIN (VALUES ${fuentes}) f(fuente)
    LEFT JOIN "CorteEscaneo" c ON c."profesorId" = p.id AND c.fuente::text = f.fuente WHERE p."estatusLaboral" = 'ACTIVO'`;
  const condiciones: Prisma.Sql[] = [];
  if (consulta.q) condiciones.push(Prisma.sql`concat_ws(' ', profesor, "fuenteTexto", "corteTexto", periodo) ILIKE ${`%${escaparBusqueda(consulta.q)}%`}`);
  if (consulta.filtros.fuente) condiciones.push(Prisma.sql`fuente = ${consulta.filtros.fuente}`);
  const filtro = condiciones.length ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
  const mapa: Record<string, Prisma.Sql> = { profesor: Prisma.sql`profesor`, fuente: Prisma.sql`"fuenteTexto"`, corte: Prisma.sql`corte`, periodo: Prisma.sql`CASE WHEN corte IS NULL AND fuente <> 'SCOPUS' THEN 0 ELSE COALESCE(EXTRACT(YEAR FROM corte) - 1, EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC')) END` };
  const dir = consulta.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return { contar: Prisma.sql`SELECT count(*)::int total FROM (${base}) c ${filtro}`, pagina: (salto: number, tamanio: number) => Prisma.sql`SELECT * FROM (${base}) c ${filtro} ORDER BY ${mapa[consulta.orden] ?? mapa.profesor} ${dir} NULLS FIRST, "profesorId" ${dir}, fuente ${dir} LIMIT ${tamanio} OFFSET ${salto}` };
}
