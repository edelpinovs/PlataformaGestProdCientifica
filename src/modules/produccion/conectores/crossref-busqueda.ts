import type { ProfesorParaEscaneo } from "../escaneo";
import type { PublicacionCandidata } from "../tipos";
import { limpiarDoi, limpiarTexto } from "../normalizacion";
import { formatearAutoresCrossref } from "./crossref";
import { fetchJsonConReintentos } from "./http";

type Autor = { ORCID?: string; given?: string; family?: string; name?: string };
type Obra = { DOI?: string; title?: string[]; type?: string; author?: Autor[]; "container-title"?: string[]; publisher?: string; ISSN?: string[]; ISBN?: string[]; published?: { "date-parts"?: number[][] }; issued?: { "date-parts"?: number[][] } };
const normalizarNombre = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const orcidLimpio = (texto: string) => texto.replace(/^https?:\/\/orcid.org\//i, "").toUpperCase();

export function coincideAutorCrossref(autores: Autor[], profesor: ProfesorParaEscaneo) {
  if (profesor.orcid && autores.some(a => a.ORCID && orcidLimpio(a.ORCID) === orcidLimpio(profesor.orcid!))) return true;
  // Un ORCID distinto explícito no se sustituye por una coincidencia de nombre.
  const palabras = normalizarNombre(`${profesor.nombres} ${profesor.apellidos}`).split(" ").filter(Boolean);
  return palabras.length >= 2 && autores.some(a => !a.ORCID && palabras.every(p => normalizarNombre(`${a.given ?? ""} ${a.family ?? ""} ${a.name ?? ""}`).split(" ").includes(p)));
}

export async function consultarCrossref(profesor: ProfesorParaEscaneo, desde?: number, hasta = desde): Promise<{ publicaciones: PublicacionCandidata[]; error?: string }> {
  if (!profesor.orcid && (!profesor.nombres?.trim() || !profesor.apellidos?.trim())) return { publicaciones: [], error: "FALTA_IDENTIFICADOR" };
  const publicaciones: PublicacionCandidata[] = [];
  let cursor = "*";
  const vistos = new Set<string>();
  const filtros = [profesor.orcid ? `orcid:${orcidLimpio(profesor.orcid)}` : "", desde ? `from-pub-date:${desde}-01-01` : "", hasta ? `until-pub-date:${hasta}-12-31` : ""].filter(Boolean).join(",");
  for (let pagina = 0; pagina < 1000; pagina++) {
    const respuesta = await fetchJsonConReintentos<{ message?: { items?: Obra[]; "next-cursor"?: string; "total-results"?: number } }>("https://api.crossref.org/works", { params: { filter: filtros, "query.author": profesor.orcid ? undefined : `${profesor.nombres} ${profesor.apellidos}`, rows: 100, cursor, mailto: process.env.CROSSREF_MAILTO } });
    const mensaje = respuesta.data?.message;
    if (!mensaje || !Array.isArray(mensaje.items)) return { publicaciones: [], error: respuesta.error ?? "RESPUESTA_INVALIDA" };
    for (const obra of mensaje.items) {
      if (!coincideAutorCrossref(obra.author ?? [], profesor)) continue;
      const titulo = limpiarTexto(obra.title?.[0] ?? "");
      if (!titulo) continue;
      const anio = (obra.published ?? obra.issued)?.["date-parts"]?.[0]?.[0];
      const partes = (obra.published ?? obra.issued)?.["date-parts"]?.[0];
      if (desde && (!anio || anio < desde || (hasta && anio > hasta))) continue;
      publicaciones.push({ profesorId: profesor.id, fuente: "CROSSREF", tipo: obra.type === "book" || obra.type === "monograph" ? "LIBRO" : obra.type === "book-chapter" ? "CAPITULO" : obra.type === "proceedings-article" ? "MEMORIA_CONGRESO" : obra.type === "journal-article" ? "ARTICULO" : "OTRO", titulo, doi: limpiarDoi(obra.DOI), autoresTexto: formatearAutoresCrossref(obra.author).join("; ") || "Autores no disponibles", revistaEditorial: obra["container-title"]?.[0] ?? obra.publisher ?? null, isbnIssn: obra.ISSN?.[0] ?? obra.ISBN?.[0] ?? null, anio: anio && anio >= 1900 && anio <= 2100 ? anio : null, fechaPublicacion: anio && anio >= 1900 && anio <= 2100 ? new Date(Date.UTC(anio,(partes?.[1] ?? 1)-1,partes?.[2] ?? 1)) : null });
    }
    if (!mensaje.items.length || mensaje.items.length < 100) return { publicaciones };
    const siguiente = mensaje["next-cursor"];
    if (!siguiente || siguiente === cursor || vistos.has(siguiente)) return { publicaciones: [], error: "PAGINACION_INCOMPLETA" };
    vistos.add(cursor); cursor = siguiente;
  }
  return { publicaciones: [], error: "PAGINACION_INCOMPLETA" };
}
