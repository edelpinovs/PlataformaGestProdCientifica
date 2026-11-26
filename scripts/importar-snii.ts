// F5 de la importación 2027: crea los reconocimientos SNII reales del paquete (#357).
// Plan y criterio: docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P7, D-284) · docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:snii:simular                              calcula el plan; NO escribe en la base (lee para comparar)
//   npm run importar:snii:aplicar -- --confirmo                crea los periodos en una sola transacción y deja la bitácora
//   npm run importar:snii:revertir -- <bitácora> --confirmo    borra solo lo que conserva sus valores y no es resultado oficial
//
// Solo carga un periodo si el paquete trae su tipo de participación (D-284). Nunca escribe el CVU. Nunca usa TRUNCATE,
// borrados sin WHERE ni upsert.
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { ResultadoDictamen, type NivelSnii as NivelSniiBase } from "../src/generated/prisma/enums";
import { leerTablaPaquete2027 } from "./lib/datos-reales";
import {
  crearBitacoraSnii,
  informePlanSnii,
  planSnii,
  prepararReversionSnii,
  resumenAnonimo,
  type BitacoraSnii,
  type CreadoSnii,
  type ProfesorPaquete,
  type RegistroSnii,
  type SniiActual,
} from "./lib/importar-snii";

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

const aFecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const aIso = (fecha: Date) => fecha.toISOString().slice(0, 10);

const esObjeto = (r: unknown): r is Record<string, unknown> => typeof r === "object" && r !== null;

async function planear() {
  const [profesores, existentes] = await Promise.all([
    prisma.profesor.findMany({ select: { id: true, codigo: true, cvu: true } }),
    prisma.reconocimientoSnii.findMany({ select: { profesorId: true, inicio: true, fin: true } }),
  ]);
  const registros = leerTablaPaquete2027("reconocimientos_snii").registros.filter(
    (r): r is RegistroSnii =>
      esObjeto(r) &&
      typeof r.profesor_id === "string" &&
      typeof r.nivel === "string" &&
      typeof r.fecha_inicio === "string" &&
      typeof r.fecha_fin === "string",
  );
  const profesoresPaquete = leerTablaPaquete2027("profesores").registros.filter(
    (r): r is ProfesorPaquete => esObjeto(r) && typeof r.id === "string",
  );
  return planSnii(profesores, existentes, registros, profesoresPaquete, { hoy: aIso(new Date()) });
}

async function simular() {
  const plan = await planear();
  const salida = path.join(CARPETA, "plan-snii.md");
  writeFileSync(salida, informePlanSnii(plan), "utf8");
  console.log(resumenAnonimo(plan));
  console.log(`\nSimulación: no se escribió nada en la base. Detalle con nombres: ${salida}`);
}

const marca = (fecha: Date) => fecha.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-");

async function aplicar() {
  const plan = await planear();
  console.log(resumenAnonimo(plan));
  if (plan.crear.length === 0) {
    console.log("\nNada que crear.");
    return;
  }
  if (!opciones.has("--confirmo")) {
    throw new Error(`Esto crearía ${plan.crear.length} reconocimientos SNII en la base. Si es lo que quieres, repite con --confirmo.`);
  }

  // Un create por periodo (para conocer su id) dentro de una sola transacción: entran todos o ninguno.
  const creados = await prisma.$transaction(
    async (tx) => {
      const filas: CreadoSnii[] = [];
      for (const r of plan.crear) {
        const fila = await tx.reconocimientoSnii.create({
          data: {
            profesorId: r.profesorId,
            nivel: r.nivel,
            tipoParticipacion: r.tipoParticipacion,
            resultado: ResultadoDictamen.APROBADO,
            inicio: aFecha(r.inicio),
            fin: aFecha(r.fin),
            convocatoriaId: null,
          },
          select: { id: true },
        });
        filas.push({ id: fila.id, profesorId: r.profesorId, nivel: r.nivel, inicio: r.inicio, fin: r.fin });
      }
      return filas;
    },
    { timeout: 120_000 },
  );

  const fecha = new Date();
  const bitacora = crearBitacoraSnii(creados, fecha, destino(connectionString!));
  mkdirSync(path.join(CARPETA, "bitacoras"), { recursive: true });
  const archivo = path.join(CARPETA, "bitacoras", `snii-${marca(fecha)}.json`);
  writeFileSync(archivo, JSON.stringify(bitacora, null, 2), "utf8");
  console.log(`\nCreados: ${creados.length}. Bitácora: ${archivo}`);
  console.log("Para deshacer: npm run importar:snii:revertir -- <bitácora> --confirmo");
}

