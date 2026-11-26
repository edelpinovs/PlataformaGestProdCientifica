// Carga de los profesores REALES (D-259 a D-261). Flujo y criterio en docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:simular                   calcula qué se crearía; NO escribe en la base (lee para comparar)
//   npm run importar:aplicar -- --confirmo     crea los profesores en la base compartida
//   npm run importar:contar                    cuenta lo marcado como pendiente
//   npm run importar:limpiar                   borra lo marcado que nadie ha tocado ni usado
// Opciones: una carpeta distinta de datos-reales/ (primer argumento sin guiones) y, solo en aplicar,
//   --sin-departamento   carga aunque falten departamentos en la base (quedan sin departamento).
//
// Lo que se crea lleva marca: código «PEND0001…», correo «pend-0001@pendiente.invalid» y género y
// contratación en PENDIENTE. Nada se inventa. Nunca usa TRUNCATE ni borrados sin WHERE.
import "dotenv/config";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Genero, TipoContratacion } from "../src/generated/prisma/enums";
import { leerCsvReales } from "./lib/datos-reales";
import {
  DOMINIO_PENDIENTE,
  PREFIJO_CODIGO,
  SIN_USO_PROFESOR,
  informePlan,
  prepararCarga,
  type EstadoBase,
} from "./lib/cargar-profesores";
import { resumenAnonimo, validarProfesores } from "./lib/importar-profesores";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL en .env.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Solo cuenta como «sin tocar» lo que conserva las dos marcas: si alguien ya corrigió el código o el correo,
// esa persona se considera trabajada y la limpieza no la borra.
const marcado = {
  correo: { endsWith: `@${DOMINIO_PENDIENTE}` },
  codigo: { startsWith: PREFIJO_CODIGO },
};

const [comando = "simular", ...resto] = process.argv.slice(2);
const opciones = new Set(resto.filter((a) => a.startsWith("--")));
const carpetaArgumento = resto.find((a) => !a.startsWith("--"));

async function migracionAplicada(): Promise<boolean> {
  const [fila] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      SELECT unnest(enum_range(NULL::"Genero"))::text AS v
      UNION ALL
      SELECT unnest(enum_range(NULL::"TipoContratacion"))::text
    ) t WHERE v = 'PENDIENTE'`;
  return fila.n === 2;
}

async function planear() {
  const csv = leerCsvReales(carpetaArgumento);
  const validacion = validarProfesores({ completo: csv.completo, scopus: csv.scopus });
  const base: EstadoBase = {
    departamentos: await prisma.departamento.findMany({ select: { id: true, nombre: true } }),
    profesores: await prisma.profesor.findMany({
      select: { codigo: true, nombreNormalizado: true, orcid: true, scholarId: true, scopusId: true },
    }),
  };
  return { csv, validacion, plan: prepararCarga(validacion.importables, base) };
}

function resumirPlan(r: Awaited<ReturnType<typeof planear>>, migrada: boolean) {
  const { validacion, plan } = r;
  console.log(resumenAnonimo(validacion).split("\n\n")[0]);
  console.log(`\nMigración PENDIENTE aplicada en la base: ${migrada ? "sí" : "NO (falta npm run db:migrar)"}`);
  console.log(`A crear:                      ${plan.cargar.length}`);
  console.log(`Omitidas (ya existen):        ${plan.omitidos.length}`);
  console.log(`Identificadores que chocan:   ${plan.ajustes.length} (se dejan vacíos)`);
  console.log(`Sin departamento asignable:   ${plan.cargar.filter((p) => p.departamentoId === null).length}`);
  if (plan.departamentosFaltantes.size > 0) {
    console.log("\nDepartamentos del CSV que NO existen en la base (hay que darlos de alta, con su división):");
    for (const [nombre, cuantas] of plan.departamentosFaltantes) console.log(`  - ${nombre} (${cuantas} personas)`);
  }
}

async function simular() {
  const r = await planear();
  const salida = path.join(r.csv.carpeta, "plan-carga.md");
  writeFileSync(salida, informePlan(r.plan), "utf8");
  resumirPlan(r, await migracionAplicada());
  console.log(`\nSimulación: no se escribió nada en la base. Detalle con nombres: ${salida}`);
}

async function aplicar() {
  if (!(await migracionAplicada())) {
    throw new Error("Falta la migración de PENDIENTE en la base. Aplícala primero con `npm run db:migrar` (D-261).");
  }
  const r = await planear();
  resumirPlan(r, true);

  if (r.plan.departamentosFaltantes.size > 0 && !opciones.has("--sin-departamento")) {
    throw new Error(
      "Faltan departamentos en la base. Dalos de alta (con su división) y repite, o usa --sin-departamento para cargar sin departamento.",
    );
  }
  if (r.plan.cargar.length === 0) {
    console.log("\nNada que cargar.");
    return;
  }
  if (!opciones.has("--confirmo")) {
    throw new Error(
      `Esto crearía ${r.plan.cargar.length} profesores reales en la base compartida. Si es lo que quieres, repite con --confirmo.`,
    );
  }

  const creados = await prisma.$transaction(
    async (tx) =>
      (
        await tx.profesor.createMany({
          data: r.plan.cargar.map((p) => ({
            codigo: p.codigo,
            correo: p.correo,
            nombres: p.nombres,
            apellidos: p.apellidos,
            nombreNormalizado: p.nombreNormalizado,
            genero: Genero.PENDIENTE,
            tipoContratacion: TipoContratacion.PENDIENTE,
            departamentoId: p.departamentoId,
            orcid: p.orcid,
            scholarId: p.scholarId,
            scopusId: p.scopusId,
          })),
        })
      ).count,
    { timeout: 60_000 },
  );
  console.log(`\nCreados: ${creados}. Para revertir lo que nadie ha tocado: npm run importar:limpiar`);
}

async function contar() {
  const [total, sinDepartamento] = await Promise.all([
    prisma.profesor.count({ where: marcado }),
    prisma.profesor.count({ where: { ...marcado, departamentoId: null } }),
  ]);
  console.log(`Profesores con marca de pendiente: ${total} (sin departamento: ${sinDepartamento})`);
}

async function limpiar() {
  // Solo se borra a quien conserva las dos marcas Y no tiene nada colgando (SIN_USO_PROFESOR).
  const antes = await prisma.profesor.count({ where: marcado });
  const { count } = await prisma.profesor.deleteMany({ where: { ...marcado, ...SIN_USO_PROFESOR } });
  console.log(`Borrados: ${count}. Con marca y en uso (no se borran): ${antes - count}.`);
}

const comandos: Record<string, () => Promise<void>> = { simular, aplicar, contar, limpiar };

async function principal() {
  const accion = comandos[comando];
  if (!accion) {
    console.error(`Comando desconocido «${comando}». Usa: ${Object.keys(comandos).join(", ")}.`);
    process.exit(1);
  }
  try {
    await accion();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
