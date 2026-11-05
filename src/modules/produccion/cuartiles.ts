// Módulo de cuartiles Scopus por ISSN (RF-020, RF-026).
// Lógica pura y lectura de catálogos para asociar cuartiles (Q1, Q2, Q3, Q4) a publicaciones.
// Replica la lógica de cargar_cuartiles() y completar_local() en scripts/reporte_unificado.py.

import ExcelJS from "exceljs";
import { normalizarIssnIsbn } from "./normalizacion";
import type { PublicacionCandidata, PublicacionConsolidada } from "./tipos";

export type MapaCuartiles = Map<string, string>;

/**
 * Normaliza el valor de un cuartil a formato estándar ("Q1", "Q2", "Q3", "Q4").
 * Acepta variantes como "q1", "1", "Q 1", "Cuartil 1".
 */
export function normalizarCuartil(valor?: string | number | null): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim().toUpperCase();
  if (!texto) return null;

  // Si ya es Q1, Q2, Q3, Q4
  const matchQ = texto.match(/^(?:CUARTIL\s*)?Q?\s*([1-4])$/);
  if (matchQ) {
    return `Q${matchQ[1]}`;
  }

  return texto;
}

/**
 * Extrae y normaliza todos los códigos ISSN individuales presentes en una cadena
 * que pueda contener múltiples valores separados por coma, punto y coma, diagonales o espacios.
 */
export function extraerIssns(texto?: string | null): string[] {
  if (!texto) return [];

  // Separar por delimitadores comunes: comas, puntos y comas, plecas o saltos de línea
  const partes = texto.split(/[,;\n\r|/]+/);
  const issns: string[] = [];

  for (const parte of partes) {
    const norm = normalizarIssnIsbn(parte);
    if (norm) {
      issns.push(norm);
    }
  }

  return Array.from(new Set(issns));
}

/**
 * Crea un mapa de cuartiles en memoria a partir de una lista de registros { issn, cuartil }.
 * Las claves se normalizan para búsqueda rápida sin guiones ni caracteres especiales.
 */
export function crearMapaCuartiles(
  registros: Array<{ issn: string; cuartil: string }>,
): MapaCuartiles {
  const mapa: MapaCuartiles = new Map();

  for (const reg of registros) {
    const issns = extraerIssns(reg.issn);
    const q = normalizarCuartil(reg.cuartil);
    if (q) {
      for (const issn of issns) {
        mapa.set(issn, q);
      }
    }
  }

  return mapa;
}

/**
 * Busca el cuartil Scopus correspondiente a un ISSN o lista de ISSNs.
 * Retorna el cuartil encontrado (ej. "Q1") o null si no se encuentra en el mapa.
 */
export function asignarCuartil(
  isbnIssn: string | null | undefined,
  cuartiles: MapaCuartiles | Record<string, string>,
): string | null {
  if (!isbnIssn) return null;

  const issns = extraerIssns(isbnIssn);
  const esMap = cuartiles instanceof Map;

  for (const issn of issns) {
    const q = esMap ? cuartiles.get(issn) : cuartiles[issn];
    if (q) {
      return normalizarCuartil(q);
    }
  }

  return null;
}

/**
 * Carga un catálogo de cuartiles Scopus desde un buffer de Excel (.xlsx).
 * Busca inteligentemente las columnas de ISSN y Cuartil, similar a col() en Python.
 */
export async function cargarCuartilesDesdeExcel(
  buffer: Buffer | ArrayBuffer | Uint8Array,
): Promise<MapaCuartiles> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS acepta Buffer / ArrayBuffer en load
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return new Map();
  }

  let colIssn = -1;
  let colCuartil = -1;
  let filaDatos = 2;

  // 1. Buscar la fila de encabezados entre las primeras 5 filas (donde coexistan columnas distintas para ISSN y Cuartil)
  for (let r = 1; r <= Math.min(5, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    let tempIssn = -1;
    let tempCuartil = -1;

    row.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? "").trim();
      const texto = val.toUpperCase().replace(/[^A-Z0-9]/g, "");

      if ((texto.includes("ISSN") || texto === "EISSN") && tempIssn === -1) {
        tempIssn = colNumber;
      }
      if (
        (texto.includes("CUARTIL") ||
          texto.includes("QUARTILE") ||
          texto === "Q" ||
          texto === "QSCOPUS" ||
          texto === "SJRQ") &&
        tempCuartil === -1
      ) {
        tempCuartil = colNumber;
      }
    });

    if (tempIssn !== -1 && tempCuartil !== -1 && tempIssn !== tempCuartil) {
      colIssn = tempIssn;
      colCuartil = tempCuartil;
      filaDatos = r + 1;
      break;
    }
  }

  if (colIssn === -1 || colCuartil === -1) {
    return new Map();
  }

  const mapa: MapaCuartiles = new Map();

  for (let r = filaDatos; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const rawIssn = row.getCell(colIssn).value;
    const rawCuartil = row.getCell(colCuartil).value;

    if (rawIssn && rawCuartil) {
      const issns = extraerIssns(String(rawIssn));
      const q = normalizarCuartil(String(rawCuartil));
      if (q) {
        for (const issn of issns) {
          mapa.set(issn, q);
        }
      }
    }
  }

  return mapa;
}

/**
 * Enriquece una publicación asignándole su cuartil Scopus si cuenta con ISSN y existe en el mapa.
 * Si ya tiene un cuartil asignado, no lo sobreescribe a menos que forzarSeaVerdadero sea true.
 */
export function enriquecerPublicacionConCuartil(
  pub: PublicacionCandidata | PublicacionConsolidada,
  cuartiles: MapaCuartiles | Record<string, string>,
  forzar = false,
): void {
  if (pub.cuartil && !forzar) {
    return;
  }

  const q = asignarCuartil(pub.isbnIssn, cuartiles);
  if (q) {
    pub.cuartil = q;
  }
}

/**
 * Enriquece un lote de publicaciones asignándoles cuartil Scopus en memoria.
 */
export function enriquecerLoteConCuartiles(
  publicaciones: (PublicacionCandidata | PublicacionConsolidada)[],
  cuartiles: MapaCuartiles | Record<string, string>,
  forzar = false,
): void {
  for (const pub of publicaciones) {
    enriquecerPublicacionConCuartil(pub, cuartiles, forzar);
  }
}
