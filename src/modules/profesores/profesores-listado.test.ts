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

  const campos = (palabra: string) => [
    { codigo: { contains: palabra, mode: "insensitive" } },
    { nombres: { contains: palabra, mode: "insensitive" } },
    { apellidos: { contains: palabra, mode: "insensitive" } },
    { correo: { contains: palabra, mode: "insensitive" } },
    { departamento: { nombre: { contains: palabra, mode: "insensitive" } } },
    { grado: { nombre: { contains: palabra, mode: "insensitive" } } },
    { grado: { nomenclatura: { contains: palabra, mode: "insensitive" } } },
  ];

  it("la búsqueda cubre código, nombre, apellidos, correo, departamento, grado, contratación y estatus", () => {
    const donde = filtroProfesores(analizar({ q: "ana" }).consulta) as { AND: { OR: object[] }[] };
    expect(donde.AND).toHaveLength(1);
    expect(donde.AND[0].OR.slice(0, 7)).toEqual(campos("ana"));
    expect(donde.AND[0].OR.slice(7)).toEqual([
      { tipoContratacion: { in: [] } },
      { estatusLaboral: { in: [] } },
    ]);
    expect(filtroProfesores(analizar().consulta)).toEqual({});
  });

  it("cada palabra debe aparecer en algún campo: un nombre completo encuentra al profesor", () => {
    const donde = filtroProfesores(analizar({ q: "Ana  Pérez" }).consulta) as { AND: { OR: object[] }[] };
    expect(donde.AND).toHaveLength(2);
    expect(donde.AND[0].OR.slice(0, 7)).toEqual(campos("Ana"));
    expect(donde.AND[1].OR.slice(0, 7)).toEqual(campos("Pérez"));
  });

  it("busca también por las etiquetas visibles de contratación y estatus, sin acentos ni mayúsculas", () => {
    const completo = filtroProfesores(analizar({ q: "TIEMPO" }).consulta) as { AND: { OR: object[] }[] };
    expect(completo.AND[0].OR).toContainEqual({ tipoContratacion: { in: ["TIEMPO_COMPLETO"] } });
    const baja = filtroProfesores(analizar({ q: "baja" }).consulta) as { AND: { OR: object[] }[] };
    expect(baja.AND[0].OR).toContainEqual({ estatusLaboral: { in: ["BAJA_TEMPORAL", "BAJA_POSDOCTORAL"] } });
    const sinAcento = filtroProfesores(analizar({ q: "asignatura" }).consulta) as { AND: { OR: object[] }[] };
    expect(sinAcento.AND[0].OR).toContainEqual({ tipoContratacion: { in: ["ASIGNATURA"] } });
  });

  it("limita la búsqueda a las primeras cinco palabras", () => {
    const donde = filtroProfesores(analizar({ q: "a b c d e f g" }).consulta) as { AND: object[] };
    expect(donde.AND).toHaveLength(5);
  });

  it("un texto de solo espacios no filtra", () => {
    expect(filtroProfesores(analizar({ q: "   " }).consulta)).toEqual({});
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
