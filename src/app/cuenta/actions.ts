"use server";

import { ROLES } from "@/lib/auth/roles";
import { requireRol } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  mensajeGuardado,
  mensajeVerificacion,
  validarCambioContrasena,
  type CampoContrasena,
} from "@/modules/cuenta/contrasena";

export type EstadoCambioContrasena = {
  error?: string;
  campo?: CampoContrasena;
  exito?: string;
};

// Cambiar la contraseña desde Mi cuenta (issue #225). Distinto de /cuenta/contrasena, que define
// la contraseña por primera vez desde el enlace del correo y no conoce la actual.
export async function cambiarContrasena(
  _: EstadoCambioContrasena,
  formData: FormData,
): Promise<EstadoCambioContrasena> {
  // RNF-005: las tres personas con sesión pueden cambiar su propia contraseña.
  const perfil = await requireRol([...ROLES]);

  const datos = validarCambioContrasena({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!datos.ok) return { error: datos.error, campo: datos.campo };

  const supabase = await createClient();

  // Se comprueba la actual con el correo de la sesión, nunca con uno que mande el navegador.
  const verificacion = await supabase.auth.signInWithPassword({
    email: perfil.correo,
    password: datos.datos.actual,
  });
  if (verificacion.error) return { ...mensajeVerificacion(verificacion.error.code) };

  const guardado = await supabase.auth.updateUser({ password: datos.datos.nueva });
  if (guardado.error) return { ...mensajeGuardado(guardado.error.code) };

  return { exito: "Tu contraseña se actualizó." };
}
