// Generador del Reporte Unificado de Producción Científica en Excel (RF-020, RF-026).
// Replica con precisión la estructura de salida de scripts/reporte_unificado.py:
//   1. Hoja "Reporte unificado" (una fila por publicación deduplicada con todos sus metadatos)
//   2. Hoja "Publicación-Profesor" (vínculo de autorías entre publicación y cada profesor)
//   3. Hoja "Resumen por profesor" (métricas agregadas de publicaciones por profesor y fuente)

import ExcelJS from "exceljs";
import type { PublicacionConsolidada } from "../produccion/tipos";

export type FilaReporteUnificado = {
  anio?: number | string | null;
  fechaPublicacion?: string | Date | null;
  tipoPublicacion?: string | null;
  titulo: string;
  tipoFuente?: string | null;
  revistaEditorial?: string | null;
  paisEditorial?: string | null;
  doi?: string | null;
  isbn?: string | null;
  issn?: string | null;
  indexada?: "Sí" | "No" | string;
  baseIndexacion?: string;
  cuartilScopus?: string | null;
  autorPrincipal?: string | null;
  autores: string;
  colaboracionInternacional?: "Sí" | "No" | string | null;
  numeroCitas?: number | null;
  fechaConsultaCitas?: string | Date | null;
  indiceH?: number | string | null;
};

export type FilaPublicacionProfesor = {
  titulo: string;
  doi?: string | null;
  profesor: string;
  scopusId?: string | null;
  encontradaEn: string;
};

export type FilaResumenProfesor = {
  profesor: string;
  scopusId?: string | null;
  orcid?: string | null;
  totalPublicaciones: number;
  scopus: number;
  openAlex: number;
  orcidCount: number;
  indiceH?: number | null;
};

export type DatosReporteUnificado = {
  publicaciones: FilaReporteUnificado[];
  relaciones: FilaPublicacionProfesor[];
  resumen: FilaResumenProfesor[];
  anio?: number;
};

export const COLUMNAS_REPORTE_UNIFICADO = [
  "Año de publicación",
  "Fecha de publicación",
  "Tipo de publicación",
  "Título de la publicación",
  "Tipo de fuente",
  "Revista o editorial",
  "País editorial",
  "DOI",
  "ISBN",
  "ISSN",
  "Indexada",
  "Base de indexación",
  "Cuartil Scopus",
  "Autor principal",
  "Autores",
  "Colaboración internacional",
  "Número de citas",
  "Fecha de consulta de citas",
  "Índice H",
] as const;

export const COLUMNAS_PUBLICACION_PROFESOR = [
  "Título de la publicación",
  "DOI",
  "Profesor",
  "Scopus ID",
  "Encontrada en",
] as const;

export const COLUMNAS_RESUMEN_PROFESOR = [
  "Profesor",
  "Scopus ID",
  "ORCID",
  "Total publicaciones",
  "Scopus",
  "OpenAlex",
  "ORCID",
  "Índice H",
] as const;

/**
 * Formatea una fecha a formato legible YYYY-MM-DD.
 */
