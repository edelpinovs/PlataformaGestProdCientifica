import { z } from "zod";

export const FUENTES_ESCANEO = ["ORCID", "OPENALEX", "SCOPUS", "CROSSREF", "GOOGLE_SCHOLAR"] as const;
export type FuenteEscaneo = typeof FUENTES_ESCANEO[number];
export const FUENTES_ANTERIORES: FuenteEscaneo[] = ["SCOPUS", "OPENALEX", "ORCID"];
/** Marcadas al abrir el formulario (#188): las tres fuentes anteriores; Crossref y Google Scholar son opcionales. */
export const FUENTES_POR_OMISION: FuenteEscaneo[] = FUENTES_ESCANEO.filter(fuente => FUENTES_ANTERIORES.includes(fuente));
export const NOMBRES_FUENTE: Record<FuenteEscaneo,string> = { ORCID: "ORCID", OPENALEX: "OpenAlex", SCOPUS: "Scopus", CROSSREF: "Crossref", GOOGLE_SCHOLAR: "Google Scholar" };
export const seleccionFuentesEsquema = z.array(z.enum(FUENTES_ESCANEO, { error: "Selecciona una fuente válida." }), { error: "Selecciona las fuentes de búsqueda." })
  .min(1, "Selecciona al menos una fuente para iniciar la búsqueda.").max(50, "La selección de fuentes es demasiado larga.")
  .transform(valores => FUENTES_ESCANEO.filter(f => valores.includes(f)));

/** Casilla «Completar autores por DOI con Crossref» (#188): presente con «si», ausente si no se marcó. */
export const opcionEnriquecerEsquema = z.literal("si", { error: "La opción para completar autores no es válida." }).nullish()
  .transform(valor => valor === "si");

/**
 * Completar autores por DOI es independiente de elegir Crossref como fuente de obras (#188).
 * Un trabajo guardado antes de separar ambas opciones conserva su comportamiento: enriquecía solo con Crossref elegido.
 */
export function debeEnriquecerAutores(datos: { fuentes?: FuenteEscaneo[]; enriquecerAutores?: boolean }): boolean {
  return datos.enriquecerAutores ?? (datos.fuentes ?? FUENTES_ANTERIORES).includes("CROSSREF");
}

export const consultaFuenteEsquema = z.object({
  profesorId: z.number({ error: "El profesor de la consulta no es válido." }).int().positive(),
  fuente: z.enum(FUENTES_ESCANEO, { error: "La fuente de la consulta no es válida." }),
  estado: z.enum(["NO_SELECCIONADA", "SIN_RESULTADOS", "COMPLETADA", "INCIDENCIA"], { error: "El estado de la consulta no es válido." }),
  cantidad: z.number({ error: "La cantidad no es válida." }).int().nonnegative(),
});
export type ConsultaFuente = z.infer<typeof consultaFuenteEsquema>;
