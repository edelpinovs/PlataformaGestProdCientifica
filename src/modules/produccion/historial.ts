import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { escaparBusqueda, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { FUENTES_ESCANEO, NOMBRES_FUENTE } from "./fuentes";
import { anioDesdeContinuidadSql, etiquetaSql, literalSql, periodoProximaConsultaSql } from "./continuidad";

export { periodoProximaConsulta } from "./continuidad";

export const TIPOS_HISTORIAL = { "escaneo-manual": "Manual", "escaneo-diario": "Programado (histórico)" };
export const ESTADOS_HISTORIAL = { PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", COMPLETADO: "Completado", FALLIDO: "Con incidencias" };
export const COLUMNAS_HISTORIAL = [{ clave: "inicio", texto: "Inicio" }, { clave: "estado", texto: "Estado" }, { clave: "tipo", texto: "Tipo" }, { clave: "alcance", texto: "Alcance" }, { clave: "fuentes", texto: "Fuentes" }, { clave: "avance", texto: "Avance" }, { clave: "actualizacion", texto: "Última actualización" }];
export const LISTADO_HISTORIAL: DefinicionListado = {
  columnas: COLUMNAS_HISTORIAL.map(c => c.clave), ordenInicial: { columna: "inicio", dir: "desc" },
  filtros: { estado: Object.keys(ESTADOS_HISTORIAL), tipo: Object.keys(TIPOS_HISTORIAL) },
};
export const idRegistroHistorial = z.string({ error: "Selecciona una sola búsqueda." }).regex(/^[1-9]\d*$/, "Selecciona una búsqueda válida.").transform(Number).pipe(z.number({ error: "Selecciona una búsqueda válida." }).int().max(2147483647, "Selecciona una búsqueda válida."));
export const FUENTES_CONTINUIDAD = FUENTES_ESCANEO;
export const COLUMNAS_CONTINUIDAD = [{ clave: "profesor", texto: "Profesor" }, { clave: "fuente", texto: "Fuente" }, { clave: "corte", texto: "Último corte válido" }, { clave: "periodo", texto: "Próxima consulta" }];
export const LISTADO_CONTINUIDAD: DefinicionListado = {
  columnas: COLUMNAS_CONTINUIDAD.map(c => c.clave), ordenInicial: { columna: "profesor", dir: "asc" }, filtros: { fuente: FUENTES_CONTINUIDAD },
};

/** Nombre del profesor como lo muestran Producción y sus listados: «Apellidos, Nombres · Código». */
export function nombreProfesor(profesor: { apellidos: string; nombres: string; codigo: string }) {
  return `${profesor.apellidos}, ${profesor.nombres} · ${profesor.codigo}`;
}

/** Equivalente SQL de `nombreProfesor`. */
export function nombreProfesorSql(alias: string) {
  const p = Prisma.raw(alias);
  return Prisma.sql`${p}.apellidos || ', ' || ${p}.nombres || ' · ' || ${p}.codigo`;
}

export type FilaHistorial = { id: number; creadoEn: Date; actualizadoEn: Date; inicio: string; actualizacion: string; estado: keyof typeof ESTADOS_HISTORIAL; estadoTexto: string; tipoTexto: string; alcance: string; fuentes: string; avance: number; total: number };
export type FilaContinuidad = { profesorId: number; profesor: string; fuente: string; corte: Date | null };

/** Todo identificador SQL proviene de este mapa; el texto y los filtros son parámetros. */
export function sqlHistorial(consulta: ConsultaListado) {
  const base = Prisma.sql`SELECT j.id, j."creadoEn", j."actualizadoEn", j.estado, j.avance, j.total,
    to_char(j."creadoEn" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') inicio,
    to_char(j."actualizadoEn" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI') actualizacion,
    ${etiquetaSql(Prisma.sql`j.estado::text`, ESTADOS_HISTORIAL, literalSql("Estado no reconocido"))} AS "estadoTexto",
    ${etiquetaSql(Prisma.sql`j.tipo`, TIPOS_HISTORIAL, literalSql("Tipo no reconocido"))} AS "tipoTexto",
    CASE WHEN jsonb_typeof(j.datos->'profesoresIds') = 'array' THEN
      CASE WHEN jsonb_array_length(j.datos->'profesoresIds') = 1 THEN COALESCE(
        (SELECT ${nombreProfesorSql("p")} FROM "Profesor" p
          WHERE p.id = CASE WHEN (j.datos->'profesoresIds'->>0) ~ '^\\d{1,9}$' THEN (j.datos->'profesoresIds'->>0)::int END),
        'Profesor #' || (j.datos->'profesoresIds'->>0))
      ELSE 'Profesores: ' || jsonb_array_length(j.datos->'profesoresIds')::text END
      || CASE WHEN (j.datos->>'desde') ~ '^\\d{4}-\\d{2}-\\d{2}$' AND (j.datos->>'hasta') ~ '^\\d{4}-\\d{2}-\\d{2}$'
           THEN '; del ' || to_char((j.datos->>'desde')::date, 'DD/MM/YYYY') || ' al ' || to_char((j.datos->>'hasta')::date, 'DD/MM/YYYY')
         WHEN (j.datos->>'anio') ~ '^\\d{4}$' THEN '; año ' || (j.datos->>'anio') ELSE '; novedades' END
    ELSE 'No registrado' END alcance,
    CASE WHEN jsonb_typeof(j.datos->'fuentes') = 'array' THEN
      (SELECT string_agg(${etiquetaSql(Prisma.sql`f`, NOMBRES_FUENTE, literalSql("Fuente no reconocida"))}, ', ' ORDER BY f) FROM jsonb_array_elements_text(j.datos->'fuentes') valores(f))
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
  const base = Prisma.sql`SELECT p.id "profesorId", ${nombreProfesorSql("p")} profesor, f.fuente,
    c."ultimaFecha" corte, ${etiquetaSql(Prisma.sql`f.fuente`, NOMBRES_FUENTE, Prisma.sql`f.fuente`)} "fuenteTexto",
    COALESCE(to_char(c."ultimaFecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI'), 'Sin búsqueda previa completada') "corteTexto",
    ${periodoProximaConsultaSql(Prisma.sql`f.fuente`, Prisma.sql`c."ultimaFecha"`)} periodo
    FROM "Profesor" p CROSS JOIN (VALUES ${fuentes}) f(fuente)
    LEFT JOIN "CorteEscaneo" c ON c."profesorId" = p.id AND c.fuente::text = f.fuente WHERE p."estatusLaboral" = 'ACTIVO'`;
  const condiciones: Prisma.Sql[] = [];
  if (consulta.q) condiciones.push(Prisma.sql`concat_ws(' ', profesor, "fuenteTexto", "corteTexto", periodo) ILIKE ${`%${escaparBusqueda(consulta.q)}%`}`);
  if (consulta.filtros.fuente) condiciones.push(Prisma.sql`fuente = ${consulta.filtros.fuente}`);
  const filtro = condiciones.length ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
  const mapa: Record<string, Prisma.Sql> = { profesor: Prisma.sql`profesor`, fuente: Prisma.sql`"fuenteTexto"`, corte: Prisma.sql`corte`, periodo: Prisma.sql`COALESCE(${anioDesdeContinuidadSql(Prisma.sql`fuente`, Prisma.sql`corte`)}, 0)` };
  const dir = consulta.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return { contar: Prisma.sql`SELECT count(*)::int total FROM (${base}) c ${filtro}`, pagina: (salto: number, tamanio: number) => Prisma.sql`SELECT * FROM (${base}) c ${filtro} ORDER BY ${mapa[consulta.orden] ?? mapa.profesor} ${dir} NULLS FIRST, "profesorId" ${dir}, fuente ${dir} LIMIT ${tamanio} OFFSET ${salto}` };
}
