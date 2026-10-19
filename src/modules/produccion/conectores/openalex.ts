// Conector para la API abierta de OpenAlex - RF-020.
import { limpiarDoi, limpiarTexto, normalizarIssnIsbn } from "../normalizacion";
import type { PublicacionCandidata, TipoPublicacion } from "../tipos";
import { fetchJsonConReintentos } from "./http";

const URL_OPENALEX_WORKS = "https://api.openalex.org/works";

/**
 * Mapea el tipo de obra de OpenAlex a TipoPublicacion del modelo del sistema.
 */
export function mapearTipoOpenAlex(tipo?: string | null, sourceTipo?: string | null): TipoPublicacion {
  const norm = (tipo || "").toLowerCase();
  const normSrc = (sourceTipo || "").toLowerCase();

  if (normSrc.includes("conference") || norm.includes("proceedings")) {
    return "MEMORIA_CONGRESO";
  }
  if (norm === "book") {
    return "LIBRO";
  }
  if (norm === "book-chapter") {
    return "CAPITULO";
  }
  if (norm === "article" || norm === "review" || norm === "preprint" || norm === "editorial") {
    return "ARTICULO";
  }
  return "OTRO";
}

/**
 * Transforma un objeto work devuelto por OpenAlex a PublicacionCandidata.
 */
export function mapearObraOpenAlex(
  work: Record<string, unknown>,
  profesorId: number,
): PublicacionCandidata | null {
  const rawTitle = (work["title"] as string) || (work["display_name"] as string);
  // Limpiar posibles tags HTML presentes a veces en títulos de OpenAlex (ej. <i>, <sub>)
  const tituloLimpio = limpiarTexto((rawTitle || "").replace(/<[^>]+>/g, ""));
  if (!tituloLimpio) return null;

  const doi = limpiarDoi(work["doi"] as string);

  const primaryLoc = (work["primary_location"] as Record<string, unknown>) || {};
  const source = (primaryLoc["source"] as Record<string, unknown>) || {};

  const tipo = mapearTipoOpenAlex(work["type"] as string, source["type"] as string);

  // Extraer autores
  const listaAutores: string[] = [];
  const authorships = (work["authorships"] as Record<string, unknown>[]) || [];
  for (const a of authorships) {
    if (typeof a === "object" && a !== null) {
      const authorObj = (a["author"] as Record<string, unknown>) || {};
      const nombre = limpiarTexto(authorObj["display_name"] as string);
      if (nombre && !listaAutores.includes(nombre)) {
        listaAutores.push(nombre);
      }
    }
  }

  const autoresTexto = listaAutores.length > 0 ? listaAutores.join("; ") : "Desconocido";

  // Fecha y año
  const pubDateStr = work["publication_date"] as string;
  let fechaPublicacion: Date | null = null;
  if (pubDateStr) {
    const d = new Date(pubDateStr);
    if (!isNaN(d.getTime())) {
      fechaPublicacion = d;
    }
  }
  const anio = (work["publication_year"] as number) ?? (fechaPublicacion ? fechaPublicacion.getUTCFullYear() : null);

  // Revista e ISSN
  const revista = limpiarTexto(source["display_name"] as string) || null;
  const issnsRaw = source["issn"] as string[];
  const issn = normalizarIssnIsbn(
    (source["issn_l"] as string) || (Array.isArray(issnsRaw) && issnsRaw.length > 0 ? issnsRaw[0] : null),
  );

  // Citas
  let citas: number | undefined;
  if (typeof work["cited_by_count"] === "number") {
    citas = work["cited_by_count"];
  }

  // Enlace o evidencia
  const evidenciaUrl = (primaryLoc["landing_page_url"] as string) || (work["doi"] as string) || null;

  return {
    tipo,
    titulo: tituloLimpio,
    doi,
    autoresTexto,
    revistaEditorial: revista,
    isbnIssn: issn,
    fechaPublicacion,
    anio,
    evidenciaUrl: evidenciaUrl ? limpiarTexto(evidenciaUrl) : null,
    fuente: "OPENALEX",
    profesorId,
    citas,
  };
}

/**
 * Consulta obras en OpenAlex usando el ORCID del profesor.
 */
export async function consultarOpenAlex(
  profesor: { id: number; orcid?: string | null },
  anio?: number,
  apiKeyParam?: string,
): Promise<{ publicaciones: PublicacionCandidata[]; error?: string }> {
  if (!profesor.orcid) {
    return { publicaciones: [] };
  }

  const orcidLimpio = profesor.orcid.replace(/^https?:\/\/orcid\.org\//i, "").trim();
  const filtros = [`authorships.author.orcid:https://orcid.org/${orcidLimpio}`];
  if (anio) {
    filtros.push(`publication_year:${anio}`);
  }

  const apiKey = apiKeyParam || process.env.OPENALEX_API_KEY;
  const params: Record<string, string | number | undefined> = {
    filter: filtros.join(","),
    per_page: 100,
  };
  if (apiKey) {
    params["api_key"] = apiKey;
  }

  const resp = await fetchJsonConReintentos<{ results: Record<string, unknown>[] }>(URL_OPENALEX_WORKS, {
    params,
  });

  if (!resp.data) {
    return { publicaciones: [], error: resp.error || `HTTP_${resp.status}` };
  }

  const results = resp.data.results || [];
  const publicaciones: PublicacionCandidata[] = [];

  for (const w of results) {
    const pub = mapearObraOpenAlex(w, profesor.id);
    if (pub) {
      publicaciones.push(pub);
    }
  }

  return { publicaciones };
}
