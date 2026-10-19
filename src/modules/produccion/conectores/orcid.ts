// Conector para la API pública de ORCID (v3.0) - RF-020.
import { limpiarDoi, limpiarTexto } from "../normalizacion";
import type { PublicacionCandidata, TipoPublicacion } from "../tipos";
import { fetchJsonConReintentos } from "./http";

const URL_ORCID_BASE = "https://pub.orcid.org/v3.0";

/**
 * Mapea el tipo de trabajo de ORCID al TipoPublicacion del modelo del sistema.
 */
export function mapearTipoOrcid(tipo?: string | null): TipoPublicacion {
  const norm = (tipo || "").toLowerCase().replace(/_/g, "-");
  if (norm.includes("journal-article") || norm.includes("review") || norm.includes("preprint")) {
    return "ARTICULO";
  }
  if (norm.includes("conference") || norm.includes("proceedings")) {
    return "MEMORIA_CONGRESO";
  }
  if (norm.includes("book-chapter")) {
    return "CAPITULO";
  }
  if (norm.includes("book")) {
    return "LIBRO";
  }
  if (norm.includes("patent")) {
    return "PATENTE";
  }
  if (norm.includes("software") || norm.includes("data-set")) {
    return "REGISTRO_SOFTWARE";
  }
  return "OTRO";
}

/**
 * Transforma un elemento work-summary de ORCID en un PublicacionCandidata estándar.
 */
export function mapearObraOrcid(
  group: Record<string, unknown>,
  summary: Record<string, unknown>,
  profesorId: number,
  nombreProfesor?: string,
): PublicacionCandidata | null {
  const titleObj = (summary["title"] as Record<string, unknown>) || {};
  const innerTitle = (titleObj["title"] as Record<string, unknown>) || {};
  const tituloLimpio = limpiarTexto(innerTitle["value"] as string);
  if (!tituloLimpio) return null;

  // Extraer DOI de external-ids (está tanto en group como en summary)
  let doi: string | null = null;
  const externalIdsContainer =
    (group["external-ids"] as Record<string, unknown>) ||
    (summary["external-ids"] as Record<string, unknown>) ||
    {};
  const externalIdsList = (externalIdsContainer["external-id"] as Record<string, unknown>[]) || [];

  for (const ext of externalIdsList) {
    const tipoExt = String(ext["external-id-type"] || "").toLowerCase();
    if (tipoExt === "doi") {
      const valorDoi = ext["external-id-value"] as string;
      if (valorDoi) {
        doi = limpiarDoi(valorDoi);
        break;
      }
    }
  }

  const tipo = mapearTipoOrcid(summary["type"] as string);

  // Fecha y año de publicación
  const pubDateObj = (summary["publication-date"] as Record<string, unknown>) || {};
  const yearObj = (pubDateObj["year"] as Record<string, unknown>) || {};
  const monthObj = (pubDateObj["month"] as Record<string, unknown>) || {};
  const dayObj = (pubDateObj["day"] as Record<string, unknown>) || {};

  const yearStr = limpiarTexto(yearObj["value"] as string);
  const monthStr = limpiarTexto(monthObj["value"] as string) || "01";
  const dayStr = limpiarTexto(dayObj["value"] as string) || "01";

  let fechaPublicacion: Date | null = null;
  let anio: number | null = null;

  if (yearStr) {
    const parsedYear = parseInt(yearStr, 10);
    if (!isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= 2100) {
      anio = parsedYear;
      const parsedMonth = Math.min(Math.max(parseInt(monthStr, 10), 1), 12);
      const parsedDay = Math.min(Math.max(parseInt(dayStr, 10), 1), 31);
      fechaPublicacion = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay));
    }
  }

  // Revista o editorial
  const journalObj = (summary["journal-title"] as Record<string, unknown>) || {};
  const revista = limpiarTexto(journalObj["value"] as string) || null;

  // Enlace o URL
  const urlObj = (summary["url"] as Record<string, unknown>) || {};
  const evidenciaUrl = (urlObj["value"] as string) || (doi ? `https://doi.org/${doi}` : null);

  const autoresTexto = nombreProfesor ? limpiarTexto(nombreProfesor) : "Autor en ORCID";

  return {
    tipo,
    titulo: tituloLimpio,
    doi,
    autoresTexto,
    revistaEditorial: revista,
    fechaPublicacion,
    anio,
    evidenciaUrl: evidenciaUrl ? limpiarTexto(evidenciaUrl) : null,
    fuente: "ORCID",
    profesorId,
  };
}

/**
 * Consulta obras públicas desde la API de ORCID para un profesor dado.
 */
export async function consultarOrcid(
  profesor: { id: number; orcid?: string | null; nombres?: string; apellidos?: string },
  anio?: number,
): Promise<{ publicaciones: PublicacionCandidata[]; error?: string }> {
  if (!profesor.orcid) {
    return { publicaciones: [] };
  }

  const orcidLimpio = profesor.orcid.replace(/^https?:\/\/orcid\.org\//i, "").trim();
  const url = `${URL_ORCID_BASE}/${orcidLimpio}/works`;

  const resp = await fetchJsonConReintentos<{ group: Record<string, unknown>[] }>(url);
  if (!resp.data) {
    return { publicaciones: [], error: resp.error || `HTTP_${resp.status}` };
  }

  const groups = resp.data.group || [];
  const publicaciones: PublicacionCandidata[] = [];
  const nombreCompleto =
    profesor.apellidos && profesor.nombres
      ? `${profesor.apellidos}, ${profesor.nombres}`
      : undefined;

  for (const g of groups) {
    const summaries = (g["work-summary"] as Record<string, unknown>[]) || [];
    for (const w of summaries) {
      const pub = mapearObraOrcid(g, w, profesor.id, nombreCompleto);
      if (pub) {
        if (anio && pub.anio && pub.anio !== anio) {
          continue;
        }
        publicaciones.push(pub);
        break; // Tomar la primera representación válida del grupo
      }
    }
  }

  return { publicaciones };
}
