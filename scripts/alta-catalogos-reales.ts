// Alta de las divisiones y departamentos REALES que necesita la carga de profesores (D-259 a D-262).
// Definiciones y criterio en scripts/lib/catalogos-reales.ts y docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:catalogos:simular                 qué se crearía y qué choca; NO escribe en la base
//   npm run importar:catalogos:aplicar -- --confirmo   crea lo que falta (se puede repetir sin duplicar)
//
// Solo crea: nunca edita ni borra. Si algo choca con lo que ya hay (clave, nombre o nomenclatura en uso),
// no escribe nada y lo explica. Lo que se cree se puede corregir o eliminar desde las pantallas del catálogo.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizar } from "../src/modules/catalogos/comun";
import { planearCatalogos, type BaseCatalogos, type PlanCatalogos } from "./lib/catalogos-reales";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL en .env.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const [comando = "simular", ...resto] = process.argv.slice(2);
const opciones = new Set(resto.filter((a) => a.startsWith("--")));

async function leerBase(): Promise<BaseCatalogos> {
  const [divisiones, departamentos] = await Promise.all([
    prisma.division.findMany({ select: { id: true, nombre: true, clave: true } }),
    prisma.departamento.findMany({ select: { id: true, nombre: true, nomenclatura: true, divisionId: true } }),
  ]);
  return { divisiones, departamentos };
}

function imprimir(plan: PlanCatalogos) {
  console.log(`Divisiones a crear:         ${plan.divisionesNuevas.length}`);
  for (const d of plan.divisionesNuevas) console.log(`  + ${d.clave} · ${d.nombre}`);
  console.log(`Divisiones que ya existen:  ${plan.divisionesExistentes.length}`);
  console.log(`Departamentos a crear:      ${plan.departamentosNuevos.length}`);
  for (const d of plan.departamentosNuevos) console.log(`  + ${d.nomenclatura} · ${d.nombre} (división ${d.divisionClave})`);
  console.log(`Departamentos que ya existen: ${plan.departamentosExistentes.length}`);
  if (plan.conflictos.length > 0) {
    console.log("\nCONFLICTOS (no se escribe nada hasta resolverlos):");
    for (const c of plan.conflictos) console.log(`  ! ${c}`);
  }
}

async function simular() {
  imprimir(planearCatalogos(await leerBase()));
  console.log("\nSimulación: no se escribió nada en la base.");
}

async function aplicar() {
  const base = await leerBase();
  const plan = planearCatalogos(base);
  imprimir(plan);

  if (plan.conflictos.length > 0) throw new Error("Hay conflictos. Resuélvelos (desde las pantallas del catálogo) y repite.");
  if (plan.divisionesNuevas.length === 0 && plan.departamentosNuevos.length === 0) {
    console.log("\nNada que crear.");
    return;
  }
  if (!opciones.has("--confirmo")) {
    throw new Error("Esto escribe en la base compartida. Si es lo que quieres, repite con --confirmo.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const idPorClave = new Map(base.divisiones.map((d) => [normalizar(d.clave), d.id]));
    for (const d of plan.divisionesNuevas) {
      const creada = await tx.division.create({ data: { clave: d.clave, nombre: d.nombre } });
      idPorClave.set(normalizar(d.clave), creada.id);
    }
    for (const d of plan.departamentosNuevos) {
      const divisionId = idPorClave.get(normalizar(d.divisionClave));
      if (divisionId === undefined) throw new Error(`No se encontró la división «${d.divisionClave}».`);
      await tx.departamento.create({ data: { nombre: d.nombre, nomenclatura: d.nomenclatura, divisionId } });
    }
    return { divisiones: plan.divisionesNuevas.length, departamentos: plan.departamentosNuevos.length };
  });
  console.log(`\nCreados: ${resultado.divisiones} divisiones y ${resultado.departamentos} departamentos.`);
}

const comandos: Record<string, () => Promise<void>> = { simular, aplicar };

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
