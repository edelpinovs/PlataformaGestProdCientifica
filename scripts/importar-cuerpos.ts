// F7 de la importación 2027: crea los Cuerpos Académicos reales con sus integrantes y LGAC (#359).
// Plan y criterio: docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P10, P11, D-287, D-288) · docs/IMPORTACION_DATOS_REALES.md.
//   npm run importar:cuerpos:simular                              calcula el plan; NO escribe en la base (lee para comparar)
//   npm run importar:cuerpos:aplicar -- --confirmo                crea los CA en una sola transacción y deja la bitácora
//   npm run importar:cuerpos:revertir -- <bitácora> --confirmo    borra solo los CA que nadie ha cambiado
//
// Aplica las reglas de la pantalla de Cuerpos Académicos. Un CA que ya existe no se modifica. Nunca usa TRUNCATE,
// borrados sin WHERE ni upsert.
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { filtroLiderIntegrante } from "../src/modules/cuerpos-academicos/lider";
import { tieneProdepActivo } from "../src/modules/reconocimientos/prodep";
import { PrismaClient } from "../src/generated/prisma/client";
import { leerTablaPaquete2027 } from "./lib/datos-reales";
import {
  crearBitacoraCuerpos,
  informePlanCuerpos,
  planCuerpos,
  prepararReversionCuerpos,
  resumenAnonimo,
  type BitacoraCuerpos,
  type CreadoCuerpo,
  type CuerpoActual,
  type ProfesorPaqueteCa,
  type RegistroCuerpo,
  type RegistroIntegrante,
  type RegistroLgac,
} from "./lib/importar-cuerpos";

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

const esObjeto = (r: unknown): r is Record<string, unknown> => typeof r === "object" && r !== null;
const lista = <T>(nombre: string, valido: (r: Record<string, unknown>) => boolean) =>
  leerTablaPaquete2027(nombre).registros.filter((r): r is T => esObjeto(r) && valido(r));

async function planear() {
  const hoy = new Date();
  const [profesores, departamentos, cuerpos] = await Promise.all([
    prisma.profesor.findMany({
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        tipoContratacion: true,
        estatusLaboral: true,
        reconocimientosProdep: { select: { resultado: true, inicio: true, fin: true } },
      },
    }),
    prisma.departamento.findMany({ select: { id: true, nombre: true, nomenclatura: true } }),
    prisma.cuerpoAcademico.findMany({ select: { clave: true } }),
  ]);
  return planCuerpos(
    profesores.map(({ reconocimientosProdep, ...p }) => ({ ...p, prodepActivo: tieneProdepActivo(reconocimientosProdep, hoy) })),
    departamentos,
    cuerpos.map((c) => c.clave),
    lista<RegistroCuerpo>("cuerpos_academicos", (r) => typeof r.id === "string" && typeof r.clave === "string" && typeof r.nombre === "string"),
    lista<RegistroIntegrante>("ca_integrantes", (r) => typeof r.ca_id === "string" && typeof r.profesor_id === "string"),
    lista<RegistroLgac>("ca_lgac", (r) => typeof r.ca_id === "string"),
    lista<ProfesorPaqueteCa>("profesores", (r) => typeof r.id === "string"),
  );
}

async function simular() {
  const plan = await planear();
  const salida = path.join(CARPETA, "plan-cuerpos.md");
  writeFileSync(salida, informePlanCuerpos(plan), "utf8");
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
    throw new Error(`Esto crearía ${plan.crear.length} cuerpos académicos en la base. Si es lo que quieres, repite con --confirmo.`);
  }

  // Un CA completo a la vez (para conocer sus ids) dentro de una sola transacción: entran todos o ninguno.
  const creados = await prisma.$transaction(
    async (tx) => {
      const filas: CreadoCuerpo[] = [];
      for (const c of plan.crear) {
        const { id } = await tx.cuerpoAcademico.create({
          data: {
            clave: c.clave,
            nombre: c.nombre,
            nivel: c.nivel,
            areaProdep: c.areaProdep,
            disciplina: c.disciplina,
            departamentoId: c.departamentoId,
            anioRegistro: c.anioRegistro,
            anioVencimiento: c.anioVencimiento,
          },
          select: { id: true },
        });
        if (c.integrantes.length > 0) {
          await tx.integranteCa.createMany({ data: c.integrantes.map((i) => ({ cuerpoId: id, profesorId: i.profesorId })) });
        }
        // D-111: el líder se guarda con la condición de que siga siendo integrante dentro de la misma escritura.
        if (c.liderId !== null) {
          const { count } = await tx.cuerpoAcademico.updateMany({
            where: filtroLiderIntegrante(id, c.liderId),
            data: { liderId: c.liderId },
          });
          if (count !== 1) throw new Error("No se pudo asignar un líder que no es integrante. No se escribió nada.");
        }
        const lgacIds: number[] = [];
        for (const nombre of c.lgacs) {
          const l = await tx.lgac.create({ data: { cuerpoId: id, nombre }, select: { id: true } });
          lgacIds.push(l.id);
        }
        filas.push({ id, clave: c.clave, profesorIds: c.integrantes.map((i) => i.profesorId), lgacIds, liderId: c.liderId });
      }
      return filas;
    },
    { timeout: 120_000 },
  );

  const fecha = new Date();
  const bitacora = crearBitacoraCuerpos(creados, fecha, destino(connectionString!));
  mkdirSync(path.join(CARPETA, "bitacoras"), { recursive: true });
  const archivo = path.join(CARPETA, "bitacoras", `cuerpos-${marca(fecha)}.json`);
  writeFileSync(archivo, JSON.stringify(bitacora, null, 2), "utf8");
  console.log(`\nCreados: ${creados.length}. Bitácora: ${archivo}`);
  console.log("Para deshacer: npm run importar:cuerpos:revertir -- <bitácora> --confirmo");
}

