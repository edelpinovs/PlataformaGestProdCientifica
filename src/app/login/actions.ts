"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DURACION_COOKIE_TEMA, temaGuardado } from "@/modules/cuenta/tema";

const credenciales = z.object({
  correo: z.email(),
  contrasena: z.string().min(1),
});

// `correo` vuelve al formulario: React 19 lo reinicia al terminar la acción.
export type EstadoLogin = { error?: string; correo?: string };

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = String(formData.get("correo") ?? "");
  const datos = credenciales.safeParse({ correo, contrasena: formData.get("contrasena") });
  if (!datos.success) return { error: "Escribe un correo válido y tu contraseña.", correo };

  const supabase = await createClient();

  // El login con código UDG (SIIAU) iría aquí, antes del correo. No está activo:
  // ver docs/diseno/LOGIN_SIIAU.md.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });
  if (error) return { error: "El correo o la contraseña no coinciden.", correo };

  await aplicarTemaGuardado(data.user.id);
  redirect("/");
}

// Si la persona ya eligió un tema (#283), se escribe en la cookie que lee src/app/layout.tsx para
// que la siga a este navegador. Sin tema guardado o con un fallo, queda el del navegador.
async function aplicarTemaGuardado(perfilId: string) {
  try {
    const perfil = await prisma.perfil.findUnique({ where: { id: perfilId }, select: { tema: true } });
    const tema = temaGuardado(perfil?.tema);
    if (!tema) return;
    (await cookies()).set("tema", tema, {
      path: "/",
      maxAge: DURACION_COOKIE_TEMA,
      sameSite: "lax",
      httpOnly: false, // el script de layout.tsx la lee con document.cookie
    });
  } catch {
    // El tema es secundario: nunca debe impedir iniciar sesión.
  }
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
