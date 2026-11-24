import { describe, expect, it } from "vitest";
import { resumirFuentes, resumirTrabajos, textoAvance, VENTANA_DIAS, type TrabajoResumen } from "./escaneo";

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

describe("resumen de trabajos de escaneo", () => {
  it("sin trabajos no hay último ni conteos", () => {
    expect(resumirTrabajos([], AHORA)).toEqual({ ultimo: null, enCurso: 0, completados: 0, conIncidencias: 0 });
  });

  it("señala el trabajo más reciente aunque llegue desordenado y desempata por id", () => {
    const lista = [trabajo(1, "COMPLETADO", 5), trabajo(3, "FALLIDO", 1), trabajo(2, "COMPLETADO", 1)];
    expect(resumirTrabajos(lista, AHORA).ultimo?.id).toBe(3);
  });

  it("cuenta lo que está en curso sin importar su antigüedad", () => {
    const lista = [trabajo(1, "PENDIENTE", 90), trabajo(2, "EN_PROCESO", 2), trabajo(3, "COMPLETADO", 2)];
    expect(resumirTrabajos(lista, AHORA).enCurso).toBe(2);
  });

  it("completados e incidencias solo cuentan dentro de la ventana", () => {
    const lista = [
      trabajo(1, "COMPLETADO", 1),
      trabajo(2, "COMPLETADO", VENTANA_DIAS - 1),
      trabajo(3, "COMPLETADO", VENTANA_DIAS + 1),
      trabajo(4, "FALLIDO", 3),
      trabajo(5, "FALLIDO", VENTANA_DIAS + 5),
    ];
    const r = resumirTrabajos(lista, AHORA);
    expect(r.completados).toBe(2);
    expect(r.conIncidencias).toBe(1);
  });

  it("no modifica la lista recibida", () => {
    const lista = [trabajo(1, "COMPLETADO", 5), trabajo(2, "COMPLETADO", 1)];
    const copia = [...lista];
    resumirTrabajos(lista, AHORA);
    expect(lista).toEqual(copia);
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
