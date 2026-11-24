"use server";

import { ROLES } from "@/lib/auth/roles";
import { requireRol } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { debeRegistrar, moduloRegistrable } from "@/modules/cuenta/accesos";
import { validarTema } from "@/modules/cuenta/tema";
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

// Cuenta una visita al módulo para «Accesos frecuentes» (issue #226). La llama en segundo plano
// RegistroAcceso, desde Marco: si algo falla no se avisa ni se interrumpe la navegación.
export async function registrarAcceso(slug: unknown): Promise<void> {
  // RNF-005: cualquier rol con sesión; el módulo se valida abajo contra el rol real.
  const perfil = await requireRol([...ROLES]);
  const modulo = moduloRegistrable(slug, perfil.rol);
  if (!modulo) return;

  try {
    const donde = { perfilId_modulo: { perfilId: perfil.id, modulo: modulo.slug } };
    const previo = await prisma.accesoModulo.findUnique({ where: donde, select: { ultimoAcceso: true } });
    // El servidor decide: el navegador solo evita llamadas de más.
    if (previo && !debeRegistrar(previo.ultimoAcceso.getTime(), Date.now())) return;

    await prisma.accesoModulo.upsert({
      where: donde,
      create: { perfilId: perfil.id, modulo: modulo.slug },
      update: { conteo: { increment: 1 }, ultimoAcceso: new Date() },
    });
  } catch {
    // Contar visitas es secundario: nunca debe romper la pantalla de la persona.
  }
}

// Guarda en el perfil el tema que eligió la persona para que la siga a otro navegador (#283).
// El cambio visual y la cookie ya los aplicó el navegador: si esto falla, no se interrumpe a nadie.
export async function guardarTema(valor: unknown): Promise<{ error?: string }> {
  // RNF-005: las tres personas con sesión guardan su propio tema; nunca el de otra persona.
  const perfil = await requireRol([...ROLES]);

  const tema = validarTema(valor);
  if (!tema.ok) return { error: tema.error };

  try {
    await prisma.perfil.update({ where: { id: perfil.id }, data: { tema: tema.tema } });
  } catch {
    return { error: "No pudimos guardar el tema en tu cuenta. Se conserva en este navegador." };
  }
  return {};
}
