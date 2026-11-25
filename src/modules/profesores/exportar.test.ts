import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  COLUMNAS_EXPORTACION_PROFESORES,
  enlaceExportacionProfesores,
  tablaProfesores,
  type FilaProfesorExportable,
} from "./exportar";
import { listadoProfesores } from "./profesores-listado";

const definicion = listadoProfesores([4, 8], [2]);
const consultaDe = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros).consulta;

const completo: FilaProfesorExportable = {
  codigo: "DEMO0001", apellidos: "Apellido Uno", nombres: "Nombre Uno", correo: "profesor01@demo.invalid",
  tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO",
  grado: { nombre: "Doctorado" }, departamento: { nombre: "Departamento DEP-A1" },
};

describe("tablaProfesores", () => {
  it("lleva solo las columnas que muestra la tabla, sin identificadores académicos", () => {
    const tabla = tablaProfesores([completo]);
    expect(tabla.columnas).toEqual([...COLUMNAS_EXPORTACION_PROFESORES]);
    const texto = JSON.stringify(tabla).toLowerCase();
    for (const prohibido of ["cvu", "orcid", "scholar", "scopus"]) expect(texto).not.toContain(prohibido);
  });

  it("escribe las etiquetas visibles de contratación y estatus, no los valores internos", () => {
    const [fila] = tablaProfesores([{ ...completo, estatusLaboral: "ESTANCIA_POSDOCTORAL" }]).filas;
    expect(fila).toEqual([
      "DEMO0001", "Apellido Uno", "Nombre Uno", "Doctorado", "Departamento DEP-A1",
      "Tiempo completo", "Estancia posdoctoral", "profesor01@demo.invalid",
    ]);
  });

  it("deja vacías las celdas de grado y departamento cuando no tiene", () => {
    const [fila] = tablaProfesores([{ ...completo, grado: null, departamento: null }]).filas;
    expect(fila.slice(3, 5)).toEqual(["", ""]);
  });

  it("cada fila tiene tantas celdas como columnas y sin filas queda solo el encabezado", () => {
    const tabla = tablaProfesores([completo, completo]);
    for (const fila of tabla.filas) expect(fila).toHaveLength(tabla.columnas.length);
    expect(tablaProfesores([]).filas).toEqual([]);
  });
});

describe("enlaceExportacionProfesores", () => {
  it("sin búsqueda ni filtros apunta a la ruta de exportación", () => {
    expect(enlaceExportacionProfesores(definicion, consultaDe())).toBe("/profesores/exportar");
  });

  it("conserva búsqueda, filtros y orden", () => {
    const consulta = consultaDe({ q: "ana", situacion: "activos", departamento: "8", orden: "grado", dir: "desc" });
    const enlace = enlaceExportacionProfesores(definicion, consulta);
    expect(enlace.startsWith("/profesores/exportar?")).toBe(true);
    const parametros = new URL(enlace, "http://x").searchParams;
    expect(Object.fromEntries(parametros)).toEqual({
      q: "ana", situacion: "activos", departamento: "8", orden: "grado", dir: "desc",
    });
  });

  it("quita la página: la descarga trae todas las filas", () => {
    const enlace = enlaceExportacionProfesores(definicion, consultaDe({ q: "ana", pagina: "3" }));
    expect(enlace).toBe("/profesores/exportar?q=ana");
    expect(enlace).not.toContain("pagina");
  });
});
