// Lógica compartida de `npm run invitar` y `npm run invitar:lote`.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient } from "../../src/generated/prisma/client";
import { ROLES, type Rol } from "../../src/lib/auth/roles";

export type ResultadoInvitacion = {
  correo: string;
  rol: Rol;
  tipo: "invitacion" | "recuperacion";
  enlace: string;
};

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export function conectar() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DIRECT_URL, SITIO_URL } = process.env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !DIRECT_URL || !SITIO_URL) {
    throw new Error("Faltan variables en .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DIRECT_URL o SITIO_URL.");
  }
  return {
    supabase: createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString: DIRECT_URL }) }),
    redirectTo: `${SITIO_URL.replace(/\/$/, "")}/login`,
  };
}

// Crea el usuario (o lo encuentra), le asigna el rol y genera su enlace SIN enviar correo.
// El enlace caduca según Supabase (Email OTP Expiration, 1 hora por defecto) y sirve una vez.
export async function invitar(
  { supabase, prisma, redirectTo }: { supabase: SupabaseClient; prisma: PrismaClient; redirectTo: string },
  correo: string,
  rol: Rol,
): Promise<ResultadoInvitacion> {
  let tipo: ResultadoInvitacion["tipo"] = "invitacion";
  let { data, error } = await supabase.auth.admin.generateLink({ type: "invite", email: correo, options: { redirectTo } });
  if (error?.code === "email_exists") {
    tipo = "recuperacion";
    ({ data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email: correo, options: { redirectTo } }));
  }
  if (error || !data.user) throw error ?? new Error("Supabase no devolvió el usuario.");

  await prisma.perfil.upsert({
    where: { id: data.user.id },
    update: { rol },
    create: { id: data.user.id, correo, rol },
  });

  return { correo, rol, tipo, enlace: data.properties.action_link };
}

export type ResultadoContrasena = { correo: string; rol: Rol; contrasena: string; nuevo: boolean };

// Alternativa a los enlaces: deja la cuenta confirmada con una contraseña temporal y su rol.
// La persona entra con su correo y esa contraseña y la cambia en /cuenta/contrasena.
export async function asignarContrasenaTemporal(
  { supabase, prisma }: { supabase: SupabaseClient; prisma: PrismaClient },
  correo: string,
  rol: Rol,
): Promise<ResultadoContrasena> {
  const contrasena = `Pgpc-${randomBytes(6).toString("hex")}`;

  const { data: lista, error: errorLista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (errorLista) throw errorLista;
  const existente = lista.users.find((u) => u.email?.toLowerCase() === correo);

  const { data, error } = existente
    ? await supabase.auth.admin.updateUserById(existente.id, { password: contrasena, email_confirm: true })
    : await supabase.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("Supabase no devolvió el usuario.");

  await prisma.perfil.upsert({
    where: { id: data.user.id },
    update: { rol },
    create: { id: data.user.id, correo, rol },
  });

  return { correo, rol, contrasena, nuevo: !existente };
}
