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
