import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { analizarConvocatoria } from "./convocatoria";
import {
  enlaceDescarga,
  generarExcel,
  generarPdf,
  leerExportacion,
  tablaConvocatoria,
  tablaMatriz,
  tablaVigencias,
} from "./exportar";
import { analizarMatriz, filaMatriz } from "./matriz";
import { analizarReporte, filaSnii } from "./vigencias";

const hoy = new Date(Date.UTC(2026, 10, 15));

function snii(id: number, nombre: string, anio: number) {
  return filaSnii({
    id,
    nivel: "NIVEL_1",
    resultado: "APROBADO",
    inicio: new Date(Date.UTC(anio, 0, 1)),
    fin: new Date(Date.UTC(anio, 5, 1)),
    nombres: nombre,
    apellidos: "López",
    departamento: "Computación",
  }, hoy);
}

describe("exportación del reporte armado (RF-030)", () => {
  it("exporta todas las filas filtradas y solo las columnas elegidas", async () => {
    const filas = [
      ...Array.from({ length: 12 }, (_, indice) => snii(indice + 1, `Nombre${indice + 1}`, 2030)),
      snii(99, "Fuera", 2020),
    ];
    const tabla = tablaVigencias(filas, analizarReporte({ columnas: "nombre", anio: "2030" }));
    expect(tabla.columnas).toEqual(["Nombre"]);
    expect(tabla.filas).toHaveLength(12);
    expect(tabla.filas.some((fila) => fila[0].includes("Fuera"))).toBe(false);

    const libro = new ExcelJS.Workbook();
    // @ts-expect-error ExcelJS load acepta Buffer
    await libro.xlsx.load(await generarExcel(tabla));
    const hoja = libro.getWorksheet("Vigencias");
    expect(hoja?.getRow(1).getCell(1).value).toBe("Nombre");
    expect(hoja?.rowCount).toBe(13);
    expect(hoja?.getRow(2).getCell(1).value).toBe("Nombre1 López");
  });

  it("escribe un PDF con el texto del reporte y más de una página", () => {
    const filas = Array.from({ length: 80 }, (_, indice) => snii(indice + 1, `Nombre${indice + 1}`, 2030));
    const tabla = tablaVigencias(filas, analizarReporte({}));
    const pdf = generarPdf(tabla);
    const texto = pdf.toString("latin1");
    expect(texto.startsWith("%PDF-")).toBe(true);
    expect(texto).toContain("Vigencias");
    expect(texto).toContain("López");
    expect(texto).toContain("Página 2 de");
    expect(texto).toContain("Nombre80");
  });

  it("traduce el género de la convocatoria y respeta el departamento de la matriz", () => {
    const convocatoria = tablaConvocatoria([{
      id: 1,
      profesorId: 1,
      programa: "SNII",
      anio: 2026,
      departamento: "Computación",
      genero: "M",
      resultado: "APROBADO",
      tipo: "NUEVO_INGRESO",
      nivel: "CANDIDATO",
      inicio: "2026-01-01",
    }], [], [], analizarConvocatoria({ columnas: "genero" }));
    expect(convocatoria.columnas).toEqual(["Género"]);
    expect(convocatoria.filas).toEqual([["Masculino"]]);

    const ada = filaMatriz({
      id: 1,
      codigo: "CV001",
      nombres: "Ada",
      apellidos: "Lovelace",
      tipoContratacion: "TIEMPO_COMPLETO",
      estatusLaboral: "ACTIVO",
      departamento: { id: 1, nombre: "Computación" },
      grado: "Doctorado",
      programas: [{ id: 10, nombre: "Ingeniería" }],
      snii: [],
      prodep: [],
    }, hoy);
    const otro = filaMatriz({
      id: 2,
      codigo: "CV002",
      nombres: "Alan",
      apellidos: "Turing",
      tipoContratacion: "TIEMPO_COMPLETO",
      estatusLaboral: "ACTIVO",
      departamento: { id: 2, nombre: "Otro" },
      grado: "Doctorado",
      programas: [],
      snii: [],
      prodep: [],
    }, hoy);
    const matriz = tablaMatriz([ada, otro], analizarMatriz({ departamento: "1", columnas: "codigo" }, {
      departamentos: [1, 2],
      programas: [10],
    }));
    expect(matriz.filas).toEqual([["CV001"]]);
  });

  it("arma el enlace sin la página y rechaza un formato desconocido", () => {
    expect(enlaceDescarga("matriz", "xlsx", "/reportes/matriz?departamento=1&pagina=3")).toBe(
      "/reportes/exportar?departamento=1&reporte=matriz&formato=xlsx",
    );
    expect(leerExportacion({ reporte: "vigencias", formato: "pdf" })).toEqual({ reporte: "vigencias", formato: "pdf" });
    expect(leerExportacion({ reporte: "vigencias", formato: "csv" })).toEqual({ error: "Elige Excel o PDF." });
    expect(leerExportacion({ reporte: ["vigencias", "matriz"], formato: "pdf" })).toEqual({
      error: "Elige un reporte para exportar.",
    });
  });
});
