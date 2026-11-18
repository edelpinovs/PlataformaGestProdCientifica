import { z } from "zod";

// Cambio de contraseña de una persona con sesión (issue #225). Funciones puras: la Server Action
// de src/app/cuenta/actions.ts solo orquesta Supabase. Todo mensaje es propio y en español.

export const MINIMO_CONTRASENA = 8;
// Supabase (bcrypt) no admite contraseñas de más de 72 caracteres.
export const MAXIMO_CONTRASENA = 72;

export type CampoContrasena = "actual" | "nueva" | "confirmacion";

const esquema = z
  .object({
    actual: z
      .string({ error: "Escribe tu contraseña actual." })
      .min(1, "Escribe tu contraseña actual."),
    nueva: z
      .string({ error: "Escribe la nueva contraseña." })
      .min(MINIMO_CONTRASENA, `La nueva contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres.`)
      .max(MAXIMO_CONTRASENA, `La contraseña no puede tener más de ${MAXIMO_CONTRASENA} caracteres.`),
    confirmacion: z.string({ error: "Repite la nueva contraseña." }),
  })
  .superRefine((datos, contexto) => {
    if (datos.nueva === datos.actual) {
      contexto.addIssue({
        code: "custom",
        path: ["nueva"],
        message: "La nueva contraseña debe ser distinta de la actual.",
      });
    } else if (datos.confirmacion !== datos.nueva) {
      contexto.addIssue({ code: "custom", path: ["confirmacion"], message: "Las contraseñas no coinciden." });
    }
  });

export type DatosCambioContrasena = z.infer<typeof esquema>;

export type ResultadoValidacion =
  | { ok: true; datos: DatosCambioContrasena }
  | { ok: false; campo: CampoContrasena; error: string };

/** Valida los tres campos del formulario. Acepta cualquier valor: lo que llega del navegador no es de fiar. */
export function validarCambioContrasena(entrada: Record<string, unknown>): ResultadoValidacion {
  const r = esquema.safeParse(entrada);
  if (r.success) return { ok: true, datos: r.data };
  const problema = r.error.issues[0];
  return { ok: false, campo: problema.path[0] as CampoContrasena, error: problema.message };
}

export type FalloContrasena = { campo?: CampoContrasena; error: string };

/** Mensaje cuando falla comprobar la contraseña actual. Solo «credenciales inválidas» culpa a la contraseña. */
export function mensajeVerificacion(codigo: string | undefined): FalloContrasena {
  if (codigo === "invalid_credentials") {
    return { campo: "actual", error: "La contraseña actual no es correcta." };
  }
  return { error: "No se pudo comprobar tu contraseña actual. Inténtalo de nuevo en unos minutos." };
}

/** Mensaje cuando Supabase rechaza guardar la contraseña nueva. */
export function mensajeGuardado(codigo: string | undefined): FalloContrasena {
  if (codigo === "weak_password") {
    return { campo: "nueva", error: "La contraseña es demasiado débil. Usa una más larga o variada." };
  }
  if (codigo === "same_password") {
    return { campo: "nueva", error: "La nueva contraseña debe ser distinta de la actual." };
  }
  return { error: "No se pudo guardar la contraseña. Inténtalo de nuevo en unos minutos." };
}
