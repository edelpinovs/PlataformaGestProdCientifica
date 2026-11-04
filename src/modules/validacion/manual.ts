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

// Comprueba si una cadena YYYY-MM-DD corresponde a una fecha real del calendario gregoriano.
export function esFechaCalendarioValida(fechaStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaStr);
  if (!match) return false;
  const anio = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const dia = parseInt(match[3], 10);

  if (anio < 1900) return false;
  if (mes < 1 || mes > 12) return false;

  const esBisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const diasPorMes = [31, esBisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (dia < 1 || dia > diasPorMes[mes - 1]) return false;
  return true;
}

// Comprueba si una fecha YYYY-MM-DD es posterior a la fecha actual (local).
export function esFechaFutura(fechaStr: string, ahora: Date = new Date()): boolean {
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const hoyStr = `${anio}-${mes}-${dia}`;
  return fechaStr > hoyStr;
}

// RF-023: Define el estado inicial de la autoría al registrar manualmente.
// Si un docente registra su propia obra, entra VALIDADA al conteo oficial.
// Si un administrador o coordinador captura a nombre de un docente, entra como PENDIENTE
// para que el docente revise y confirme la autoría en su bandeja (RF-024).
export function determinarEstadoInicialAutoria(
  esDocenteAutor: boolean,
  ahora: Date = new Date(),
): { estado: "PENDIENTE" | "VALIDADA"; revisadaEn: Date | null } {
  if (esDocenteAutor) {
    return { estado: "VALIDADA", revisadaEn: ahora };
  }
  return { estado: "PENDIENTE", revisadaEn: null };
}

const sinTipo = "Elige un tipo de publicación.";
const sinProfesor = "Elige el profesor al que pertenece la autoría.";

export const publicacionManualEsquema = z.object({
  tipo: z.enum(TIPOS_PUBLICACION, { error: sinTipo }),
  titulo: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(3, "El título debe tener al menos 3 caracteres.")
        .max(500, "El título admite como máximo 500 caracteres."),
    ),
  autoresTexto: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(3, "Los autores son obligatorios y deben tener al menos 3 caracteres.")
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
        .refine(
          (val) => esFechaCalendarioValida(val),
          "La fecha de publicación no existe en el calendario.",
        )
        .refine(
          (val) => !esFechaFutura(val),
          "La fecha de publicación no puede ser posterior a la fecha actual.",
        )
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
        .refine(
          (val) => /^https?:\/\//i.test(val),
          "La URL de evidencia debe iniciar con http:// o https://.",
        )
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
