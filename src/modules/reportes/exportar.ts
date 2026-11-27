import ExcelJS from "exceljs";
import { z } from "zod";

import type { ParametrosListado } from "@/lib/listados/consulta";
import {
  COLUMNAS_COMPLETO,
  consultarCompleto,
  ETIQUETA_COLUMNA_COMPLETO,
  textoCompleto,
  type EstadoCompleto,
  type FilaCompleto,
} from "./completo";
import {
  COLUMNAS_CONVOCATORIA,
  consultarConvocatoria,
  ETIQUETA_COLUMNA_CONVOCATORIA,
  textoConvocatoria,
  type DictamenConvocatoria,
  type EstadoConvocatoria,
  type HistorialSnii,
  type ParticipacionReporte,
} from "./convocatoria";
import {
  COLUMNAS_MATRIZ,
  consultarMatriz,
  ETIQUETA_COLUMNA_MATRIZ,
  textoMatriz,
  type EstadoMatriz,
  type FilaMatriz,
} from "./matriz";
import {
  COLUMNAS_RESULTADOS,
  consultarResultados,
  ETIQUETA_COLUMNA_RESULTADOS,
  textoResultados,
  type EstadoResultados,
  type FilaResultado,
} from "./publicaciones";
import {
  COLUMNAS_VIGENCIA,
  consultarVigencias,
  ETIQUETA_COLUMNA,
  textoColumna,
  type EstadoReporte,
  type FilaVigencia,
} from "./vigencias";

// RF-030: el reporte que la persona armó (columnas, filtros y orden) se descarga
// completo, no solo la página visible. El PDF se escribe aquí, sin librería nueva.

export const REPORTES_EXPORTABLES = ["vigencias", "convocatoria", "matriz", "completo", "publicaciones"] as const;
export type ReporteExportable = (typeof REPORTES_EXPORTABLES)[number];

export const FORMATOS_EXPORTABLES = ["xlsx", "pdf"] as const;
export type FormatoExportable = (typeof FORMATOS_EXPORTABLES)[number];

export type TablaExportable = {
  titulo: string;
  hoja: string;
  columnas: string[];
  filas: string[][];
};

const NOMBRE_ARCHIVO: Record<ReporteExportable, string> = {
  vigencias: "vigencias",
  convocatoria: "convocatoria-anual",
  matriz: "matriz-acreditacion",
  completo: "reporte-completo",
  publicaciones: "resultados-publicaciones",
};

export function nombreArchivo(reporte: ReporteExportable, formato: FormatoExportable) {
  return `${NOMBRE_ARCHIVO[reporte]}.${formato}`;
}

/** Conserva los filtros del reporte y quita la página: la descarga trae todas las filas. */
export function enlaceDescarga(reporte: ReporteExportable, formato: FormatoExportable, consulta: string) {
  const inicio = consulta.indexOf("?");
  const parametros = new URLSearchParams(inicio >= 0 ? consulta.slice(inicio + 1) : "");
  parametros.delete("pagina");
  parametros.set("reporte", reporte);
  parametros.set("formato", formato);
  return `/reportes/exportar?${parametros.toString()}`;
}

export function leerExportacion(parametros: ParametrosListado):
  | { reporte: ReporteExportable; formato: FormatoExportable }
  | { error: string } {
  const reporte = z.enum(REPORTES_EXPORTABLES, { error: "Elige un reporte para exportar." }).safeParse(parametros.reporte);
  if (!reporte.success) return { error: reporte.error.issues[0]?.message ?? "Elige un reporte para exportar." };
  const formato = z.enum(FORMATOS_EXPORTABLES, { error: "Elige Excel o PDF." }).safeParse(parametros.formato);
  if (!formato.success) return { error: formato.error.issues[0]?.message ?? "Elige Excel o PDF." };
  return { reporte: reporte.data, formato: formato.data };
}

export function tablaVigencias(filas: FilaVigencia[], estado: EstadoReporte): TablaExportable {
  const columnas = COLUMNAS_VIGENCIA.filter((columna) => estado.columnas.includes(columna));
  const { filas: todas } = consultarVigencias(filas, estado, true);
  return {
    titulo: "Vigencias",
    hoja: "Vigencias",
    columnas: columnas.map((columna) => ETIQUETA_COLUMNA[columna]),
    filas: todas.map((fila) => columnas.map((columna) => textoColumna(fila, columna))),
  };
}

export function tablaConvocatoria(
  dictamenes: DictamenConvocatoria[],
  participaciones: ParticipacionReporte[],
  historial: HistorialSnii[],
  estado: EstadoConvocatoria,
): TablaExportable {
  const columnas = COLUMNAS_CONVOCATORIA.filter((columna) => estado.columnas.includes(columna));
  const { filas } = consultarConvocatoria(dictamenes, participaciones, historial, estado, true);
  return {
    titulo: "Convocatoria anual",
    hoja: "Convocatoria",
    columnas: columnas.map((columna) => ETIQUETA_COLUMNA_CONVOCATORIA[columna]),
    filas: filas.map((fila) => columnas.map((columna) => textoConvocatoria(fila, columna))),
  };
}

