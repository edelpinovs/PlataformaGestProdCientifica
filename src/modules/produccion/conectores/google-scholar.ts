import type { ProfesorParaEscaneo } from "../escaneo";
import type { PublicacionCandidata } from "../tipos";
import { limpiarTexto } from "../normalizacion";
import { fetchJsonConReintentos } from "./http";

type Articulo = { title?: string; authors?: string; publication?: string; year?: string | number; link?: string };

/** SerpAPI por perfil verificado; nunca consulta Scholar directamente ni sigue enlaces del resultado. */
export async function consultarGoogleScholar(profesor: ProfesorParaEscaneo, desde?: number, hasta = desde, clave = process.env.SERPAPI_API_KEY): Promise<{ publicaciones: PublicacionCandidata[]; error?: string }> {
  if (!profesor.scholarId || !/^[\w-]+$/.test(profesor.scholarId)) return { publicaciones: [], error: "FALTA_IDENTIFICADOR" };
  if (!clave) return { publicaciones: [], error: "NO_API_KEY" };
  const publicaciones: PublicacionCandidata[] = [];
  const vistos = new Set<number>();
  let inicio = 0;
  for (let pagina = 0; pagina < 250; pagina++) {
    const respuesta = await fetchJsonConReintentos<{ error?: string; articles?: Articulo[]; serpapi_pagination?: { next?: string } }>("https://serpapi.com/search.json", { params: { engine: "google_scholar_author", author_id: profesor.scholarId, api_key: clave, sort: "pubdate", num: 100, start: inicio }, maxReintentos: 1 });
    if (respuesta.error || respuesta.data?.error || !Array.isArray(respuesta.data?.articles)) return { publicaciones: [], error: respuesta.error ?? "CONSULTA_FALLIDA" };
    const articulos = respuesta.data.articles;
    for (const articulo of articulos) {
      const titulo = limpiarTexto(articulo.title ?? "");
      if (!titulo) continue;
      const anio = /^\d{4}$/.test(String(articulo.year ?? "")) ? Number(articulo.year) : null;
      if (desde && (!anio || anio < desde || (hasta && anio > hasta))) continue;
      if (hasta && anio && anio > hasta) continue;
      // Scholar no proporciona aquí un tipo fiable; se conserva como «Otro» para revisar.
      publicaciones.push({ profesorId: profesor.id, fuente: "GOOGLE_SCHOLAR", tipo: "OTRO", titulo, autoresTexto: limpiarTexto(articulo.authors ?? "Autores no disponibles"), revistaEditorial: limpiarTexto(articulo.publication ?? ""), anio: anio && anio >= 1900 && anio <= 2100 ? anio : null, fechaPublicacion: anio && anio >= 1900 && anio <= 2100 ? new Date(Date.UTC(anio,0,1)) : null });
    }
    if (!articulos.length || !respuesta.data.serpapi_pagination?.next || (desde && articulos.every(a => /^\d{4}$/.test(String(a.year ?? "")) && Number(a.year) < desde))) return { publicaciones };
    // Solo se usa el desplazamiento; nunca se envía la clave a una URL retornada por terceros.
    let siguiente: number;
    try { const url = new URL(respuesta.data.serpapi_pagination.next); siguiente = Number(url.searchParams.get("start") ?? url.searchParams.get("cstart")); } catch { return { publicaciones: [], error: "PAGINACION_INCOMPLETA" }; }
    if (!Number.isSafeInteger(siguiente) || siguiente <= inicio || vistos.has(siguiente)) return { publicaciones: [], error: "PAGINACION_INCOMPLETA" };
    vistos.add(inicio); inicio = siguiente;
  }
  return { publicaciones: [], error: "PAGINACION_INCOMPLETA" };
}
