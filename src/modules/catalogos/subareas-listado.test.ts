import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_SUBAREAS, filtroSubareas, listadoSubareas, ordenSubareas } from "./subareas-listado";

const definicion = listadoSubareas([1, 2]);
const analisis = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros);
const consulta = (parametros: Record<string, string> = {}) => analisis(parametros).consulta;

describe("listado de subáreas", () => {
  it("la búsqueda cubre el nombre de la subárea y el de su área", () => {
    expect(filtroSubareas(consulta({ q: "gen" }))).toEqual({
      OR: [{ nombre: { contains: "gen", mode: "insensitive" } }, { area: { nombre: { contains: "gen", mode: "insensitive" } } }],
    });
  });

  it("filtra por un área existente y rechaza una que no existe", () => {
    expect(filtroSubareas(consulta({ area: "2" }))).toEqual({ areaId: 2 });
    const a = analisis({ area: "9" });
    expect(filtroSubareas(a.consulta)).toEqual({});
    expect(Object.keys(a.errores)).toContain("area");
  });

  it("agrupa por área y luego por nombre; ordenar por nombre desempata por id", () => {
    expect(ordenSubareas(consulta())).toEqual([{ area: { nombre: "asc" } }, { nombre: "asc" }, { id: "asc" }]);
    expect(ordenSubareas(consulta({ orden: "nombre", dir: "desc" }))).toEqual([{ nombre: "desc" }, { id: "desc" }]);
  });

  it("toda columna ordenable tiene texto y orden definido", () => {
    expect(COLUMNAS_SUBAREAS.map((c) => c.clave)).toEqual([...definicion.columnas]);
    for (const clave of definicion.columnas) expect(() => ordenSubareas(consulta({ orden: clave }))).not.toThrow();
  });
});
