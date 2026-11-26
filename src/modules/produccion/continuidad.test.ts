import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  anioDesdeContinuidad, anioDesdeContinuidadSql, etiquetaSql, literalSql, periodoProximaConsulta, periodoProximaConsultaSql,
  ANIO_MINIMO_CONTINUIDAD, SOLAPAMIENTO_ANIOS, TEXTO_HISTORIAL_INICIAL, TEXTO_INICIO_FUENTE, TEXTO_SOLAPAMIENTO,
} from "./continuidad";
import { NOMBRES_FUENTE } from "./fuentes";

const hoy = new Date("2026-11-09T12:00:00Z");

describe("regla de continuidad escrita una sola vez (#189)", () => {
  it("sin corte: historial completo, salvo Scopus que empieza en el año en curso", () => {
    expect(anioDesdeContinuidad("ORCID", null, hoy)).toBeUndefined();
    expect(anioDesdeContinuidad("OPENALEX", undefined, hoy)).toBeUndefined();
    expect(anioDesdeContinuidad("SCOPUS", null, hoy)).toBe(2026);
  });
  it("con corte: vuelve un año atrás por indexaciones tardías, sin pasar del año en curso ni bajar de 1900", () => {
    expect(SOLAPAMIENTO_ANIOS).toBe(1);
    expect(anioDesdeContinuidad("ORCID", new Date("2025-06-01T00:00:00Z"), hoy)).toBe(2024);
    expect(anioDesdeContinuidad("SCOPUS", new Date("2026-11-01T00:00:00Z"), hoy)).toBe(2025);
    expect(anioDesdeContinuidad("ORCID", new Date("2030-01-01T00:00:00Z"), hoy)).toBe(2026);
    expect(anioDesdeContinuidad("ORCID", new Date("1850-01-01T00:00:00Z"), hoy)).toBe(ANIO_MINIMO_CONTINUIDAD);
  });
  it("el texto de la pantalla sale del mismo año que consulta el motor", () => {
    expect(periodoProximaConsulta("ORCID", null, hoy)).toBe(TEXTO_HISTORIAL_INICIAL);
    expect(periodoProximaConsulta("SCOPUS", null, hoy)).toBe(`2026 ${TEXTO_INICIO_FUENTE}`);
    expect(periodoProximaConsulta("ORCID", new Date("2025-01-01"), hoy)).toBe(`2024–2026 ${TEXTO_SOLAPAMIENTO}`);
  });
  it("el SQL de búsqueda y orden usa las mismas constantes y textos", () => {
    const anio = anioDesdeContinuidadSql(Prisma.sql`f.fuente`, Prisma.sql`c."ultimaFecha"`).text;
    expect(anio).toContain(`- ${SOLAPAMIENTO_ANIOS}`);
    expect(anio).toContain(`GREATEST(${ANIO_MINIMO_CONTINUIDAD}`);
    expect(anio).toContain("IN ('SCOPUS')");
    const periodo = periodoProximaConsultaSql(Prisma.sql`f.fuente`, Prisma.sql`c."ultimaFecha"`).text;
    for (const texto of [TEXTO_HISTORIAL_INICIAL, TEXTO_INICIO_FUENTE, TEXTO_SOLAPAMIENTO]) expect(periodo).toContain(`'${texto}'`);
  });
});

describe("etiquetas en SQL desde los mapas del código (#189)", () => {
  it("genera un caso por etiqueta, sin parámetros ni texto escrito a mano", () => {
    const sql = etiquetaSql(Prisma.sql`f`, NOMBRES_FUENTE, literalSql("Fuente no reconocida"));
    for (const [clave, texto] of Object.entries(NOMBRES_FUENTE)) expect(sql.text).toContain(`WHEN '${clave}' THEN '${texto}'`);
    expect(sql.text).toContain("ELSE 'Fuente no reconocida' END");
    expect(sql.values).toEqual([]);
  });
  it("escapa comillas de un texto del código", () => {
    expect(literalSql("O'Higgins").text).toBe("'O''Higgins'");
  });
});