const esquemaBitacora = z.object(
  {
    fase: z.literal("snii", { error: "Esa bitácora no es de la fase «snii»." }),
    fecha: z.string({ error: "La bitácora no trae fecha." }),
    host: z.string({ error: "La bitácora no trae el destino." }),
    creados: z.array(
      z.object({
        id: z.number({ error: "La bitácora trae un id que no es un número." }).int(),
        profesorId: z.number({ error: "La bitácora trae un profesor que no es un número." }).int(),
        nivel: z.string({ error: "La bitácora trae un nivel que no es texto." }),
        inicio: z.string({ error: "La bitácora trae una fecha de inicio que no es texto." }),
        fin: z.string({ error: "La bitácora trae una fecha de fin que no es texto." }),
      }),
      { error: "La bitácora no trae la lista de periodos creados." },
    ),
  },
  { error: "El archivo no tiene el formato de una bitácora de SNII." },
);

function leerBitacora(ruta: string): BitacoraSnii {
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
  if (!ruta) throw new Error("Indica la bitácora: npm run importar:snii:revertir -- <bitácora> --confirmo");
  const bitacora = leerBitacora(ruta);

  const filas = await prisma.reconocimientoSnii.findMany({
    where: { id: { in: bitacora.creados.map((c) => c.id) } },
    select: { id: true, profesorId: true, nivel: true, inicio: true, fin: true, convocatoriaId: true },
  });
  const actuales = new Map<number, SniiActual>(
    filas.map((f) => [
      f.id,
      { profesorId: f.profesorId, nivel: f.nivel, inicio: aIso(f.inicio), fin: aIso(f.fin), convocatoriaId: f.convocatoriaId },
    ]),
  );
  const { borrar, conflictos } = prepararReversionSnii(bitacora, actuales);

  console.log(`Periodos en la bitácora:           ${bitacora.creados.length}`);
  console.log(`Se pueden intentar borrar:         ${borrar.length}`);
  console.log(`Cambiaron o ya no existen (no se tocan): ${conflictos.length}`);
  if (borrar.length === 0) return;
  if (!opciones.has("--confirmo")) {
    throw new Error(`Esto borraría ${borrar.length} reconocimientos SNII. Si es lo que quieres, repite con --confirmo.`);
  }

  // Cada borrado lleva su condición: id y valores intactos y sin convocatoria (D-107: un resultado oficial no se borra).
  const borrados = await prisma.$transaction(
    async (tx) => {
      let total = 0;
      for (const c of borrar) {
        total += (
          await tx.reconocimientoSnii.deleteMany({
            where: {
              id: c.id,
              profesorId: c.profesorId,
              nivel: c.nivel as NivelSniiBase,
              inicio: aFecha(c.inicio),
              fin: aFecha(c.fin),
              convocatoriaId: null,
            },
          })
        ).count;
      }
      return total;
    },
    { timeout: 120_000 },
  );
  console.log(`\nBorrados: ${borrados}.`);
}

const comandos: Record<string, () => Promise<void>> = { simular, aplicar, revertir };

async function principal() {
  const accion = comandos[comando];
  if (!accion) {
    console.error(`Comando desconocido «${comando}». Usa: ${Object.keys(comandos).join(", ")}.`);
    process.exit(1);
  }
  console.log(`▸ importar:snii ${comando} · base: ${destino(connectionString!)}`);
  try {
    await accion();
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "P2003") {
      console.error("Un reconocimiento tiene datos asociados y no se puede borrar. No se borró nada.");
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