const entero = z.number({ error: "La bitácora trae un id que no es un número." }).int();
const esquemaBitacora = z.object(
  {
    fase: z.literal("cuerpos", { error: "Esa bitácora no es de la fase «cuerpos»." }),
    fecha: z.string({ error: "La bitácora no trae fecha." }),
    host: z.string({ error: "La bitácora no trae el destino." }),
    creados: z.array(
      z.object({
        id: entero,
        clave: z.string({ error: "La bitácora trae una clave que no es texto." }),
        profesorIds: z.array(entero),
        lgacIds: z.array(entero),
        liderId: entero.nullable(),
      }),
      { error: "La bitácora no trae la lista de cuerpos creados." },
    ),
  },
  { error: "El archivo no tiene el formato de una bitácora de cuerpos académicos." },
);

function leerBitacora(ruta: string): BitacoraCuerpos {
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
  if (!ruta) throw new Error("Indica la bitácora: npm run importar:cuerpos:revertir -- <bitácora> --confirmo");
  const bitacora = leerBitacora(ruta);

  const filas = await prisma.cuerpoAcademico.findMany({
    where: { id: { in: bitacora.creados.map((c) => c.id) } },
    select: {
      id: true,
      clave: true,
      liderId: true,
      integrantes: { select: { profesorId: true } },
      lgacs: { select: { id: true, _count: { select: { profesores: true } } } },
    },
  });
  const actuales = new Map<number, CuerpoActual>(
    filas.map((f) => [
      f.id,
      {
        clave: f.clave,
        profesorIds: f.integrantes.map((i) => i.profesorId),
        lgacs: f.lgacs.map((l) => ({ id: l.id, profesores: l._count.profesores })),
        liderId: f.liderId,
      },
    ]),
  );
  const { borrar, conflictos } = prepararReversionCuerpos(bitacora, actuales);

  console.log(`Cuerpos en la bitácora:            ${bitacora.creados.length}`);
  console.log(`Se pueden intentar borrar:         ${borrar.length}`);
  console.log(`Cambiaron o ya no existen (no se tocan): ${conflictos.length}`);
  if (borrar.length === 0) return;
  if (!opciones.has("--confirmo")) {
    throw new Error(`Esto borraría ${borrar.length} cuerpos académicos con sus integrantes y LGAC. Si es lo que quieres, repite con --confirmo.`);
  }

  // Cada borrado lleva su condición y, si algo no cuadra, se deshace todo. Primero lo que cuelga del CA, luego el CA.
  const borrados = await prisma.$transaction(
    async (tx) => {
      let total = 0;
      for (const c of borrar) {
        const lgac = await tx.lgac.deleteMany({ where: { id: { in: c.lgacIds }, cuerpoId: c.id, profesores: { none: {} } } });
        if (lgac.count !== c.lgacIds.length) throw new Error("Una LGAC cambió durante la reversión. No se borró nada.");
        const integrantes = await tx.integranteCa.deleteMany({ where: { cuerpoId: c.id, profesorId: { in: c.profesorIds } } });
        if (integrantes.count !== c.profesorIds.length) throw new Error("Un integrante cambió durante la reversión. No se borró nada.");
        const cuerpo = await tx.cuerpoAcademico.deleteMany({
          where: { id: c.id, clave: c.clave, integrantes: { none: {} }, lgacs: { none: {} } },
        });
        if (cuerpo.count !== 1) throw new Error("Un cuerpo académico cambió durante la reversión. No se borró nada.");
        total += cuerpo.count;
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
  console.log(`▸ importar:cuerpos ${comando} · base: ${destino(connectionString!)}`);
  try {
    await accion();
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "P2002") {
      console.error("Otra persona creó un cuerpo académico con la misma clave mientras tanto. No se escribió nada; repite la simulación.");
    } else if (codigo === "P2003") {
      console.error("Un cuerpo académico tiene datos asociados y no se puede borrar. No se borró nada.");
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void principal();
