import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_PRODEP, filtroProdep, LISTADO_PRODEP, ordenProdep } from "./prodep-listado";

const consulta = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_PRODEP, parametros).consulta;

describe("listado PRODEP", () => {
  it("busca por profesor, código, tipo, resultado y fechas", () => {
    expect(filtroProdep(consulta({ q: "2026" }))).toEqual({
      OR: [
        { profesor: { codigo: { contains: "2026", mode: "insensitive" } } },
        { profesor: { nombres: { contains: "2026", mode: "insensitive" } } },
        { profesor: { apellidos: { contains: "2026", mode: "insensitive" } } },
        { inicio: { lt: new Date("2027-01-01T00:00:00.000Z") }, fin: { gte: new Date("2026-01-01T00:00:00.000Z") } },
      ],
    });
    expect(filtroProdep(consulta({ q: "no aprobado" })).OR).toContainEqual({ resultado: "NO_APROBADO" });
    expect(filtroProdep(consulta())).toEqual({});
  });

  it("busca una fecha dentro del periodo mostrado", () => {
    expect(filtroProdep(consulta({ q: "2026-06-15" })).OR).toContainEqual({
      inicio: { lte: new Date("2026-06-15T00:00:00.000Z") },
      fin: { gte: new Date("2026-06-15T00:00:00.000Z") },
    });
  });

  it("ordena por columnas permitidas y desempata por id", () => {
    expect(ordenProdep(consulta())).toEqual([{ fin: "desc" }, { id: "desc" }]);
    expect(ordenProdep(consulta({ orden: "profesor", dir: "asc" }))).toEqual([
      { profesor: { apellidos: "asc" } },
      { id: "asc" },
    ]);
    expect(COLUMNAS_PRODEP.map((columna) => columna.clave)).toEqual([...LISTADO_PRODEP.columnas]);
    for (const columna of LISTADO_PRODEP.columnas) expect(() => ordenProdep(consulta({ orden: columna }))).not.toThrow();
  });
});
