import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { filasDeExcel } from "./lector-excel";

// Libros inventados con la forma del listado del SNII; CVU 90xxxx de los profesores demo.
async function libro(hojas: { nombre: string; filas: unknown[][] }[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const hoja of hojas) workbook.addWorksheet(hoja.nombre).addRows(hoja.filas);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("filasDeExcel (RF-017)", () => {
  it("entrega cada fila de la hoja como textos, con el membrete incluido", async () => {
    const datos = await libro([
      {
        nombre: "Resultados",
        filas: [
          ["RESULTADOS DE LA CONVOCATORIA 2025"],
          [],
          ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"],
          [900001, "ZUÑIGA", "PEREZ", "JOSE JAIME", "Candidato"],
          [900002, "ACEVES", null, "CARLA", "Investigador Nacional Nivel I"],
        ],
      },
    ]);
    const filas = await filasDeExcel(datos);
    expect(filas.slice(2)).toEqual([
      ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"],
      ["900001", "ZUÑIGA", "PEREZ", "JOSE JAIME", "Candidato"],
      ["900002", "ACEVES", "", "CARLA", "Investigador Nacional Nivel I"],
    ]);
  });

  it("escribe las fechas como aaaa-mm-dd", async () => {
    const datos = await libro([
      {
        nombre: "PRODEP",
        filas: [
          ["NOMBRE COMPLETO", "FECHA DE INICIO", "FECHA DE FIN"],
          ["Ana Núñez", new Date(Date.UTC(2024, 11, 16)), new Date(Date.UTC(2027, 11, 15))],
        ],
      },
    ]);
    expect((await filasDeExcel(datos))[1]).toEqual(["Ana Núñez", "2024-12-16", "2027-12-15"]);
  });

  it("toma la primera hoja que tiene el listado", async () => {
    const datos = await libro([
      { nombre: "Portada", filas: [["Universidad"], ["Resultados oficiales"]] },
      { nombre: "Listado", filas: [["NOMBRE", "NIVEL"], ["Ana Núñez", "Candidato"]] },
    ]);
    expect(await filasDeExcel(datos)).toEqual([
      ["NOMBRE", "NIVEL"],
      ["Ana Núñez", "Candidato"],
    ]);
  });

  it("no entrega filas si ninguna hoja tiene encabezados", async () => {
    expect(await filasDeExcel(await libro([{ nombre: "Hoja", filas: [["nada"]] }]))).toEqual([]);
  });
});
