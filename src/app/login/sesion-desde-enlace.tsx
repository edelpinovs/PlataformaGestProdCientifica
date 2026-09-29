"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ENLACE_INVALIDO = "El enlace del correo ya se usó o caducó. Pide que te envíen una invitación nueva.";

// Guarda en cookies la sesión que trae el enlace y devuelve a dónde ir, o un mensaje de error.
async function procesarEnlace(params: URLSearchParams): Promise<{ destino?: string; error?: string }> {
  if (params.has("error")) return { error: ENLACE_INVALIDO };

  const { error } = await createClient().auth.setSession({
    access_token: params.get("access_token")!,
    refresh_token: params.get("refresh_token") ?? "",
  });
  if (error) return { error: ENLACE_INVALIDO };

  // Quien llega por invitación o recuperación todavía no tiene contraseña que usar.
  const tipo = params.get("type");
  return { destino: tipo === "invite" || tipo === "recovery" ? "/cuenta/contrasena" : "/" };
}

// Los enlaces de las plantillas de correo por defecto de Supabase (invitación y
// recuperación) regresan con la sesión en el fragmento (#access_token=...).
// El fragmento no llega al servidor, así que aquí se lee en el navegador.
export function SesionDesdeEnlace() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!params.has("access_token") && !params.has("error")) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);

    procesarEnlace(params).then((resultado) => {
      if (resultado.destino) router.replace(resultado.destino);
      else setError(resultado.error ?? ENLACE_INVALIDO);
    });
  }, [router]);

  if (!error) return null;
  return <p role="status" className="text-sm text-amber-700">{error}</p>;
}
