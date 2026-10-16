"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  // Login SIIAU (red UDG). No activo: los fetch están comentados en src/lib/auth/siiau.ts.
  // Cuando se despliegue, este bloque va antes de signInWithPassword y el formulario
  // también envía el código UDG. Hoy no se ejecuta y el correo entra igual que siempre.
  //
  // const codigo = String(formData.get("codigo") ?? "");
  // const siiau = await entrarConSiiau(codigo, datos.data.contrasena);
  // if (siiau.estado === "no-udg") {
  //   // No es código SIIAU: sigue el login por correo de abajo.
  // } else if (siiau.estado === "copiado" || siiau.estado === "usar-copia-local") {
  //   const { error: errorCopia } = await supabase.auth.signInWithPassword({
  //     email: siiau.correo,
  //     password: datos.data.contrasena,
  //   });
  //   if (errorCopia) return { error: "No se pudo entrar con la copia local.", correo };
  //   redirect("/");
  // } else if (siiau.estado === "credenciales-invalidas") {
  //   return { error: "El código UDG o la contraseña no coinciden.", correo };
  // } else if (siiau.estado === "sin-conexion-sin-copia") {
  //   return { error: "SIIAU no responde y esta cuenta aún no tiene copia local.", correo };
  // } else {
  //   return { error: "SIIAU no devolvió una respuesta utilizable.", correo };
  // }

  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });
  if (error) return { error: "El correo o la contraseña no coinciden.", correo };

  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
