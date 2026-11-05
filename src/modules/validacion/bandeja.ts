import { z } from "zod";
import { limpiar, normalizarDoi, TIPOS_PUBLICACION } from "./manual";

export const ESTADOS_AUTORIA = ["PENDIENTE", "VALIDADA", "RECHAZADA"] as const;
export type EstadoAutoria = (typeof ESTADOS_AUTORIA)[number];

export const FUENTES_PUBLICACION = [
  "ORCID",
  "SCOPUS",
  "OPENALEX",
  "GOOGLE_SCHOLAR",
  "MANUAL",
] as const;
export type FuentePublicacion = (typeof FUENTES_PUBLICACION)[number];

export const ETIQUETA_ESTADO_AUTORIA: Record<EstadoAutoria, string> = {
  PENDIENTE: "Pendiente de validación",
  VALIDADA: "Validada (conteo oficial)",
  RECHAZADA: "Rechazada por homónimo",
};

export const ETIQUETA_FUENTE: Record<FuentePublicacion, string> = {
  ORCID: "ORCID",
  SCOPUS: "Scopus",
  OPENALEX: "OpenAlex",
  GOOGLE_SCHOLAR: "Google Scholar",
  MANUAL: "Captura manual",
};

// RF-024 / Permisos (RNF-005): El docente solo puede gestionar sus propias autorías.
// Administrador y coordinador tienen permiso de gestión global.
export type PerfilGestion = {
  rol: string;
  profesorId?: number | null;
};

export function puedeGestionarAutoria(
  perfil: PerfilGestion,
  profesorIds: number | number[],
): boolean {
  if (perfil.rol === "ADMINISTRADOR" || perfil.rol === "COORDINADOR") {
    return true;
  }
  if (perfil.rol === "DOCENTE") {
    if (!perfil.profesorId) return false;
    const ids = Array.isArray(profesorIds) ? profesorIds : [profesorIds];
    return ids.includes(perfil.profesorId);
  }
  return false;
}

// RF-024 / RF-025: Validación de transiciones de estado de autoría (CU-013).
export function validarTransicionAutoria(
  estadoActual: EstadoAutoria,
  nuevoEstado: EstadoAutoria,
): { valida: boolean; motivo?: string } {
  if (estadoActual === nuevoEstado) {
    return { valida: true };
  }

  if (estadoActual === "PENDIENTE") {
    if (nuevoEstado === "VALIDADA" || nuevoEstado === "RECHAZADA") {
      return { valida: true };
    }
  }

  // Permitir reevaluar si fue rechazada por error o desvalidar si hace falta
  if (estadoActual === "RECHAZADA" && nuevoEstado === "VALIDADA") {
    return { valida: true };
  }

  if (estadoActual === "VALIDADA" && nuevoEstado === "RECHAZADA") {
    return { valida: true };
  }

  return {
    valida: false,
    motivo: `No se puede cambiar el estado de «${ETIQUETA_ESTADO_AUTORIA[estadoActual]}» a «${ETIQUETA_ESTADO_AUTORIA[nuevoEstado]}».`,
  };
}

// RF-025: Conteo oficial de producción científica por profesor y por departamento.
export type AutoriaParaConteo = {
  estado: EstadoAutoria;
  profesorId: number;
  departamentoId?: number | null;
};

export type ResumenConteoOficial = {
  totalValidadas: number;
  totalPendientes: number;
  totalRechazadas: number;
  porProfesor: Record<number, number>;
  porDepartamento: Record<number, number>;
};

export function calcularConteoOficial(autorias: AutoriaParaConteo[]): ResumenConteoOficial {
  const resumen: ResumenConteoOficial = {
    totalValidadas: 0,
    totalPendientes: 0,
    totalRechazadas: 0,
    porProfesor: {},
    porDepartamento: {},
  };

  for (const autoria of autorias) {
    if (autoria.estado === "PENDIENTE") {
      resumen.totalPendientes += 1;
    } else if (autoria.estado === "RECHAZADA") {
      resumen.totalRechazadas += 1;
    } else if (autoria.estado === "VALIDADA") {
      resumen.totalValidadas += 1;

      // Conteo por profesor
      resumen.porProfesor[autoria.profesorId] =
        (resumen.porProfesor[autoria.profesorId] ?? 0) + 1;

      // Conteo por departamento si está asignado
      if (autoria.departamentoId) {
        resumen.porDepartamento[autoria.departamentoId] =
          (resumen.porDepartamento[autoria.departamentoId] ?? 0) + 1;
      }
    }
  }

  return resumen;
}

// Esquema para la edición rápida de metadatos desde la bandeja (RF-024)
export const edicionMetadatosBandejaEsquema = z.object({
  publicacionId: z.coerce.number().int().positive("Publicación inválida."),
  tipo: z.enum(TIPOS_PUBLICACION, { error: "Elige un tipo de publicación." }),
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
        .max(500, "Los autores admiten como máximo 500 caracteres."),
    ),
  revistaEditorial: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() !== "" ? limpiar(s) : undefined))
    .pipe(z.string().max(250, "La revista/editorial admite como máximo 250 caracteres.").optional()),
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
});

export type EdicionMetadatosBandejaDatos = z.infer<typeof edicionMetadatosBandejaEsquema>;
