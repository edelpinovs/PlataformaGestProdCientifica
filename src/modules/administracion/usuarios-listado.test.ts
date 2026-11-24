import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { COLUMNAS_USUARIOS, filtroUsuarios, LISTADO_USUARIOS, ordenUsuarios } from "./usuarios-listado";

const analisis = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_USUARIOS, parametros);
const consulta = (parametros: Record<string, string> = {}) => analisis(parametros).consulta;

describe("listado de usuarios", () => {
  it("sin búsqueda ni filtros no restringe nada", () => {
    expect(filtroUsuarios(consulta())).toEqual({});
  });

  it("la búsqueda cubre correo, profesor, rol y estado", () => {
    const where = filtroUsuarios(consulta({ q: "docente" }));
    expect(where.OR).toContainEqual({ correo: { contains: "docente", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ profesor: { apellidos: { contains: "docente", mode: "insensitive" } } });
    expect(where.OR).toContainEqual({ rol: { in: ["DOCENTE"] } });
  });

  it("encuentra el rol por su texto aunque se escriba sin acento", () => {
    expect(filtroUsuarios(consulta({ q: "coordinacion" })).OR).toContainEqual({ rol: { in: ["COORDINADOR"] } });
  });

  it("encuentra el estado por su texto", () => {
    expect(filtroUsuarios(consulta({ q: "desactiv" })).OR).toContainEqual({ activo: false });
    expect(filtroUsuarios(consulta({ q: "activo" })).OR).toContainEqual({ activo: true });
  });

  it("escapa los comodines de la búsqueda", () => {
    expect(filtroUsuarios(consulta({ q: "50%_" })).OR).toContainEqual({
      correo: { contains: "50\\%\\_", mode: "insensitive" },
    });
  });

  it("los filtros de rol y estado se combinan con la búsqueda", () => {
    expect(filtroUsuarios(consulta({ rol: "COORDINADOR", estado: "DESACTIVADO" }))).toEqual({
      rol: "COORDINADOR",
      activo: false,
    });
  });

  it("un filtro con valor inválido se ignora y se avisa", () => {
    const { consulta: c, errores } = analisis({ rol: "SUPERUSUARIO" });
    expect(filtroUsuarios(c)).toEqual({});
    expect(Object.keys(errores)).toContain("rol");
  });

  it("ordena por correo ascendente por omisión y desempata por id", () => {
    expect(ordenUsuarios(consulta())).toEqual([{ correo: "asc" }, { id: "asc" }]);
    expect(ordenUsuarios(consulta({ orden: "estado", dir: "desc" }))).toEqual([{ activo: "desc" }, { id: "desc" }]);
    expect(ordenUsuarios(consulta({ orden: "profesor" }))).toEqual([{ profesor: { apellidos: "asc" } }, { id: "asc" }]);
  });

  it("una columna que no está en la lista no llega al orderBy", () => {
    expect(ordenUsuarios(consulta({ orden: "password" }))).toEqual([{ correo: "asc" }, { id: "asc" }]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_USUARIOS.map((c) => c.clave)).toEqual([...LISTADO_USUARIOS.columnas]);
    for (const clave of LISTADO_USUARIOS.columnas) expect(() => ordenUsuarios(consulta({ orden: clave }))).not.toThrow();
  });
});
