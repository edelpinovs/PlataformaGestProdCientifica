import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes de cliente. Guarda la sesión en cookies,
// así el servidor la ve en la siguiente petición.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
