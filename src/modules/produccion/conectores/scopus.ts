// Conector para la API de Scopus (Elsevier) - RF-020.
import { limpiarDoi, limpiarTexto, normalizarIssnIsbn } from "../normalizacion";
import type { PublicacionCandidata, TipoPublicacion } from "../tipos";
import { fetchJsonConReintentos } from "./http";

const URL_BUSQUEDA_SCOPUS = "https://api.elsevier.com/content/search/scopus";
const URL_AUTOR_SCOPUS = "https://api.elsevier.com/content/author/author_id";

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
 * Texto de un campo de Scopus, que puede llegar como texto, número, objeto `{ "$": valor }`
 * o lista de esos objetos (así llega `prism:isbn` en libros y memorias, #396).
 * De una lista toma el primer valor con contenido; cualquier otra forma se lee como vacía.
 */
export function textoScopus(valor: unknown): string {
  if (typeof valor === "string") return limpiarTexto(valor);
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      const texto = textoScopus(elemento);
      if (texto) return texto;
    }
    return "";
  }
  if (typeof valor === "object" && valor !== null && "$" in valor) return textoScopus((valor as Record<string, unknown>)["$"]);
  return "";
}

/**
 * Transforma un elemento 'entry' devuelto por la API de Scopus en un PublicacionCandidata estándar.
 */
export function mapearEntradaScopus(
  entry: Record<string, unknown>,
  profesorId: number,
): PublicacionCandidata | null {
  const titulo = textoScopus(entry["dc:title"]);
  if (!titulo) return null;

  const doi = limpiarDoi(textoScopus(entry["prism:doi"]));
  const tipo = mapearTipoScopus(textoScopus(entry["subtypeDescription"]));

  // Extraer autores
  const listaAutores: string[] = [];
  const autorPrincipal = textoScopus(entry["dc:creator"]);
  if (autorPrincipal) {
    listaAutores.push(autorPrincipal);
  }

  const rawAuthor = entry["author"];
  if (Array.isArray(rawAuthor)) {
    for (const a of rawAuthor) {
      if (typeof a === "object" && a !== null) {
        const nombre = textoScopus((a as Record<string, unknown>)["authname"]);
        if (nombre && !listaAutores.includes(nombre)) {
          listaAutores.push(nombre);
        }
      }
    }
  }

  const autoresTexto = listaAutores.length > 0 ? listaAutores.join("; ") : autorPrincipal || "Desconocido";

  // Fecha y año
  const coverDate = textoScopus(entry["prism:coverDate"]);
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
  const revista = textoScopus(entry["prism:publicationName"]) || null;
  const issn = normalizarIssnIsbn(
    textoScopus(entry["prism:issn"]) || textoScopus(entry["prism:eIssn"]) || textoScopus(entry["prism:isbn"]),
  );

  // Citas
  let citas: number | undefined;
  const citasTexto = textoScopus(entry["citedby-count"]);
  if (citasTexto) {
    const parsed = parseInt(citasTexto, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      citas = parsed;
    }
  }

  const volumen = textoScopus(entry["prism:volume"]) || null;
  const paginas = textoScopus(entry["prism:pageRange"]) || null;

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
  const publicaciones: PublicacionCandidata[] = [];
  let start = 0;
  // Algunas claves limitan el tamaño de página según su nivel de servicio.
  // La paginación permite recuperar todas las obras con páginas de 25.
  const count = 25;
  let totalResultados = Infinity;

  while (start < totalResultados) {
    const resp = await fetchJsonConReintentos<Record<string, unknown>>(URL_BUSQUEDA_SCOPUS, {
      params: {
        query,
        count,
        start,
      },
      headers: {
        "X-ELS-APIKey": apiKey,
      },
    });

    if (!resp.data) {
      if (publicaciones.length > 0) break;
      return { publicaciones: [], error: resp.error || `HTTP_${resp.status}` };
    }

    const searchResults = (resp.data["search-results"] as Record<string, unknown>) || {};
    const totalRaw = searchResults["opensearch:totalResults"];
    if (totalRaw !== undefined) {
      totalResultados = parseInt(String(totalRaw), 10) || 0;
    }

    const entries = (searchResults["entry"] as Record<string, unknown>[]) || [];
    if (entries.length === 0) break;

    for (const e of entries) {
      if (typeof e !== "object" || e === null || e["error"]) continue;
      // Una entrada con una forma inesperada se omite sin perder el resto de la fuente (#396).
      let pub: PublicacionCandidata | null = null;
      try { pub = mapearEntradaScopus(e, profesor.id); } catch { pub = null; }
      if (pub) {
        publicaciones.push(pub);
      }
    }

    start += entries.length;
  }

  return { publicaciones };
}

/**
 * Consulta el índice H de un autor en Scopus a partir de su Scopus ID (RF-020).
 * Replica la función indice_h() de scripts/reporte_unificado.py.
 */
export async function consultarIndiceH(
  scopusId: string,
  apiKeyParam?: string,
  cache?: Map<string, number | null>,
): Promise<{ indiceH: number | null; error?: string }> {
  const scopusIdLimpio = scopusId.replace(/\.0$/, "").trim();
  if (!scopusIdLimpio) {
    return { indiceH: null };
  }

  if (cache?.has(scopusIdLimpio)) {
    return { indiceH: cache.get(scopusIdLimpio) ?? null };
  }

  const apiKey = apiKeyParam || process.env.SCOPUS_API_KEY;
  if (!apiKey) {
    return { indiceH: null, error: "NO_API_KEY" };
  }

  const url = `${URL_AUTOR_SCOPUS}/${encodeURIComponent(scopusIdLimpio)}`;
  const resp = await fetchJsonConReintentos<Record<string, unknown>>(url, {
    headers: {
      "X-ELS-APIKey": apiKey,
    },
  });

  if (!resp.data) {
    cache?.set(scopusIdLimpio, null);
    return { indiceH: null, error: resp.error || `HTTP_${resp.status}` };
  }

  const responseArray = resp.data["author-retrieval-response"] as Record<string, unknown>[] | undefined;
  const first = Array.isArray(responseArray) && responseArray.length > 0 ? responseArray[0] : undefined;
  const rawH = first?.["h-index"];

  let indiceH: number | null = null;
  if (rawH !== undefined && rawH !== null) {
    const parsed = parseInt(String(rawH), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      indiceH = parsed;
    }
  }

  cache?.set(scopusIdLimpio, indiceH);
  return { indiceH };
}

