// Crea (o promueve) un usuario ADMINISTRADOR sin enviar correo.
// Uso: ADMIN_CORREO=persona@cuvalles.udg.mx npm run crear-admin
// Requiere SUPABASE_SECRET_KEY en .env. Esa llave nunca va al código de la app ni a Vercel.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_CORREO, DIRECT_URL } = process.env;

async function main() {
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !ADMIN_CORREO || !DIRECT_URL) {
    throw new Error("Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_CORREO o DIRECT_URL.");
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DIRECT_URL }) });

  try {
    const correo = ADMIN_CORREO.toLowerCase();
    let contrasena: string | null = randomBytes(12).toString("base64url");

    const creado = await supabase.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: true,
    });

    let userId = creado.data.user?.id;
    if (!userId) {
      // Ya existía: se conserva su contraseña y solo se le asigna el rol.
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      userId = data.users.find((u) => u.email?.toLowerCase() === correo)?.id;
      if (!userId) throw creado.error ?? new Error("No se pudo crear el usuario.");
      contrasena = null;
    }

    await prisma.perfil.upsert({
      where: { id: userId },
      update: { rol: "ADMINISTRADOR" },
      create: { id: userId, correo, rol: "ADMINISTRADOR" },
    });

    console.log(`Administrador listo: ${correo}`);
    if (contrasena) console.log(`Contraseña temporal (cámbiala al entrar): ${contrasena}`);
    else console.log("El usuario ya existía; conserva su contraseña.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
