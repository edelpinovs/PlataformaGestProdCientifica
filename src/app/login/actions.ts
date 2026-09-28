"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credenciales = z.object({
  correo: z.email(),
  contrasena: z.string().min(1),
});

export type EstadoLogin = { error?: string };

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const datos = credenciales.safeParse({
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });
  if (!datos.success) return { error: "Escribe un correo válido y tu contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });
  if (error) return { error: "El correo o la contraseña no coinciden." };

  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
