import ExcelJS from "exceljs";
import { esFilaEncabezado } from "./lectura";

// RF-017: convierte un listado oficial en Excel en filas de textos para interpretarListado.

// Filas en las que se busca el encabezado de cada hoja (membrete y título van antes).
const FILAS_PARA_ENCABEZADO = 20;

function textoDeCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((parte) => parte.text).join("");
    if ("result" in valor) return textoDeCelda(valor.result as ExcelJS.CellValue);
    if ("text" in valor) return String(valor.text);
    return "";
  }
  return String(valor);
}

function filasDeHoja(hoja: ExcelJS.Worksheet): string[][] {
  const filas: string[][] = [];
  for (let numero = 1; numero <= hoja.rowCount; numero++) {
    const fila = hoja.getRow(numero);
    const celdas: string[] = [];
    for (let columna = 1; columna <= fila.cellCount; columna++) celdas.push(textoDeCelda(fila.getCell(columna).value).trim());
    filas.push(celdas);
  }
  return filas;
}

// La primera hoja que tiene encabezados reconocibles en sus primeras filas; [] si ninguna.
export async function filasDeExcel(datos: Uint8Array): Promise<string[][]> {
  const libro = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS acepta Buffer / ArrayBuffer en load (igual que en produccion/cuartiles.ts)
  await libro.xlsx.load(Buffer.from(datos));
  for (const hoja of libro.worksheets) {
    const filas = filasDeHoja(hoja);
    if (filas.slice(0, FILAS_PARA_ENCABEZADO).some(esFilaEncabezado)) return filas;
  }
  return [];
}
