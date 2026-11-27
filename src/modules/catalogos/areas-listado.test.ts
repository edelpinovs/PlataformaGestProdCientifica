import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_AREAS, filtroAreas, LISTADO_AREAS, ordenAreas } from "./areas-listado";

const consulta = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_AREAS, parametros).consulta;

describe("listado de áreas", () => {
  it("la búsqueda cubre el nombre y escapa los comodines", () => {
    expect(filtroAreas(consulta({ q: "bio" }))).toEqual({ OR: [{ nombre: { contains: "bio", mode: "insensitive" } }] });
    expect(filtroAreas(consulta({ q: "%" }))).toEqual({ OR: [{ nombre: { contains: "\\%", mode: "insensitive" } }] });
    expect(filtroAreas(consulta())).toEqual({});
  });

  it("ordena por nombre por omisión y por cantidad de subáreas con _count", () => {
    expect(ordenAreas(consulta())).toEqual([{ nombre: "asc" }, { id: "asc" }]);
    expect(ordenAreas(consulta({ orden: "subareas", dir: "desc" }))).toEqual([{ subareas: { _count: "desc" } }, { id: "desc" }]);
  });

  it("una columna fuera de la lista no llega al orderBy", () => {
    expect(ordenAreas(consulta({ orden: "id; DROP TABLE" }))).toEqual([{ nombre: "asc" }, { id: "asc" }]);
  });

  it("toda columna ordenable tiene texto y orden definido", () => {
    expect(COLUMNAS_AREAS.map((c) => c.clave)).toEqual([...LISTADO_AREAS.columnas]);
    for (const clave of LISTADO_AREAS.columnas) expect(() => ordenAreas(consulta({ orden: clave }))).not.toThrow();
  });
});
