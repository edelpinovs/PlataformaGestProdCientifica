import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_GRADOS, filtroGrados, LISTADO_GRADOS, ordenGrados } from "./grados-listado";

const consulta = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_GRADOS, parametros).consulta;

describe("listado de grados", () => {
  it("la búsqueda cubre el nombre y la nomenclatura", () => {
    expect(filtroGrados(consulta({ q: "dr" }))).toEqual({
      OR: [
        { nombre: { contains: "dr", mode: "insensitive" } },
        { nomenclatura: { contains: "dr", mode: "insensitive" } },
      ],
    });
    expect(filtroGrados(consulta())).toEqual({});
  });

  it("ordena por nombre de forma ascendente por omisión y desempata por id", () => {
    expect(ordenGrados(consulta())).toEqual([{ nombre: "asc" }, { id: "asc" }]);
    expect(ordenGrados(consulta({ orden: "nomenclatura", dir: "desc" }))).toEqual([{ nomenclatura: "desc" }, { id: "desc" }]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_GRADOS.map((c) => c.clave)).toEqual([...LISTADO_GRADOS.columnas]);
    for (const clave of LISTADO_GRADOS.columnas) expect(() => ordenGrados(consulta({ orden: clave }))).not.toThrow();
  });
});
