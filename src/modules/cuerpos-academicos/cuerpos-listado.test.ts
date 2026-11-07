import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_CUERPOS, filtroCuerpos, listadoCuerpos, ordenCuerpos } from "./cuerpos-listado";

const definicion = listadoCuerpos([3, 8]);
const consulta = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros).consulta;

describe("listado de cuerpos académicos (D-009)", () => {
  it("acepta nivel y departamento como filtros", () => {
    expect(definicion.filtros).toEqual({
      nivel: ["EN_FORMACION", "EN_CONSOLIDACION", "CONSOLIDADO"],
      departamento: ["3", "8"],
    });
  });

  it("la búsqueda cubre clave, nombre, departamento, líder y nivel visible", () => {
    expect(filtroCuerpos(consulta({ q: "ca-" }))).toEqual({
      OR: [
        { clave: { contains: "ca-", mode: "insensitive" } },
        { nombre: { contains: "ca-", mode: "insensitive" } },
        { departamento: { nombre: { contains: "ca-", mode: "insensitive" } } },
        { departamento: { nomenclatura: { contains: "ca-", mode: "insensitive" } } },
        { lider: { nombres: { contains: "ca-", mode: "insensitive" } } },
        { lider: { apellidos: { contains: "ca-", mode: "insensitive" } } },
        { lider: { codigo: { contains: "ca-", mode: "insensitive" } } },
      ],
    });
    expect(filtroCuerpos(consulta({ q: "formación" })).OR).toEqual(
      expect.arrayContaining([{ nivel: { in: ["EN_FORMACION"] } }]),
    );
    expect(filtroCuerpos(consulta())).toEqual({});
  });

  it("un año busca en el registro y el vencimiento", () => {
    expect(filtroCuerpos(consulta({ q: "2026" })).OR).toEqual(
      expect.arrayContaining([{ anioRegistro: 2026 }, { anioVencimiento: 2026 }]),
    );
  });

  it("escapa los comodines de LIKE", () => {
    expect(filtroCuerpos(consulta({ q: "100%" })).OR?.[0]).toEqual({
      clave: { contains: "100\\%", mode: "insensitive" },
    });
  });

  it("filtra por nivel y departamento de la URL", () => {
    expect(filtroCuerpos(consulta({ nivel: "CONSOLIDADO", departamento: "8" }))).toEqual({
      nivel: "CONSOLIDADO",
      departamentoId: 8,
    });
  });

  it("ordena por nombre de forma ascendente por omisión y desempata por id", () => {
    expect(ordenCuerpos(consulta())).toEqual([{ nombre: "asc" }, { id: "asc" }]);
    expect(ordenCuerpos(consulta({ orden: "integrantes", dir: "desc" }))).toEqual([
      { integrantes: { _count: "desc" } },
      { id: "desc" },
    ]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_CUERPOS.map((c) => c.clave)).toEqual([...definicion.columnas]);
    for (const clave of definicion.columnas) expect(() => ordenCuerpos(consulta({ orden: clave }))).not.toThrow();
  });

  it("rechaza una columna de orden que no está permitida", () => {
    const { consulta: leida, errores } = analizarListado(definicion, { orden: "areaProdep" });
    expect(errores.orden).toBe("Ordena por una columna válida.");
    expect(leida.orden).toBe("nombre");
  });
});
