import { z } from "zod";

// Tipos de publicación admitidos por el modelo de datos (RF-023 · CU-012).
export const TIPOS_PUBLICACION = [
  "ARTICULO",
  "LIBRO",
  "CAPITULO",
  "MEMORIA_CONGRESO",
  "REGISTRO_SOFTWARE",
  "PATENTE",
  "OTRO",
] as const;

export type TipoPublicacion = (typeof TIPOS_PUBLICACION)[number];

export const ETIQUETAS_TIPO: Record<TipoPublicacion, string> = {
  ARTICULO: "Artículo en revista",
  LIBRO: "Libro",
  CAPITULO: "Capítulo de libro",
  MEMORIA_CONGRESO: "Memoria de congreso",
  REGISTRO_SOFTWARE: "Registro de software",
  PATENTE: "Patente",
  OTRO: "Otro",
};

export function limpiar(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

// Normaliza para comparación de títulos: sin acentos, sin mayúsculas, espacios colapsados.
export function normalizar(s: string): string {
  return limpiar(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Normaliza un identificador DOI quitando prefijos de URL o espacios.
export function normalizarDoi(doi?: string | null): string | null {
  if (!doi) return null;
  const limpio = limpiar(doi);
  if (!limpio) return null;
  const sinPrefijo = limpio
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  return sinPrefijo.toLowerCase() || null;
}

const sinTipo = "Elige un tipo de publicación.";
const sinTitulo = "El título es obligatorio.";
const sinAutores = "Los autores son obligatorios.";
const sinProfesor = "Elige el profesor al que pertenece la autoría.";

export const publicacionManualEsquema = z.object({
  tipo: z.enum(TIPOS_PUBLICACION, { error: sinTipo }),
  titulo: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(1, sinTitulo)
        .min(3, "El título debe tener al menos 3 caracteres.")
        .max(500, "El título admite como máximo 500 caracteres."),
    ),
  autoresTexto: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(1, sinAutores)
        .min(3, "Indica al menos un autor con al menos 3 caracteres.")
        .max(500, "La lista de autores admite como máximo 500 caracteres."),
    ),
  fechaPublicacion: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD.")
        .optional(),
    ),
  revistaEditorial: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(z.string().max(250, "La revista o editorial admite como máximo 250 caracteres.").optional()),
  isbnIssn: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(z.string().max(50, "El ISBN o ISSN admite como máximo 50 caracteres.").optional()),
  doi: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? normalizarDoi(s) ?? undefined : undefined))
    .pipe(
      z
        .string()
        .max(100, "El DOI admite como máximo 100 caracteres.")
        .refine(
          (val) => !val || /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(val),
          "El DOI debe tener un formato válido (ej. 10.1000/182).",
        )
        .optional(),
    ),
  volumen: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(z.string().max(50, "El volumen admite como máximo 50 caracteres.").optional()),
  paginas: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(z.string().max(50, "Las páginas admiten como máximo 50 caracteres.").optional()),
  evidenciaUrl: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(
      z
        .string()
        .url("La URL de evidencia debe ser un enlace válido (ej. https://...).")
        .max(500, "La URL de evidencia admite como máximo 500 caracteres.")
        .optional(),
    ),
  profesorId: z.coerce
    .number({ error: sinProfesor })
    .int(sinProfesor)
    .positive(sinProfesor),
});

export type PublicacionManualDatos = z.infer<typeof publicacionManualEsquema>;

export type PublicacionExistente = {
  id?: number;
  doi?: string | null;
  tituloNormalizado: string;
  autorias?: { profesorId: number }[];
};

export type ContextoValidacionManual = {
  profesores: { id: number; nombres: string; apellidos: string }[];
  publicacionesExistentes: PublicacionExistente[];
};

export type ProblemaManual = {
  campo: keyof PublicacionManualDatos | "general";
  mensaje: string;
};

// RF-023: Valida duplicados por DOI (único en el sistema) y por título (único para el profesor).
export function revisarPublicacionManual(
  nuevo: PublicacionManualDatos,
  contexto: ContextoValidacionManual,
  idPropio?: number,
): ProblemaManual | null {
  const profesor = contexto.profesores.find((p) => p.id === nuevo.profesorId);
  if (!profesor) {
    return {
      campo: "profesorId",
      mensaje: "El profesor seleccionado no existe en el directorio.",
    };
  }

  const existentes =
    idPropio === undefined
      ? contexto.publicacionesExistentes
      : contexto.publicacionesExistentes.filter((p) => p.id !== idPropio);

  // 1. DOI único si se proporciona
  if (nuevo.doi) {
    const doiBuscado = normalizarDoi(nuevo.doi);
    const porDoi = existentes.find((p) => normalizarDoi(p.doi) === doiBuscado);
    if (porDoi) {
      return {
        campo: "doi",
        mensaje: `Ya existe una publicación registrada con el DOI «${nuevo.doi}».`,
      };
    }
  }

  // 2. Título no duplicado para el mismo profesor
  const nuevoTituloNormalizado = normalizar(nuevo.titulo);
  const porTituloProfesor = existentes.find(
    (p) =>
      p.tituloNormalizado === nuevoTituloNormalizado &&
      p.autorias?.some((a) => a.profesorId === nuevo.profesorId),
  );

  if (porTituloProfesor) {
    return {
      campo: "titulo",
      mensaje: "El profesor ya tiene registrada una publicación con este mismo título.",
    };
  }

  return null;
}

// Control de eliminación para publicaciones (regla #59)
export function motivoNoEliminablePublicacion(
  titulo: string,
  autoriasCount: number,
  esFuenteManual: boolean,
): string | null {
  if (!esFuenteManual) {
    return `No se puede eliminar «${titulo}»: proviene de escaneo automático. Usa Rechazar por homónimo.`;
  }
  if (autoriasCount > 1) {
    return `No se puede eliminar «${titulo}»: está vinculada a múltiples profesores.`;
  }
  return null;
}
