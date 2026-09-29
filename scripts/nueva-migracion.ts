// Crea una migración comparando la base de desarrollo compartida con prisma/schema.prisma.
// Uso: npm run db:nueva-migracion -- agrega_campo_x
//
// Sustituye a `prisma migrate dev`, que con una base compartida puede proponer
// borrarla completa (reset). Este script solo escribe el archivo SQL; no toca la base.
// Después: revisar el SQL, aplicarlo con `npm run db:migrar` y subirlo en el PR.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const nombre = process.argv[2];
if (!nombre || !/^[a-z0-9_]+$/.test(nombre)) {
  console.error("Uso: npm run db:nueva-migracion -- <nombre_en_minusculas_con_guiones_bajos>");
  process.exit(1);
}

const sql = execSync("npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script", {
  encoding: "utf-8",
});

if (!/^\s*(CREATE|ALTER|DROP)/im.test(sql)) {
  console.log("La base ya coincide con schema.prisma: no hay nada que migrar.");
  console.log("¿Olvidaste guardar schema.prisma, o falta aplicar migraciones de otros? (npm run db:migrar)");
  process.exit(0);
}

if (/^\s*DROP (TABLE|COLUMN)|DROP COLUMN/im.test(sql)) {
  console.warn("⚠ La migración BORRA tablas o columnas. Revísala con el equipo antes de aplicarla.");
}

// Toda tabla nueva debe cerrar la Data API de Supabase (ver migración habilitar_rls).
const tablasNuevas = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1]);
const rls = tablasNuevas.map((t) => `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`).join("\n");

const marca = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const carpeta = `prisma/migrations/${marca}_${nombre}`;
mkdirSync(carpeta, { recursive: true });
writeFileSync(`${carpeta}/migration.sql`, sql.trimEnd() + (rls ? `\n\n-- RLS para tablas nuevas\n${rls}` : "") + "\n");

console.log(`Migración creada: ${carpeta}/migration.sql`);
if (tablasNuevas.length) console.log(`RLS agregado para: ${tablasNuevas.join(", ")}`);
console.log("Siguiente: revisa el SQL, ejecuta `npm run db:migrar` y súbelo en tu PR.");
