import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_PROFESORES, filtroProfesores, listadoProfesores, ordenProfesores } from "./profesores-listado";

const definicion = listadoProfesores([4, 8], [2]);
const analizar = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros);

describe("listado de profesores", () => {
  it("estatus, departamento y grado solo aceptan valores que existen", () => {
    expect(analizar({ estatus: "LICENCIA", departamento: "8", grado: "2" }).consulta.filtros).toEqual({
      estatus: "LICENCIA",
      departamento: "8",
      grado: "2",
    });
    const invalido = analizar({ estatus: "JUBILADO", departamento: "99", grado: "5" });
    expect(invalido.consulta.filtros).toEqual({ estatus: "", departamento: "", grado: "" });
    expect(invalido.errores.estatus).toBe("Uno de los filtros tiene un valor que no existe.");
    expect(invalido.errores.departamento).toBeDefined();
    expect(invalido.errores.grado).toBeDefined();
  });

  it("una columna que no está en la lista no se usa para ordenar", () => {
    const { consulta, errores } = analizar({ orden: "orcid" });
    expect(consulta.orden).toBe("nombre");
    expect(errores.orden).toBe("Ordena por una columna válida.");
  });

  it("la búsqueda cubre código, nombre, apellidos, correo, departamento y grado", () => {
    const donde = filtroProfesores(analizar({ q: "ana" }).consulta) as { OR: object[] };
    expect(donde.OR).toEqual([
      { codigo: { contains: "ana", mode: "insensitive" } },
      { nombres: { contains: "ana", mode: "insensitive" } },
      { apellidos: { contains: "ana", mode: "insensitive" } },
      { correo: { contains: "ana", mode: "insensitive" } },
      { departamento: { nombre: { contains: "ana", mode: "insensitive" } } },
      { grado: { nombre: { contains: "ana", mode: "insensitive" } } },
      { grado: { nomenclatura: { contains: "ana", mode: "insensitive" } } },
    ]);
    expect(filtroProfesores(analizar().consulta)).toEqual({});
  });

  it("escapa los comodines de la búsqueda", () => {
    const donde = filtroProfesores(analizar({ q: "100%_a\\b" }).consulta) as {
      OR: { codigo: { contains: string } }[];
    };
    expect(donde.OR[0].codigo.contains).toBe("100\\%\\_a\\\\b");
  });

  it("combina la búsqueda con los filtros", () => {
    const donde = filtroProfesores(analizar({ q: "ana", estatus: "ACTIVO", departamento: "4", grado: "2" }).consulta);
    expect(donde).toMatchObject({ estatusLaboral: "ACTIVO", departamentoId: 4, gradoId: 2 });
    expect(donde).toHaveProperty("OR");
  });

  it("por omisión ordena por apellidos y nombres, con desempate por id", () => {
    expect(ordenProfesores(analizar().consulta)).toEqual([{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }]);
    expect(ordenProfesores(analizar({ orden: "nombre", dir: "desc" }).consulta)).toEqual([
      { apellidos: "desc" },
      { nombres: "desc" },
      { id: "desc" },
    ]);
  });

  it("al ordenar por otra columna no agrega el nombre", () => {
    expect(ordenProfesores(analizar({ orden: "codigo", dir: "desc" }).consulta)).toEqual([
      { codigo: "desc" },
      { id: "desc" },
    ]);
    expect(ordenProfesores(analizar({ orden: "correo" }).consulta)).toEqual([{ correo: "asc" }, { id: "asc" }]);
    expect(ordenProfesores(analizar({ orden: "estatus", dir: "desc" }).consulta)).toEqual([
      { estatusLaboral: "desc" },
      { id: "desc" },
    ]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_PROFESORES.map((c) => c.clave)).toEqual([...definicion.columnas]);
    for (const clave of definicion.columnas) expect(() => ordenProfesores(analizar({ orden: clave }).consulta)).not.toThrow();
  });
});