function formatearFecha(fecha?: string | Date | null): string {
  if (!fecha) return "";
  if (typeof fecha === "string") return fecha.slice(0, 10);
  try {
    return fecha.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/**
 * Convierte un lote de publicaciones consolidadas al formato de filas del reporte unificado,
 * replicando completar_local() de scripts/reporte_unificado.py.
 */
export function convertirConsolidadasAReporte(
  consolidadas: PublicacionConsolidada[],
  catalogoProfesores?: Map<
    number,
    { nombres: string; apellidos: string; scopusId?: string | null; orcid?: string | null; indiceH?: number | null }
  >,
  fechaConsulta = new Date().toISOString().slice(0, 10),
): DatosReporteUnificado {
  const filasPublicaciones: FilaReporteUnificado[] = [];
  const filasRelaciones: FilaPublicacionProfesor[] = [];

  // Contadores para el resumen por profesor
  const metricasProf = new Map<
    number,
    {
      profesor: string;
      scopusId: string;
      orcid: string;
      total: number;
      scopus: number;
      openAlex: number;
      orcidCount: number;
      indiceH: number | null;
    }
  >();

  // Inicializar métricas si se proporcionó catálogo
  if (catalogoProfesores) {
    for (const [id, prof] of catalogoProfesores.entries()) {
      metricasProf.set(id, {
        profesor: `${prof.apellidos}, ${prof.nombres}`,
        scopusId: prof.scopusId || "",
        orcid: prof.orcid || "",
        total: 0,
        scopus: 0,
        openAlex: 0,
        orcidCount: 0,
        indiceH: prof.indiceH ?? null,
      });
    }
  }

  for (const pub of consolidadas) {
    const fuentesTexto = pub.fuentesDetectadas.join("; ");
    const esScopus = pub.fuentesDetectadas.includes("SCOPUS");
    const citas = pub.citas !== undefined ? pub.citas : null;

    // Extraer autor principal (primer autor de autoresTexto)
    const primerAutor = pub.autoresTexto.split(";")[0]?.trim() || "";

    // Índice H máximo entre los profesores coautores vinculados
    let maxIndiceH: number | null = null;
    for (const profId of pub.profesoresIds) {
      const datosProf = catalogoProfesores?.get(profId);
      if (datosProf?.indiceH !== undefined && datosProf.indiceH !== null) {
        maxIndiceH = Math.max(maxIndiceH ?? 0, datosProf.indiceH);
      }
    }

    filasPublicaciones.push({
      anio: pub.anio ?? "",
      fechaPublicacion: formatearFecha(pub.fechaPublicacion),
      tipoPublicacion: pub.tipo,
      titulo: pub.titulo,
      tipoFuente: pub.tipo === "ARTICULO" ? "Journal" : pub.tipo,
      revistaEditorial: pub.revistaEditorial || "",
      paisEditorial: "",
      doi: pub.doi || "",
      isbn: "",
      issn: pub.isbnIssn || "",
      indexada: esScopus ? "Sí" : "No",
      baseIndexacion: fuentesTexto,
      cuartilScopus: pub.cuartil || "",
      autorPrincipal: primerAutor,
      autores: pub.autoresTexto,
      colaboracionInternacional: "",
      numeroCitas: citas,
      fechaConsultaCitas: citas !== null ? fechaConsulta : "",
      indiceH: maxIndiceH,
    });

    // Relaciones Publicación-Profesor
    for (const profId of pub.profesoresIds) {
      const prof = catalogoProfesores?.get(profId);
      const nombreProf = prof ? `${prof.apellidos}, ${prof.nombres}` : `Profesor #${profId}`;
      const scopusId = prof?.scopusId || "";

      filasRelaciones.push({
        titulo: pub.titulo,
        doi: pub.doi || "",
        profesor: nombreProf,
        scopusId,
        encontradaEn: fuentesTexto,
      });

      // Actualizar métricas acumuladas
      let metrica = metricasProf.get(profId);
      if (!metrica) {
        metrica = {
          profesor: nombreProf,
          scopusId,
          orcid: prof?.orcid || "",
          total: 0,
          scopus: 0,
          openAlex: 0,
          orcidCount: 0,
          indiceH: prof?.indiceH ?? null,
        };
        metricasProf.set(profId, metrica);
      }

      metrica.total++;
      if (pub.fuentesDetectadas.includes("SCOPUS")) metrica.scopus++;
      if (pub.fuentesDetectadas.includes("OPENALEX")) metrica.openAlex++;
      if (pub.fuentesDetectadas.includes("ORCID")) metrica.orcidCount++;
    }
  }

  const filasResumen: FilaResumenProfesor[] = Array.from(metricasProf.values()).map((m) => ({
    profesor: m.profesor,
    scopusId: m.scopusId,
    orcid: m.orcid,
    totalPublicaciones: m.total,
    scopus: m.scopus,
    openAlex: m.openAlex,
    orcidCount: m.orcidCount,
    indiceH: m.indiceH,
  }));

  return {
    publicaciones: filasPublicaciones,
    relaciones: filasRelaciones,
    resumen: filasResumen,
  };
}

/**
 * Genera el archivo Excel del Reporte Unificado con las 3 hojas formateadas profesionalmente.
 * Retorna el Buffer binario listo para guardarse en disco o descargarse vía HTTP.
 */
export async function generarReporteUnificadoExcel(datos: DatosReporteUnificado): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Plataforma de Gestión de Producción Científica";
  workbook.created = new Date();

  // Estilo de encabezado compartido
  const estiloEncabezado: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 10 },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Azul institucional
    },
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    },
  };

  // -------------------------------------------------------------
  // HOJA 1: Reporte unificado
  // -------------------------------------------------------------
  const hoja1 = workbook.addWorksheet("Reporte unificado", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hoja1.columns = COLUMNAS_REPORTE_UNIFICADO.map((nombre) => ({
    header: nombre,
    key: nombre,
    width: Math.max(12, nombre.length + 3),
  }));

  // Ajustes de ancho específicos
  hoja1.getColumn("Título de la publicación").width = 45;
  hoja1.getColumn("Autores").width = 35;
  hoja1.getColumn("Revista o editorial").width = 30;
  hoja1.getColumn("DOI").width = 25;

  for (const pub of datos.publicaciones) {
    hoja1.addRow([
      pub.anio ?? "",
      pub.fechaPublicacion ?? "",
      pub.tipoPublicacion ?? "",
      pub.titulo,
      pub.tipoFuente ?? "",
      pub.revistaEditorial ?? "",
      pub.paisEditorial ?? "",
      pub.doi ?? "",
      pub.isbn ?? "",
      pub.issn ?? "",
      pub.indexada ?? "No",
      pub.baseIndexacion ?? "",
      pub.cuartilScopus ?? "",
      pub.autorPrincipal ?? "",
      pub.autores,
      pub.colaboracionInternacional ?? "",
      pub.numeroCitas ?? "",
      pub.fechaConsultaCitas ?? "",
      pub.indiceH ?? "",
    ]);
  }

  // -------------------------------------------------------------
  // HOJA 2: Publicación-Profesor
  // -------------------------------------------------------------
  const hoja2 = workbook.addWorksheet("Publicación-Profesor", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hoja2.columns = COLUMNAS_PUBLICACION_PROFESOR.map((nombre) => ({
    header: nombre,
    key: nombre,
    width: Math.max(14, nombre.length + 3),
  }));

  hoja2.getColumn("Título de la publicación").width = 45;
  hoja2.getColumn("Profesor").width = 30;
  hoja2.getColumn("DOI").width = 25;

  for (const rel of datos.relaciones) {
    hoja2.addRow([
      rel.titulo,
      rel.doi ?? "",
      rel.profesor,
      rel.scopusId ?? "",
      rel.encontradaEn,
    ]);
  }

  // -------------------------------------------------------------
  // HOJA 3: Resumen por profesor
  // -------------------------------------------------------------
  const hoja3 = workbook.addWorksheet("Resumen por profesor", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hoja3.columns = COLUMNAS_RESUMEN_PROFESOR.map((nombre) => ({
    header: nombre,
    key: nombre,
    width: Math.max(14, nombre.length + 3),
  }));

  hoja3.getColumn("Profesor").width = 32;

  for (const res of datos.resumen) {
    hoja3.addRow([
      res.profesor,
      res.scopusId ?? "",
      res.orcid ?? "",
      res.totalPublicaciones,
      res.scopus,
      res.openAlex,
      res.orcidCount,
      res.indiceH ?? "",
    ]);
  }

  // Aplicar formato a las filas de encabezado de todas las hojas
  for (const worksheet of [hoja1, hoja2, hoja3]) {
    const fila1 = worksheet.getRow(1);
    fila1.height = 28;
    fila1.eachCell((cell) => {
      Object.assign(cell, estiloEncabezado);
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

