// F3 de la importación 2027: completa los profesores «PEND» con los listados oficiales (#354).
// Plan y criterio: docs/PLAN_IMPORTACION_DATOS_REALES_2027.md · docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:completar:simular                          calcula el plan; NO escribe en la base (lee para comparar)
//   npm run importar:completar:aplicar -- --confirmo            escribe en una sola transacción y deja la bitácora
//   npm run importar:completar:revertir -- <bitácora> --confirmo   deshace solo lo que conserva el valor que puso
//
// Solo llena campos que aún tienen su marcador (código PEND, correo @pendiente.invalid, género o contratación
// PENDIENTE, grado, departamento o CVU vacío). Nunca usa TRUNCATE, borrados sin WHERE ni upsert.
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { leerPaquete2027 } from "./lib/datos-reales";
import {
  CAMPOS_COMPLETABLES,
  crearBitacora,
  informePlanCompletar,
  planCompletar,
  prepararReversion,
  resumenAnonimo,
  type Bitacora,
  type CampoCompletable,
  type EstadoActual,
  type RegistroPaquete,
  type Valor,
} from "./lib/completar-profesores";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL en .env.");
  process.exit(1);
}

// Solo host, puerto y base: nunca credenciales (contrato §4.2). 127.0.0.1:54322 es el ensayo local.
function destino(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(URL de conexión no reconocida)";
  }
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const [comando = "simular", ...resto] = process.argv.slice(2);
const opciones = new Set(resto.filter((a) => a.startsWith("--")));
const argumentos = resto.filter((a) => !a.startsWith("--"));
const CARPETA = path.resolve("datos-reales");

async function leerBase() {
  const [profesores, grados, departamentos] = await Promise.all([
    prisma.profesor.findMany({
      select: {
        id: true,
        codigo: true,
        correo: true,
        nombres: true,
        apellidos: true,
        nombreNormalizado: true,
        genero: true,
        tipoContratacion: true,
        gradoId: true,
        departamentoId: true,
        cvu: true,
      },
    }),
    prisma.gradoCientifico.findMany({ select: { id: true, nomenclatura: true } }),
    prisma.departamento.findMany({ select: { id: true, nomenclatura: true } }),
  ]);
  return { profesores, catalogos: { grados, departamentos } };
}

function leerRegistros(): RegistroPaquete[] {
  const { profesores } = leerPaquete2027();
  return profesores.filter(
    (r): r is RegistroPaquete =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as RegistroPaquete).nombres === "string" &&
      typeof (r as RegistroPaquete).apellidos === "string",
  );
}

async function planear() {
  const { profesores, catalogos } = await leerBase();
  return planCompletar(profesores, leerRegistros(), catalogos);
}

async function simular() {
  const plan = await planear();
  const salida = path.join(CARPETA, "plan-completar.md");
  writeFileSync(salida, informePlanCompletar(plan), "utf8");
  console.log(resumenAnonimo(plan));
  console.log(`\nSimulación: no se escribió nada en la base. Detalle con nombres: ${salida}`);
}

const marca = (fecha: Date) => fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-");

async function aplicar() {
  const plan = await planear();
  console.log(resumenAnonimo(plan));
  if (plan.actualizar.length === 0) {
    console.log("\nNada que completar.");
    return;
  }
  if (!opciones.has("--confirmo")) {
    throw new Error(
      `Esto actualizaría ${plan.actualizar.length} profesores en la base. Si es lo que quieres, repite con --confirmo.`,
    );
  }

  // Cada update solo corre si el profesor sigue con los valores que se leyeron: si alguien lo editó entre la
  // simulación y la escritura, no coincide, y la transacción completa se deshace.
  await prisma.$transaction(
    async (tx) => {
      for (const p of plan.actualizar) {
        const where = { id: p.id, ...Object.fromEntries(p.cambios.map((c) => [c.campo, c.antes])) } as Prisma.ProfesorWhereInput;
        const data = Object.fromEntries(p.cambios.map((c) => [c.campo, c.despues])) as Prisma.ProfesorUncheckedUpdateManyInput;
        const { count } = await tx.profesor.updateMany({ where, data });
        if (count !== 1) throw new Error("Un profesor cambió desde la simulación. No se escribió nada; repite la simulación.");
      }
    },
    { timeout: 120_000 },
  );

  const fecha = new Date();
  const bitacora = crearBitacora(plan, fecha, destino(connectionString!));
  mkdirSync(path.join(CARPETA, "bitacoras"), { recursive: true });
  const archivo = path.join(CARPETA, "bitacoras", `completar-${marca(fecha)}.json`);
  writeFileSync(archivo, JSON.stringify(bitacora, null, 2), "utf8");
  console.log(`\nActualizados: ${plan.actualizar.length}. Bitácora: ${archivo}`);
  console.log("Para deshacer: npm run importar:completar:revertir -- <bitácora> --confirmo");
}

