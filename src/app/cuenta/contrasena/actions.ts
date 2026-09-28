"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const nuevaContrasena = z
  .object({
    contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmacion, { message: "Las contraseñas no coinciden." });

export type EstadoContrasena = { error?: string };

export async function guardarContrasena(
  _: EstadoContrasena,
  formData: FormData,
): Promise<EstadoContrasena> {
  const datos = nuevaContrasena.safeParse({
    contrasena: formData.get("contrasena"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!datos.success) return { error: datos.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: datos.data.contrasena });
  if (error) return { error: "No se pudo guardar la contraseña. Vuelve a abrir el enlace del correo." };

  redirect("/");
}
