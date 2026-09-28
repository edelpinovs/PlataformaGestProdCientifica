import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI (migraciones) usa la conexión directa de Supabase (puerto 5432).
// La aplicación usa la conexión con pooler (DATABASE_URL) desde src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
