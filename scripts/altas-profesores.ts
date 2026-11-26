// F4 de la importación 2027: da de alta a los profesores del paquete que todavía no están en la base (#356).
// Plan y criterio: docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P6, D-283) · docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:altas:simular                              calcula el plan; NO escribe en la base (lee para comparar)
//   npm run importar:altas:aplicar -- --confirmo                crea a las personas en una sola transacción y deja la bitácora
//   npm run importar:altas:revertir -- <bitácora> --confirmo    borra solo a quien conserva su código y su correo y no tiene datos
//
// Solo crea a quien tiene código UdeG real y correo institucional. Nunca usa TRUNCATE, borrados sin WHERE ni upsert.
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  crearBitacoraAltas,
  informePlanAltas,
  planAltas,
  prepararReversionAltas,
  resumenAnonimo,
  type BitacoraAltas,
  type CreadoBitacora,
} from "./lib/altas-profesores";
import { SIN_USO_PROFESOR } from "./lib/cargar-profesores";
import type { RegistroPaquete } from "./lib/completar-profesores";
import { leerPaquete2027 } from "./lib/datos-reales";

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

async function planear() {
  const [profesores, grados, departamentos] = await Promise.all([
    prisma.profesor.findMany({ select: { codigo: true, correo: true, nombreNormalizado: true, cvu: true } }),
    prisma.gradoCientifico.findMany({ select: { id: true, nomenclatura: true } }),
    prisma.departamento.findMany({ select: { id: true, nomenclatura: true } }),
  ]);
  const registros = leerPaquete2027().profesores.filter(
    (r): r is RegistroPaquete =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as RegistroPaquete).nombres === "string" &&
      typeof (r as RegistroPaquete).apellidos === "string",
  );
  return planAltas(profesores, registros, { grados, departamentos });
}

async function simular() {
  const plan = await planear();
  const salida = path.join(CARPETA, "plan-altas.md");
  writeFileSync(salida, informePlanAltas(plan), "utf8");
  console.log(resumenAnonimo(plan));
  console.log(`\nSimulación: no se escribió nada en la base. Detalle con nombres: ${salida}`);
}

const marca = (fecha: Date) => fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-");

async function aplicar() {
  const plan = await planear();
  console.log(resumenAnonimo(plan));
  if (plan.crear.length === 0) {
    console.log("\nNada que dar de alta.");
    return;
  }
  if (!opciones.has("--confirmo")) {
    throw new Error(
      `Esto crearía ${plan.crear.length} profesores en la base. Si es lo que quieres, repite con --confirmo.`,
    );
  }

  // Un create por persona (para conocer su id) dentro de una sola transacción: entran todas o ninguna.
  const creados = await prisma.$transaction(
    async (tx) => {
      const filas: CreadoBitacora[] = [];
      for (const p of plan.crear) {
        const fila = await tx.profesor.create({
          data: {
            codigo: p.codigo,
            correo: p.correo,
            nombres: p.nombres,
            apellidos: p.apellidos,
            nombreNormalizado: p.nombreNormalizado,
            genero: p.genero,
            tipoContratacion: p.tipoContratacion,
            gradoId: p.gradoId,
            departamentoId: p.departamentoId,
            cvu: p.cvu,
          },
          select: { id: true, codigo: true, correo: true },
        });
        filas.push(fila);
      }
      return filas;
    },
    { timeout: 120_000 },
  );

  const fecha = new Date();
  const bitacora = crearBitacoraAltas(creados, fecha, destino(connectionString!));
  mkdirSync(path.join(CARPETA, "bitacoras"), { recursive: true });
  const archivo = path.join(CARPETA, "bitacoras", `altas-${marca(fecha)}.json`);
  writeFileSync(archivo, JSON.stringify(bitacora, null, 2), "utf8");
  console.log(`\nCreados: ${creados.length}. Bitácora: ${archivo}`);
  console.log("Para deshacer: npm run importar:altas:revertir -- <bitácora> --confirmo");
}

const esquemaBitacora = z.object(
  {
    fase: z.literal("altas", { error: "Esa bitácora no es de la fase «altas»." }),
    fecha: z.string({ error: "La bitácora no trae fecha." }),
    host: z.string({ error: "La bitácora no trae el destino." }),
    creados: z.array(
      z.object({
        id: z.number({ error: "La bitácora trae un id que no es un número." }).int(),
        codigo: z.string({ error: "La bitácora trae un código que no es texto." }),
        correo: z.string({ error: "La bitácora trae un correo que no es texto." }),
      }),
      { error: "La bitácora no trae la lista de personas creadas." },
    ),
  },
  { error: "El archivo no tiene el formato de una bitácora de altas." },
);

function leerBitacora(ruta: string): BitacoraAltas {
  const completa = path.resolve(ruta);
  if (!completa.startsWith(CARPETA + path.sep)) throw new Error("La bitácora debe estar dentro de datos-reales/.");
  if (!existsSync(completa)) throw new Error(`No existe la bitácora ${completa}.`);
  let datos: unknown;
  try {
    datos = JSON.parse(readFileSync(completa, "utf8"));
  } catch {
    throw new Error("La bitácora no es un JSON válido.");
  }
  const resultado = esquemaBitacora.safeParse(datos);
  if (!resultado.success) throw new Error(resultado.error.issues[0]?.message ?? "La bitácora no es válida.");
  return resultado.data;
}

async function revertir() {
  const ruta = argumentos[0];
  if (!ruta) throw new Error("Indica la bitácora: npm run importar:altas:revertir -- <bitácora> --confirmo");
  const bitacora = leerBitacora(ruta);

  const filas = await prisma.profesor.findMany({
    where: { id: { in: bitacora.creados.map((c) => c.id) } },
    select: { id: true, codigo: true, correo: true },
  });
  const { borrar, conflictos } = prepararReversionAltas(bitacora, new Map(filas.map((f) => [f.id, f])));

  console.log(`Personas en la bitácora:           ${bitacora.creados.length}`);
  console.log(`Se pueden intentar borrar:         ${borrar.length}`);
  console.log(`Cambiaron o ya no existen (no se tocan): ${conflictos.length}`);
  if (borrar.length === 0) return;
  if (!opciones.has("--confirmo")) {
    throw new Error(`Esto intentaría borrar ${borrar.length} profesores. Si es lo que quieres, repite con --confirmo.`);
  }

  // Cada borrado lleva su condición: id, código y correo intactos y nada colgando (SIN_USO_PROFESOR).
  const borrados = await prisma.$transaction(
    async (tx) => {
      let total = 0;
      for (const c of borrar) {
        total += (
          await tx.profesor.deleteMany({ where: { id: c.id, codigo: c.codigo, correo: c.correo, ...SIN_USO_PROFESOR } })
        ).count;
      }
      return total;
    },
    { timeout: 120_000 },
  );
  console.log(`\nBorrados: ${borrados}. Con datos asociados (no se borran): ${borrar.length - borrados}.`);
}

const comandos: Record<string, () => Promise<void>> = { simular, aplicar, revertir };

async function principal() {
  const accion = comandos[comando];
  if (!accion) {
    console.error(`Comando desconocido «${comando}». Usa: ${Object.keys(comandos).join(", ")}.`);
    process.exit(1);
  }
  console.log(`▸ importar:altas ${comando} · base: ${destino(connectionString!)}`);
  try {
    await accion();
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "P2002") {
      console.error("Un valor único (código, correo o CVU) ya lo tiene otra persona. No se escribió nada; repite la simulación.");
    } else if (codigo === "P2003") {
      console.error("Una persona tiene datos asociados y no se puede borrar. No se borró nada.");
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
