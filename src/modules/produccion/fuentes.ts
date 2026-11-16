import { z } from "zod";

export const FUENTES_ESCANEO = ["ORCID", "OPENALEX", "SCOPUS", "CROSSREF", "GOOGLE_SCHOLAR"] as const;
export type FuenteEscaneo = typeof FUENTES_ESCANEO[number];
export const FUENTES_ANTERIORES: FuenteEscaneo[] = ["SCOPUS", "OPENALEX", "ORCID"];
export const NOMBRES_FUENTE: Record<FuenteEscaneo,string> = { ORCID: "ORCID", OPENALEX: "OpenAlex", SCOPUS: "Scopus", CROSSREF: "Crossref", GOOGLE_SCHOLAR: "Google Scholar" };
export const seleccionFuentesEsquema = z.array(z.enum(FUENTES_ESCANEO, { error: "Selecciona una fuente válida." }), { error: "Selecciona las fuentes de búsqueda." })
  .min(1, "Selecciona al menos una fuente para iniciar la búsqueda.").max(50, "La selección de fuentes es demasiado larga.")
  .transform(valores => FUENTES_ESCANEO.filter(f => valores.includes(f)));

export const consultaFuenteEsquema = z.object({
  profesorId: z.number({ error: "El profesor de la consulta no es válido." }).int().positive(),
  fuente: z.enum(FUENTES_ESCANEO, { error: "La fuente de la consulta no es válida." }),
  estado: z.enum(["NO_SELECCIONADA", "SIN_RESULTADOS", "COMPLETADA", "INCIDENCIA"], { error: "El estado de la consulta no es válido." }),
  cantidad: z.number({ error: "La cantidad no es válida." }).int().nonnegative(),
});
export type ConsultaFuente = z.infer<typeof consultaFuenteEsquema>;