export function tablaCompleto(filas: FilaCompleto[], estado: EstadoCompleto): TablaExportable {
  const columnas = COLUMNAS_COMPLETO.filter((columna) => estado.columnas.includes(columna));
  const { filas: todas } = consultarCompleto(filas, estado, true);
  return {
    titulo: "Reporte completo",
    hoja: "Completo",
    columnas: columnas.map((columna) => ETIQUETA_COLUMNA_COMPLETO[columna]),
    filas: todas.map((fila) => columnas.map((columna) => textoCompleto(fila, columna))),
  };
}

export function tablaResultados(filas: FilaResultado[], estado: EstadoResultados): TablaExportable {
  const columnas = COLUMNAS_RESULTADOS.filter((columna) => estado.columnas.includes(columna));
  const { filas: todas } = consultarResultados(filas, estado, true);
  return {
    titulo: "Resultados de publicaciones",
    hoja: "Publicaciones",
    columnas: columnas.map((columna) => ETIQUETA_COLUMNA_RESULTADOS[columna]),
    filas: todas.map((fila) => columnas.map((columna) => textoResultados(fila, columna))),
  };
}

export function tablaMatriz(filas: FilaMatriz[], estado: EstadoMatriz): TablaExportable {
  const columnas = COLUMNAS_MATRIZ.filter((columna) => estado.columnas.includes(columna));
  const { filas: todas } = consultarMatriz(filas, estado, true);
  return {
    titulo: "Matriz de acreditación",
    hoja: "Matriz",
    columnas: columnas.map((columna) => ETIQUETA_COLUMNA_MATRIZ[columna]),
    filas: todas.map((fila) => columnas.map((columna) => textoMatriz(fila, columna))),
  };
}

