import { z } from "zod";
import { limpiar, normalizar, texto } from "@/modules/catalogos/comun";

// ─── Esquemas Zod ─────────────────────────────────────────────────────────────

const codigoProfesor = z
  .string()
  .transform((s) => limpiar(s).toUpperCase())
  .pipe(
    z
      .string()
      .min(1, "El código institucional es obligatorio.")
      .max(20, "El código admite como máximo 20 caracteres.")
      .regex(/^[A-Z0-9]+$/, "El código solo debe contener letras y números, sin espacios."),
  );

// RF-004: campos obligatorios para registrar un profesor investigador.
export const registrarProfesor = z.object({
  codigo: codigoProfesor,
  nombres: texto("El nombre", 150),
  apellidos: texto("Los apellidos", 150),
  correo: z
    .string()
    .transform((s) => limpiar(s).toLowerCase())
    .pipe(z.string().min(1, "El correo es obligatorio.").email("El correo no tiene un formato válido.")),
  genero: z.enum(["M", "F"], { error: "Selecciona un género." }),
  // Requerido en BD (no tiene valor por defecto)
  tipoContratacion: z.enum(["TIEMPO_COMPLETO", "ASIGNATURA"], {
    error: "Selecciona el tipo de contratación.",
  }),
  // Tiene default ACTIVO en BD, pero lo enviamos siempre desde el formulario
  estatusLaboral: z
    .enum(["ACTIVO", "LICENCIA", "BAJA_TEMPORAL", "BAJA_POSDOCTORAL", "TRASLADADO"])
    .default("ACTIVO"),
  departamentoId: z
    .string()
    .optional()
    .transform((s) => (s && s !== "" ? Number(s) : undefined))
    .pipe(z.number().int().positive().optional()),
  gradoId: z
    .string()
    .optional()
    .transform((s) => (s && s !== "" ? Number(s) : undefined))
    .pipe(z.number().int().positive().optional()),
  cvu: z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? s.trim() : undefined),
    z.string().max(20, "El CVU admite hasta 20 caracteres.").optional(),
  ),
  orcid: z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? s.trim() : undefined),
    z
      .string()
      .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "El ORCID debe tener el formato 0000-0000-0000-0000.")
      .optional(),
  ),
  scholarId: z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? s.trim() : undefined),
    z.string().max(50, "El Scholar ID admite hasta 50 caracteres.").optional(),
  ),
  scopusId: z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? s.trim() : undefined),
    z.string().max(20, "El Scopus ID admite hasta 20 caracteres.").optional(),
  ),
});

export type RegistrarProfesor = z.infer<typeof registrarProfesor>;

// ─── Reglas de negocio (RF-004) ───────────────────────────────────────────────

export type DuplicadoProfesor = {
  campo: "codigo" | "correo" | "orcid" | "scholarId" | "scopusId" | "cvu";
  mensaje: string;
};

type ExistenteProfesor = {
  codigo: string;
  correo: string;
  orcid?: string | null;
  scholarId?: string | null;
  scopusId?: string | null;
  cvu?: string | null;
};

/** Detecta unicidad de código, correo e identificadores antes de persistir. */
export function buscarDuplicadoProfesor(
  nuevo: RegistrarProfesor,
  existentes: ExistenteProfesor[],
): DuplicadoProfesor | null {
  if (existentes.some((p) => p.codigo === nuevo.codigo)) {
    return { campo: "codigo", mensaje: `Ya existe un profesor con el código «${nuevo.codigo}».` };
  }

  if (existentes.some((p) => normalizar(p.correo) === normalizar(nuevo.correo))) {
    return { campo: "correo", mensaje: `El correo «${nuevo.correo}» ya está registrado.` };
  }

  if (nuevo.orcid && existentes.some((p) => p.orcid === nuevo.orcid)) {
    return { campo: "orcid", mensaje: `El ORCID «${nuevo.orcid}» ya está registrado.` };
  }

  if (nuevo.scholarId && existentes.some((p) => p.scholarId === nuevo.scholarId)) {
    return { campo: "scholarId", mensaje: `El Scholar ID «${nuevo.scholarId}» ya está registrado.` };
  }

  if (nuevo.scopusId && existentes.some((p) => p.scopusId === nuevo.scopusId)) {
    return { campo: "scopusId", mensaje: `El Scopus ID «${nuevo.scopusId}» ya está registrado.` };
  }

  if (nuevo.cvu && existentes.some((p) => p.cvu === nuevo.cvu)) {
    return { campo: "cvu", mensaje: `El CVU «${nuevo.cvu}» ya está registrado.` };
  }

  return null;
}

/** Genera el nombre normalizado para cruce de listados (RF-018). */
export function generarNombreNormalizado(nombres: string, apellidos: string): string {
  return normalizar(`${apellidos} ${nombres}`);
}
