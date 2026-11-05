// Conector para la API de Crossref (https://api.crossref.org) - RF-020.
// Permite consultar metadatos por DOI y enriquecer la lista completa de autores
// cuando Scopus solo entrega el primer autor en vista estándar (dc:creator) o en fuentes incompletas.

import { limpiarDoi, limpiarTexto } from "../normalizacion";
import type { PublicacionCandidata } from "../tipos";
import { fetchJsonConReintentos } from "./http";

const URL_CROSSREF_WORKS = "https://api.crossref.org/works";

export type AutorCrossref = {
  family?: string;
  given?: string;
  name?: string;
  sequence?: string;
};

export type RespuestaObraCrossref = {
  status: string;
  message?: {
    title?: string[];
    author?: AutorCrossref[];
    DOI?: string;
    type?: string;
    "container-title"?: string[];
    publisher?: string;
    published?: {
      "date-parts"?: (number | null)[][];
    };
    issued?: {
      "date-parts"?: (number | null)[][];
    };
    ISSN?: string[];
    ISBN?: string[];
  };
};

/**
 * Formatea una lista de autores provenientes de Crossref a formato estándar "Apellido, Nombre"
 * separados por punto y coma, replicando la lógica de scripts/autor.py y scripts/reporte_unificado.py.
 */
export function formatearAutoresCrossref(autoresRaw?: unknown[]): string[] {
  if (!Array.isArray(autoresRaw)) return [];

  const nombres: string[] = [];

  for (const item of autoresRaw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;

    const family = limpiarTexto(typeof a["family"] === "string" ? a["family"] : "");
    const given = limpiarTexto(typeof a["given"] === "string" ? a["given"] : "");
    const name = limpiarTexto(typeof a["name"] === "string" ? a["name"] : "");

    let formateado = "";
    if (family && given) {
      formateado = `${family}, ${given}`;
    } else if (family) {
      formateado = family;
    } else if (given) {
      formateado = given;
    } else if (name) {
      formateado = name;
    }

    if (formateado && !nombres.includes(formateado)) {
      nombres.push(formateado);
    }
  }

  return nombres;
}

/**
 * Consulta la API de Crossref para un DOI específico y obtiene la lista de autores completa.
 */
export async function consultarAutoresPorDoi(
  doi: string,
  cache?: Map<string, string>,
  mailtoParam?: string,
): Promise<{ autores: string[]; autoresTexto: string; error?: string }> {
  const doiLimpio = limpiarDoi(doi);
  if (!doiLimpio) {
    return { autores: [], autoresTexto: "" };
  }

  // Comprobar en caché si fue provista
  if (cache?.has(doiLimpio)) {
    const cached = cache.get(doiLimpio)!;
    return {
      autores: cached ? cached.split("; ") : [],
      autoresTexto: cached,
    };
  }

  const mailto = mailtoParam || process.env.CROSSREF_MAILTO || process.env.OPENALEX_EMAIL;
  const params: Record<string, string | undefined> = {};
  if (mailto) {
    params["mailto"] = mailto;
  }

  const url = `${URL_CROSSREF_WORKS}/${encodeURIComponent(doiLimpio)}`;
  const resp = await fetchJsonConReintentos<RespuestaObraCrossref>(url, {
    params,
    headers: {
      "User-Agent": mailto ? `PGPC-Escaneo/1.0 (mailto:${mailto})` : "PGPC-Escaneo/1.0",
    },
  });

  if (!resp.data || !resp.data.message) {
    return {
      autores: [],
      autoresTexto: "",
      error: resp.error || `HTTP_${resp.status}`,
    };
  }

  const autores = formatearAutoresCrossref(resp.data.message.author);
  const autoresTexto = autores.join("; ");

  if (cache && autoresTexto) {
    cache.set(doiLimpio, autoresTexto);
  }

  return { autores, autoresTexto };
}

/**
 * Determina si una publicación candidata se beneficiaría de enriquecer sus autores vía Crossref.
 * Esto ocurre principalmente cuando:
 * 1. Tiene DOI válido.
 * 2. La fuente es SCOPUS en vista estándar (donde solo viene un autor) o sus autores dicen "Desconocido" o no tiene punto y coma (un solo autor).
 */
export function requiereEnriquecimientoAutores(pub: PublicacionCandidata): boolean {
  if (!pub.doi || !limpiarDoi(pub.doi)) return false;
  if (!pub.autoresTexto || pub.autoresTexto === "Desconocido") return true;

  // Si proviene de Scopus y no tiene múltiples autores separados por punto y coma, es muy probable
  // que Scopus haya venido en vista STANDARD (solo dc:creator)
  if (pub.fuente === "SCOPUS" && !pub.autoresTexto.includes(";")) {
    return true;
  }

  return false;
}

/**
 * Enriquece los autores de una publicación candidata usando Crossref si aplica.
 * Devuelve true si los autores fueron enriquecidos.
 */
export async function enriquecerPublicacionConCrossref(
  pub: PublicacionCandidata,
  cache?: Map<string, string>,
  mailto?: string,
): Promise<boolean> {
  if (!requiereEnriquecimientoAutores(pub) || !pub.doi) return false;

  const res = await consultarAutoresPorDoi(pub.doi, cache, mailto);
  if (res.autoresTexto && res.autores.length > 0) {
    // Si teníamos un solo autor y Crossref devuelve más, o no teníamos autores
    pub.autoresTexto = res.autoresTexto;
    return true;
  }

  return false;
}

/**
 * Enriquece un lote de publicaciones candidatas en memoria con control de concurrencia.
 * Reutiliza una caché en memoria para no repetir consultas al mismo DOI.
 */
export async function enriquecerLoteConCrossref(
  publicaciones: PublicacionCandidata[],
  opciones?: {
    cache?: Map<string, string>;
    concurrencia?: number;
    mailto?: string;
  },
): Promise<number> {
  const cache = opciones?.cache ?? new Map<string, string>();
  const concurrencia = Math.max(1, Math.min(opciones?.concurrencia ?? 5, 10));
  let enriquecidas = 0;

  // Filtrar las publicaciones que requieren enriquecimiento
  const candidatas = publicaciones.filter(requiereEnriquecimientoAutores);

  for (let i = 0; i < candidatas.length; i += concurrencia) {
    const bloque = candidatas.slice(i, i + concurrencia);
    const resultados = await Promise.all(
      bloque.map((p) => enriquecerPublicacionConCrossref(p, cache, opciones?.mailto)),
    );
    enriquecidas += resultados.filter(Boolean).length;
  }

  return enriquecidas;
}

