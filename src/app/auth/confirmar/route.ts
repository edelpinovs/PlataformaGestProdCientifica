import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los enlaces de los correos de Supabase (invitación y recuperación).
// Las plantillas de correo deben apuntar aquí; ver README › Configurar Supabase Auth.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Quien llega por invitación o recuperación todavía no tiene contraseña que usar.
      const destino = type === "invite" || type === "recovery" ? "/cuenta/contrasena" : "/";
      return NextResponse.redirect(new URL(destino, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=enlace-invalido", origin));
}
