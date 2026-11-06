import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  COLUMNAS_DEPARTAMENTOS, filtroDepartamentos, listadoDepartamentos, ordenDepartamentos,
} from "./departamentos-listado";

const definicion = listadoDepartamentos([3, 7]);
const analizar = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros);

describe("listado de departamentos", () => {
  it("las divisiones existentes son los valores permitidos del filtro", () => {
    expect(analizar({ division: "7" }).consulta.filtros.division).toBe("7");
    const { consulta, errores } = analizar({ division: "99" });
    expect(consulta.filtros.division).toBe("");
    expect(errores.division).toBe("Uno de los filtros tiene un valor que no existe.");
  });

  it("sin divisiones no hay valores permitidos y el filtro vacío funciona", () => {
    expect(analizarListado(listadoDepartamentos([]), {}).errores).toEqual({});
    expect(analizarListado(listadoDepartamentos([]), { division: "1" }).errores.division).toBeDefined();
  });

  it("la búsqueda cubre nombre, nomenclatura, nombre y clave de la división", () => {
    const donde = filtroDepartamentos(analizar({ q: "cs" }).consulta) as { OR: object[] };
    expect(donde.OR).toEqual([
      { nombre: { contains: "cs", mode: "insensitive" } },
      { nomenclatura: { contains: "cs", mode: "insensitive" } },
      { division: { nombre: { contains: "cs", mode: "insensitive" } } },
      { division: { clave: { contains: "cs", mode: "insensitive" } } },
    ]);
  });

  it("combina la búsqueda con el filtro de división", () => {
    const donde = filtroDepartamentos(analizar({ q: "ing", division: "3" }).consulta);
    expect(donde).toMatchObject({ divisionId: 3 });
    expect(donde).toHaveProperty("OR");
    expect(filtroDepartamentos(analizar().consulta)).toEqual({});
  });

  it("por omisión agrupa por división y luego por nombre, con desempate por id", () => {
    expect(ordenDepartamentos(analizar().consulta)).toEqual([{ division: { nombre: "asc" } }, { nombre: "asc" }, { id: "asc" }]);
    expect(ordenDepartamentos(analizar({ orden: "division", dir: "desc" }).consulta)).toEqual([
      { division: { nombre: "desc" } }, { nombre: "desc" }, { id: "desc" },
    ]);
  });

  it("al ordenar por otra columna no agrega el nombre de la división", () => {
    expect(ordenDepartamentos(analizar({ orden: "nomenclatura", dir: "desc" }).consulta)).toEqual([
      { nomenclatura: "desc" }, { id: "desc" },
    ]);
    expect(ordenDepartamentos(analizar({ orden: "nombre" }).consulta)).toEqual([{ nombre: "asc" }, { id: "asc" }]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_DEPARTAMENTOS.map((c) => c.clave)).toEqual([...definicion.columnas]);
    for (const clave of definicion.columnas) expect(() => ordenDepartamentos(analizar({ orden: clave }).consulta)).not.toThrow();
  });
});