function leerBitacora(ruta: string): Bitacora {
  const completa = path.resolve(ruta);
  if (!completa.startsWith(CARPETA + path.sep)) throw new Error("La bitácora debe estar dentro de datos-reales/.");
  if (!existsSync(completa)) throw new Error(`No existe la bitácora ${completa}.`);
  const datos = JSON.parse(readFileSync(completa, "utf8")) as Partial<Bitacora>;
  if (datos.fase !== "completar" || !Array.isArray(datos.cambios)) throw new Error("Esa bitácora no es de la fase «completar».");
  // El nombre del campo termina en una consulta: solo se aceptan los de la lista.
  for (const c of datos.cambios) {
    if (!(CAMPOS_COMPLETABLES as readonly string[]).includes(c.campo)) {
      throw new Error(`La bitácora trae un campo no permitido: «${String(c.campo)}».`);
    }
  }
  return datos as Bitacora;
}

async function revertir() {
  const ruta = argumentos[0];
  if (!ruta) throw new Error("Indica la bitácora: npm run importar:completar:revertir -- <bitácora> --confirmo");
  const bitacora = leerBitacora(ruta);

  const ids = [...new Set(bitacora.cambios.map((c) => c.id))];
  const filas = await prisma.profesor.findMany({
    where: { id: { in: ids } },
    select: { id: true, codigo: true, correo: true, genero: true, tipoContratacion: true, gradoId: true, departamentoId: true, cvu: true },
  });
  const actuales: EstadoActual = new Map(filas.map((f) => [f.id, f as Partial<Record<CampoCompletable, Valor | null>>]));
  const { revertir: aRevertir, conflictos } = prepararReversion(bitacora, actuales);

  console.log(`Cambios en la bitácora:   ${bitacora.cambios.length}`);
  console.log(`Se pueden revertir:       ${aRevertir.length}`);
  console.log(`Cambiaron después (no se tocan): ${conflictos.length}`);
  if (aRevertir.length === 0) return;
  if (!opciones.has("--confirmo")) {
    throw new Error(`Esto revertiría ${aRevertir.length} campos en la base. Si es lo que quieres, repite con --confirmo.`);
  }

  const revertidos = await prisma.$transaction(
    async (tx) => {
      let total = 0;
      for (const c of aRevertir) {
        const where = { id: c.id, [c.campo]: c.despues } as Prisma.ProfesorWhereInput;
        const data = { [c.campo]: c.antes } as Prisma.ProfesorUncheckedUpdateManyInput;
        total += (await tx.profesor.updateMany({ where, data })).count;
      }
      return total;
    },
    { timeout: 120_000 },
  );
  console.log(`\nRevertidos: ${revertidos}.`);
}

const comandos: Record<string, () => Promise<void>> = { simular, aplicar, revertir };

async function principal() {
  const accion = comandos[comando];
  if (!accion) {
    console.error(`Comando desconocido «${comando}». Usa: ${Object.keys(comandos).join(", ")}.`);
    process.exit(1);
  }
  console.log(`▸ importar:completar ${comando} · base: ${destino(connectionString!)}`);
  try {
    await accion();
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "P2002") {
      console.error("Un valor único (código, correo o CVU) ya lo tiene otra persona. No se escribió nada; repite la simulación.");
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
