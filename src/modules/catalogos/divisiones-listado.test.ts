import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_DIVISIONES, filtroDivisiones, LISTADO_DIVISIONES, ordenDivisiones } from "./divisiones-listado";

const consulta = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_DIVISIONES, parametros).consulta;

describe("listado de divisiones", () => {
  it("la búsqueda cubre el nombre y la clave", () => {
    expect(filtroDivisiones(consulta({ q: "cu" }))).toEqual({
      OR: [{ nombre: { contains: "cu", mode: "insensitive" } }, { clave: { contains: "cu", mode: "insensitive" } }],
    });
    expect(filtroDivisiones(consulta())).toEqual({});
  });

  it("ordena por nombre por omisión y por cantidad de departamentos con _count", () => {
    expect(ordenDivisiones(consulta())).toEqual([{ nombre: "asc" }, { id: "asc" }]);
    expect(ordenDivisiones(consulta({ orden: "departamentos", dir: "desc" }))).toEqual([
      { departamentos: { _count: "desc" } }, { id: "desc" },
    ]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_DIVISIONES.map((c) => c.clave)).toEqual([...LISTADO_DIVISIONES.columnas]);
    for (const clave of LISTADO_DIVISIONES.columnas) expect(() => ordenDivisiones(consulta({ orden: clave }))).not.toThrow();
  });
});
