import { z } from "zod";

// Tipos base coincidentes con el esquema Prisma (prisma/schema.prisma)
export const tipoPublicacionEnum = z.enum([
  "ARTICULO",
  "LIBRO",
  "CAPITULO",
  "MEMORIA_CONGRESO",
  "REGISTRO_SOFTWARE",
  "PATENTE",
  "OTRO",
]);

export type TipoPublicacion = z.infer<typeof tipoPublicacionEnum>;

export const fuentePublicacionEnum = z.enum([
  "ORCID",
  "SCOPUS",
  "OPENALEX",
  "GOOGLE_SCHOLAR",
  "MANUAL",
]);

export type FuentePublicacion = z.infer<typeof fuentePublicacionEnum>;

export const estadoAutoriaEnum = z.enum(["PENDIENTE", "VALIDADA", "RECHAZADA"]);

export type EstadoAutoria = z.infer<typeof estadoAutoriaEnum>;

// Esquema Zod de validación para una publicación extraída o candidata
export const publicacionCandidataSchema = z.object({
  tipo: tipoPublicacionEnum.default("ARTICULO"),
  titulo: z.string().min(1, "El título es obligatorio."),
  doi: z.string().nullable().optional(),
  autoresTexto: z.string().min(1, "Se requiere al menos un autor."),
  revistaEditorial: z.string().nullable().optional(),
  isbnIssn: z.string().nullable().optional(),
  fechaPublicacion: z.coerce.date().nullable().optional(),
  anio: z.number().int().min(1900).max(2100).nullable().optional(),
  volumen: z.string().nullable().optional(),
  paginas: z.string().nullable().optional(),
  evidenciaUrl: z.string().url().nullable().optional().or(z.literal("")),
  fuente: fuentePublicacionEnum,
  profesorId: z.number().int().positive("El ID del profesor debe ser positivo."),
  // Metadatos auxiliares de extracción
  citas: z.number().int().nonnegative().optional(),
  cuartil: z.string().optional(),
});

export type PublicacionCandidata = z.infer<typeof publicacionCandidataSchema>;

// Representación de una publicación consolidada tras deduplicar múltiples fuentes o profesores
export type PublicacionConsolidada = {
  id?: number;
  tipo: TipoPublicacion;
  titulo: string;
  tituloNormalizado: string;
  doi: string | null;
  autoresTexto: string;
  revistaEditorial: string | null;
  isbnIssn: string | null;
  fechaPublicacion: Date | null;
  anio: number | null;
  volumen: string | null;
  paginas: string | null;
  evidenciaUrl: string | null;
  fuentePrincipal: FuentePublicacion;
  fuentesDetectadas: FuentePublicacion[];
  profesoresIds: number[];
  citas?: number;
  cuartil?: string;
};

// Resultado de comprobación de duplicados
export type ResultadoCoincidencia = {
  esDuplicado: boolean;
  motivo: "DOI_EXACTO" | "TITULO_SIMILITUD" | "TITULO_EXACTO" | null;
  similitud: number;
  publicacionExistenteId?: number;
};
