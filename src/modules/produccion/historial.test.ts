import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { idRegistroHistorial, LISTADO_CONTINUIDAD, LISTADO_HISTORIAL, periodoProximaConsulta, sqlContinuidad, sqlHistorial } from "./historial";

describe("historial y continuidad de Producción (#169)", () => {
  it("distingue primera consulta, Scopus inicial y solapamiento sin usar fechas de publicaciones", () => {
    const hoy = new Date("2026-11-09T12:00:00Z");
    expect(periodoProximaConsulta("ORCID",null,hoy)).toBe("Historial inicial completo");
    expect(periodoProximaConsulta("SCOPUS",null,hoy)).toBe("2026 (inicio según la fuente)");
    expect(periodoProximaConsulta("ORCID",new Date("2025-01-01"),hoy)).toBe("2024–2026 (incluye solapamiento)");
  });
  it.each([LISTADO_HISTORIAL,LISTADO_CONTINUIDAD])("rechaza columnas y filtros manipulados sin interpolarlos en SQL", definicion => {
    const { consulta, errores } = analizarListado(definicion,{ orden: "id; DROP TABLE", q: "50%_\\'", fuente: "inventada", estado: "inventado" });
    expect(errores.orden).toBe("Ordena por una columna válida.");
    const sql = definicion === LISTADO_HISTORIAL ? sqlHistorial(consulta) : sqlContinuidad(consulta);
    expect(sql.contar.text).not.toContain("50%");
    expect(sql.contar.values).toContain("%50\\%\\_\\\\'%");
    expect(sql.pagina(10,10).text).not.toContain("DROP TABLE");
    expect(sql.pagina(10,10).values.slice(-2)).toEqual([10,10]);
  });
  it("el historial filtra solo trabajos de escaneo y busca sobre datos mostrados, sin errores técnicos", () => {
    const { consulta } = analizarListado(LISTADO_HISTORIAL,{ estado: "FALLIDO", tipo: "escaneo-manual" });
    const sql = sqlHistorial(consulta);
    expect(sql.contar.values).toContain("FALLIDO");
    expect(sql.contar.text).toContain("j.tipo IN ('escaneo-manual','escaneo-diario')");
    expect(sql.contar.text).not.toContain("j.error");
    expect(sql.contar.text).toContain("No registradas");
  });
  it("los puntos de continuación incluyen profesores sin corte y separan cada fuente", () => {
    const sql = sqlContinuidad(analizarListado(LISTADO_CONTINUIDAD,{}).consulta);
    expect(sql.contar.text).toContain('LEFT JOIN "CorteEscaneo"');
    expect(sql.contar.text).toContain('c."profesorId" = p.id AND c.fuente::text = f.fuente');
    expect(sql.contar.text).toContain("Sin búsqueda previa completada");
    expect(sql.contar.values).toEqual(["ORCID","OPENALEX","SCOPUS"]);
  });
  it.each([undefined, ["1","2"], "0", "Infinity", "9007199254740992"])("rechaza un detalle inválido sin consultar un Job arbitrario (%j)", valor => {
    expect(idRegistroHistorial.safeParse(valor).success).toBe(false);
  });
});
