// Conector para la API de Scopus (Elsevier) - RF-020.
import { limpiarDoi, limpiarTexto, normalizarIssnIsbn } from "../normalizacion";
import type { PublicacionCandidata, TipoPublicacion } from "../tipos";
import { fetchJsonConReintentos } from "./http";

const URL_BUSQUEDA_SCOPUS = "https://api.elsevier.com/content/search/scopus";

/**
 * Mapea el subtipo de documento de Scopus a TipoPublicacion del modelo del sistema.
 */
export function mapearTipoScopus(subtipo?: string | null): TipoPublicacion {
  const norm = (subtipo || "").toLowerCase();
  if (norm.includes("article") || norm.includes("review") || norm.includes("short survey") || norm.includes("editorial")) {
    return "ARTICULO";
  }
  if (norm.includes("conference") || norm.includes("proceeding")) {
    return "MEMORIA_CONGRESO";
  }
  if (norm.includes("book chapter")) {
    return "CAPITULO";
  }
  if (norm.includes("book")) {
    return "LIBRO";
  }
  if (norm.includes("patent")) {
    return "PATENTE";
  }
  return "OTRO";
}

/**
 * Transforma un elemento 'entry' devuelto por la API de Scopus en un PublicacionCandidata estándar.
 */
export function mapearEntradaScopus(
  entry: Record<string, unknown>,
  profesorId: number,
): PublicacionCandidata | null {
  const titulo = limpiarTexto(entry["dc:title"] as string);
  if (!titulo) return null;

  const doi = limpiarDoi(entry["prism:doi"] as string);
  const tipo = mapearTipoScopus(entry["subtypeDescription"] as string);

  // Extraer autores
  const listaAutores: string[] = [];
  const autorPrincipal = limpiarTexto(entry["dc:creator"] as string);
  if (autorPrincipal) {
    listaAutores.push(autorPrincipal);
  }

  const rawAuthor = entry["author"];
  if (Array.isArray(rawAuthor)) {
    for (const a of rawAuthor) {
      if (typeof a === "object" && a !== null) {
        const nombre = limpiarTexto((a as Record<string, unknown>)["authname"] as string);
        if (nombre && !listaAutores.includes(nombre)) {
          listaAutores.push(nombre);
        }
      }
    }
  }

  const autoresTexto = listaAutores.length > 0 ? listaAutores.join("; ") : autorPrincipal || "Desconocido";

  // Fecha y año
  const coverDate = limpiarTexto(entry["prism:coverDate"] as string);
  let fechaPublicacion: Date | null = null;
  let anio: number | null = null;
  if (coverDate) {
    fechaPublicacion = new Date(coverDate);
    if (!isNaN(fechaPublicacion.getTime())) {
      anio = fechaPublicacion.getUTCFullYear();
    } else {
      fechaPublicacion = null;
    }
  }

  // Revista, ISSN e ISBN
  const revista = limpiarTexto(entry["prism:publicationName"] as string) || null;
  const issn = normalizarIssnIsbn(
    (entry["prism:issn"] as string) || (entry["prism:eIssn"] as string) || (entry["prism:isbn"] as string),
  );

  // Citas
  let citas: number | undefined;
  if (entry["citedby-count"]) {
    const parsed = parseInt(String(entry["citedby-count"]), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      citas = parsed;
    }
  }

  const volumen = limpiarTexto(entry["prism:volume"] as string) || null;
  const paginas = limpiarTexto(entry["prism:pageRange"] as string) || null;

  return {
    tipo,
    titulo,
    doi,
    autoresTexto,
    revistaEditorial: revista,
    isbnIssn: issn,
    fechaPublicacion,
    anio,
    volumen,
    paginas,
    fuente: "SCOPUS",
    profesorId,
    citas,
  };
}

/**
 * Consulta la API de Scopus para un profesor dado por su scopusId o orcid, filtrando opcionalmente por año.
 */
export async function consultarScopus(
  profesor: { id: number; scopusId?: string | null; orcid?: string | null },
  anio?: number,
  apiKeyParam?: string,
): Promise<{ publicaciones: PublicacionCandidata[]; error?: string }> {
  const apiKey = apiKeyParam || process.env.SCOPUS_API_KEY;
  if (!apiKey) {
    return { publicaciones: [], error: "NO_API_KEY" };
  }

  const consultas: string[] = [];
  if (profesor.scopusId) {
    const scopusIdLimpio = profesor.scopusId.replace(/\.0$/, "").trim();
    const filtroAnio = anio ? ` AND PUBYEAR = ${anio}` : "";
    consultas.push(`AU-ID(${scopusIdLimpio})${filtroAnio}`);
  } else if (profesor.orcid) {
    const filtroAnio = anio ? ` AND PUBYEAR = ${anio}` : "";
    consultas.push(`ORCID(${profesor.orcid})${filtroAnio}`);
  }

  if (consultas.length === 0) {
    return { publicaciones: [] };
  }

  const query = consultas[0];
  const resp = await fetchJsonConReintentos<Record<string, unknown>>(URL_BUSQUEDA_SCOPUS, {
    params: {
      query,
      count: 100,
      start: 0,
    },
    headers: {
      "X-ELS-APIKey": apiKey,
    },
  });

  if (!resp.data) {
    return { publicaciones: [], error: resp.error || `HTTP_${resp.status}` };
  }

  const searchResults = (resp.data["search-results"] as Record<string, unknown>) || {};
  const entries = (searchResults["entry"] as Record<string, unknown>[]) || [];

  const publicaciones: PublicacionCandidata[] = [];
  for (const e of entries) {
    if (e["error"]) continue;
    const pub = mapearEntradaScopus(e, profesor.id);
    if (pub) {
      publicaciones.push(pub);
    }
  }

  return { publicaciones };
}
