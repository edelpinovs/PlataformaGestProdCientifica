// Crea un usuario con su rol y genera su enlace de invitación SIN enviar correo.
// Uso: npm run invitar -- persona@cuvalles.udg.mx COORDINADOR
// El enlace se comparte por el medio que se prefiera y caduca según Supabase
// (Authentication › Providers › Email › Email OTP Expiration, 1 hora por defecto).
// Si el usuario ya existía, genera un enlace para restablecer su contraseña.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { ROLES, type Rol } from "../src/lib/auth/roles";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DIRECT_URL, SITIO_URL } = process.env;

async function main() {
  const [correoArg, rolArg = "DOCENTE"] = process.argv.slice(2);
  const correo = correoArg?.toLowerCase();
  const rol = rolArg.toUpperCase() as Rol;

  if (!correo || !correo.includes("@") || !ROLES.includes(rol)) {
    throw new Error(`Uso: npm run invitar -- <correo> [${ROLES.join("|")}]`);
  }
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !DIRECT_URL || !SITIO_URL) {
    throw new Error("Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DIRECT_URL o SITIO_URL.");
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DIRECT_URL }) });
  const redirectTo = `${SITIO_URL.replace(/\/$/, "")}/login`;

  try {
    let tipo: "invite" | "recovery" = "invite";
    let { data, error } = await supabase.auth.admin.generateLink({ type: "invite", email: correo, options: { redirectTo } });
    if (error?.code === "email_exists") {
      tipo = "recovery";
      ({ data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email: correo, options: { redirectTo } }));
    }
    if (error || !data.user) throw error ?? new Error("Supabase no devolvió el usuario.");

    await prisma.perfil.upsert({
      where: { id: data.user.id },
      update: { rol },
      create: { id: data.user.id, correo, rol },
    });

    console.log(`${correo} · ${rol}`);
    console.log(tipo === "invite" ? "Enlace de invitación:" : "El usuario ya existía. Enlace para restablecer su contraseña:");
    console.log(data.properties.action_link);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
