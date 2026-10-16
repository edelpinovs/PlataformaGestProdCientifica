"use server";

import { redirect } from "next/navigation";
import { esTipoEnlace } from "@/lib/auth/enlace";
import { createClient } from "@/lib/supabase/server";

// Gasta el token del enlace: solo se ejecuta cuando la persona pulsa "Continuar".
export async function confirmarEnlace(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const tipo = formData.get("type");
  if (typeof tokenHash !== "string" || !tokenHash || !esTipoEnlace(tipo)) {
    redirect("/login?error=enlace-invalido");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
  if (error) redirect("/login?error=enlace-invalido");

  // Quien llega por invitación o recuperación todavía no tiene contraseña que usar.
  redirect("/cuenta/contrasena");
}
