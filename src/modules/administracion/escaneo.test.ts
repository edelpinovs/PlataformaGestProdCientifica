import { describe, expect, it } from "vitest";
import {
  resumirFuentes,
  resumirTrabajos,
  textoAvance,
  VENTANA_DIAS,
  ventanaDesde,
  type ConteoPorEstado,
  type TrabajoResumen,
} from "./escaneo";

const AHORA = new Date("2026-11-23T12:00:00Z");
const haceDias = (n: number) => new Date(AHORA.getTime() - n * 24 * 60 * 60 * 1000);

const trabajo = (id: number, estado: TrabajoResumen["estado"], dias: number): TrabajoResumen => ({
  id,
  estado,
  avance: 0,
  total: 10,
  creadoEn: haceDias(dias),
  actualizadoEn: haceDias(dias),
});

const conteo = (estado: ConteoPorEstado["estado"], cantidad: number): ConteoPorEstado => ({ estado, _count: { _all: cantidad } });

describe("ventana de recientes", () => {
  it("empieza VENTANA_DIAS días antes de «ahora»", () => {
    expect(ventanaDesde(AHORA).getTime()).toBe(haceDias(VENTANA_DIAS).getTime());
  });
});

describe("resumen de trabajos de escaneo", () => {
  it("sin trabajos no hay último ni conteos", () => {
    expect(resumirTrabajos({ ultimo: null, enCurso: 0, ventana: [] })).toEqual({
      ultimo: null,
      enCurso: 0,
      completados: 0,
      conIncidencias: 0,
    });
  });

  it("conserva el último trabajo y las cifras que calculó la base", () => {
    const ultimo = trabajo(3, "FALLIDO", 1);
    const r = resumirTrabajos({
      ultimo,
      enCurso: 2,
      ventana: [conteo("COMPLETADO", 41), conteo("FALLIDO", 3)],
    });
    expect(r).toEqual({ ultimo, enCurso: 2, completados: 41, conIncidencias: 3 });
  });

  it("los conteos no se limitan a un máximo de trabajos cargados", () => {
    const r = resumirTrabajos({ ultimo: null, enCurso: 0, ventana: [conteo("COMPLETADO", 5000)] });
    expect(r.completados).toBe(5000);
  });

  it("un estado ausente de la ventana cuenta cero, y los pendientes o en proceso no se suman a completados", () => {
    const r = resumirTrabajos({
      ultimo: null,
      enCurso: 1,
      ventana: [conteo("PENDIENTE", 1), conteo("EN_PROCESO", 2)],
    });
    expect(r.completados).toBe(0);
    expect(r.conIncidencias).toBe(0);
  });

  it("si llegaran dos grupos del mismo estado, se suman", () => {
    const r = resumirTrabajos({ ultimo: null, enCurso: 0, ventana: [conteo("FALLIDO", 3), conteo("FALLIDO", 4)] });
    expect(r.conIncidencias).toBe(7);
  });
});

describe("resumen por fuente", () => {
  it("devuelve una fila por cada fuente de escaneo, aunque no tenga cortes", () => {
    const filas = resumirFuentes([], 40);
    expect(filas.map((f) => f.fuente)).toEqual(["ORCID", "OPENALEX", "SCOPUS", "CROSSREF", "GOOGLE_SCHOLAR"]);
    expect(filas.every((f) => f.profesoresConCorte === 0 && f.sinCorte === 40 && f.ultimaFecha === null)).toBe(true);
  });

  it("calcula los profesores activos que faltan por buscar", () => {
    const fecha = new Date("2026-11-20T00:00:00Z");
    const filas = resumirFuentes([{ fuente: "SCOPUS", profesores: 35, ultimaFecha: fecha }], 40);
    const scopus = filas.find((f) => f.fuente === "SCOPUS");
    expect(scopus).toMatchObject({ nombre: "Scopus", profesoresConCorte: 35, sinCorte: 5, ultimaFecha: fecha });
  });

  it("nunca devuelve un faltante negativo", () => {
    expect(resumirFuentes([{ fuente: "ORCID", profesores: 50, ultimaFecha: null }], 40)[0].sinCorte).toBe(0);
  });

  it("ignora cortes de fuentes que el escaneo no usa, como las capturas manuales", () => {
    const filas = resumirFuentes([{ fuente: "MANUAL", profesores: 9, ultimaFecha: AHORA }], 10);
    expect(filas.map((f) => f.fuente)).not.toContain("MANUAL");
  });
});

describe("texto de avance", () => {
  it("usa singular y plural", () => {
    expect(textoAvance(1, 1)).toBe("1 de 1 profesor revisado");
    expect(textoAvance(12, 40)).toBe("12 de 40 profesores revisados");
  });

  it("un lote vacío no divide ni muestra 0 de 0", () => {
    expect(textoAvance(0, 0)).toBe("Sin profesores en el lote");
  });
});