export async function generarExcel(tabla: TablaExportable): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Plataforma de Gestión de Producción Científica";
  libro.created = new Date();
  const hoja = libro.addWorksheet(tabla.hoja, { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.addRow(tabla.columnas);
  hoja.getRow(1).font = { bold: true };
  for (const fila of tabla.filas) hoja.addRow(fila);
  hoja.columns.forEach((columna, indice) => {
    const textos = [tabla.columnas[indice] ?? "", ...tabla.filas.map((fila) => fila[indice] ?? "")];
    const largo = textos.reduce((maximo, texto) => Math.max(maximo, texto.length), 0);
    columna.width = Math.min(42, Math.max(12, largo + 2));
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const ANCHO = 842;
const ALTO = 595;
const MARGEN = 36;
const TAM_TITULO = 14;
const TAM_CUERPO = 9;
const INTERLINEADO = 12;

type FilaDibujada = { celdas: string[][]; alto: number };

function escaparPdf(texto: string) {
  return texto.normalize("NFC").replace(/[^\u0020-\u00FF]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const LINEAS_PDF = 8;

function indiceDeCorte(resto: string, maximo: number) {
  const ventana = resto.slice(0, maximo);
  let mejor = -1;
  for (const separador of [";", " ", "@", ".", ",", "/"]) {
    const indice = ventana.lastIndexOf(separador);
    if (indice > mejor) mejor = indice;
  }
  if (mejor >= 3) {
    const caracter = ventana[mejor];
    return caracter === " " || caracter === ";" ? mejor : mejor + 1;
  }
  return maximo;
}

function partir(texto: string, ancho: number) {
  const maximo = Math.max(8, Math.floor(ancho / (TAM_CUERPO * 0.5)));
  const lineas: string[] = [];
  let resto = texto;
  while (resto.length > maximo && lineas.length < LINEAS_PDF - 1) {
    const corte = indiceDeCorte(resto, maximo);
    lineas.push(resto.slice(0, corte).trimEnd());
    resto = resto.slice(corte).trimStart();
  }
  if (resto.length > maximo) {
    const corte = indiceDeCorte(resto, Math.max(4, maximo - 3));
    const linea = resto.slice(0, corte).trimEnd();
    lineas.push(`${linea.slice(0, Math.max(1, linea.length - 3))}...`);
  } else if (resto.length > 0 || lineas.length === 0) {
    lineas.push(resto);
  }
  return lineas;
}

function anchosDe(tabla: TablaExportable) {
  const usable = ANCHO - MARGEN * 2;
  const preferidos = tabla.columnas.map((columna, indice) => {
    const textos = [columna, ...tabla.filas.map((fila) => fila[indice] ?? "")];
    const largo = textos.reduce((maximo, texto) => Math.max(maximo, Math.min(texto.length, 42)), 1);
    return Math.max(52, largo * TAM_CUERPO * 0.5 + 10);
  });
  const suma = preferidos.reduce((total, ancho) => total + ancho, 0);
  if (suma <= usable) {
    const extra = (usable - suma) / preferidos.length;
    return preferidos.map((ancho) => ancho + extra);
  }
  const escala = usable / suma;
  return preferidos.map((ancho) => ancho * escala);
}

function dibujarFila(celdas: string[], anchos: number[]): FilaDibujada {
  const lineas = celdas.map((texto, indice) => partir(texto, anchos[indice] - 8));
  const maximo = Math.max(1, ...lineas.map((grupo) => grupo.length));
  return { celdas: lineas, alto: maximo * INTERLINEADO + 8 };
}

function repartir(encabezado: FilaDibujada, datos: FilaDibujada[]) {
  const paginas: FilaDibujada[][] = [];
  let actual = [encabezado];
  let usado = encabezado.alto;
  const limite = (primera: boolean) => ALTO - MARGEN * 2 - 18 - (primera ? TAM_TITULO + 16 : 0);
  for (const fila of datos) {
    if (usado + fila.alto > limite(paginas.length === 0)) {
      paginas.push(actual);
      actual = [encabezado];
      usado = encabezado.alto;
    }
    actual.push(fila);
    usado += fila.alto;
  }
  paginas.push(actual);
  return paginas;
}

function paginaPdf(titulo: string | null, filas: FilaDibujada[], anchos: number[], numero: number, total: number) {
  const suma = anchos.reduce((total, ancho) => total + ancho, 0);
  const comandos: string[] = ["0.75 0.76 0.78 RG"];
  let y = ALTO - MARGEN;
  if (titulo) {
    comandos.push(`BT /F1 ${TAM_TITULO} Tf 0 0 0 rg ${MARGEN} ${y - TAM_TITULO} Td (${escaparPdf(titulo)}) Tj ET`);
    y -= TAM_TITULO + 16;
  }
  filas.forEach((fila, indiceFila) => {
    if (indiceFila === 0) {
      comandos.push(`0.93 0.94 0.95 rg ${MARGEN} ${y - fila.alto} ${suma} ${fila.alto} re f`);
    }
    comandos.push(`${MARGEN} ${y - fila.alto} m ${MARGEN + suma} ${y - fila.alto} l S`);
    let x = MARGEN;
    fila.celdas.forEach((lineas, indice) => {
      lineas.forEach((linea, lineaIndice) => {
        const base = y - 4 - TAM_CUERPO - lineaIndice * INTERLINEADO;
        comandos.push(`BT /F1 ${TAM_CUERPO} Tf 0 0 0 rg ${x + 4} ${base} Td (${escaparPdf(linea)}) Tj ET`);
      });
      x += anchos[indice];
    });
    y -= fila.alto;
  });
  comandos.push(`BT /F1 8 Tf 0.35 0.36 0.4 rg ${MARGEN} 20 Td (${escaparPdf(`Página ${numero} de ${total}`)}) Tj ET`);
  return comandos.join("\n");
}

export function generarPdf(tabla: TablaExportable): Buffer {
  const anchos = anchosDe(tabla);
  const encabezado = dibujarFila(tabla.columnas, anchos);
  const datos = tabla.filas.map((fila) => dibujarFila(fila, anchos));
  const paginas = repartir(encabezado, datos);
  const contenidos = paginas.map((filas, indice) => paginaPdf(indice === 0 ? tabla.titulo : null, filas, anchos, indice + 1, paginas.length));
  const objetos: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"),
    Buffer.from(`<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((_, indice) => `${4 + indice * 2} 0 R`).join(" ")}] >>`, "latin1"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "latin1"),
  ];
  contenidos.forEach((contenido, indice) => {
    const flujo = Buffer.from(contenido, "latin1");
    objetos.push(Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + indice * 2} 0 R >>`,
      "latin1",
    ));
    objetos.push(Buffer.concat([
      Buffer.from(`<< /Length ${flujo.length} >>\nstream\n`, "latin1"),
      flujo,
      Buffer.from("\nendstream", "latin1"),
    ]));
  });
  return documentoPdf(objetos);
}

function documentoPdf(objetos: Buffer[]) {
  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets = [0];
  let cursor = partes[0].length;
  objetos.forEach((cuerpo, indice) => {
    offsets.push(cursor);
    const bloque = Buffer.concat([
      Buffer.from(`${indice + 1} 0 obj\n`, "latin1"),
      cuerpo,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    partes.push(bloque);
    cursor += bloque.length;
  });
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (let indice = 1; indice <= objetos.length; indice += 1) {
    xref += `${String(offsets[indice]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  partes.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(partes);
}
