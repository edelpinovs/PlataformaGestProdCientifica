import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo } from "@/modules/produccion/escaneo";
import { avanzarLote, datosLoteEsquema, resumenVacio, TIEMPO_RESERVA_MS, type DatosLote } from "@/modules/produccion/lotes";
import { repositorioPrisma } from "./repositorio";
import { debeEnriquecerAutores, FUENTES_ANTERIORES, type FuenteEscaneo } from "@/modules/produccion/fuentes";
import { TrabajoEscaneoPendiente } from "@/modules/produccion/fechas-escaneo";
import { rangoEfectivo, type RangoEscaneo } from "@/modules/produccion/rango-escaneo";

export const TIPOS_ESCANEO = ["escaneo-manual", "escaneo-diario"];
export const MENSAJE_REINTENTO_SIN_ACTIVOS = "Ninguno de los profesores sigue activo para reintentar.";


/**
 * Crea la búsqueda. `profesores` es un profesor, una lista (reintentos, #279) o nada para todos;
 * en cualquier caso solo entran los profesores activos (#259).
 */
export async function crearTrabajoEscaneo(tipo: string, profesores?: number | number[], rango?: RangoEscaneo, fuentes?: FuenteEscaneo[], enriquecerAutores?: boolean) {
  return prisma.$transaction(async transaccion => {
    // Serializa el inicio en todas las instancias, sin depender de un bloqueo en memoria.
    // $executeRaw y no $queryRaw: la función devuelve void y el adaptador de Prisma no puede leer esa columna.
    await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(170, 20)`;
    const pendiente = await transaccion.job.findFirst({
      where: { tipo: { in: TIPOS_ESCANEO }, estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
      orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    });
    if (pendiente) throw new TrabajoEscaneoPendiente(pendiente.id);
    const lista = Array.isArray(profesores);
    const elegidos = await transaccion.profesor.findMany({
      where: { estatusLaboral: "ACTIVO", ...(Array.isArray(profesores) ? { id: { in: profesores } } : profesores ? { id: profesores } : {}) },
      select: { id: true }, orderBy: { id: "asc" },
    });
    if (profesores !== undefined && elegidos.length === 0) {
      throw new Error(lista ? MENSAJE_REINTENTO_SIN_ACTIVOS : "El profesor no está disponible para escanear.");
    }
    const datos: DatosLote = {
      version: 1, profesoresIds: elegidos.map((profesor) => profesor.id), indice: 0,
      ...(rango ? { desde: rango.desde, hasta: rango.hasta } : {}), resumen: resumenVacio(),
      fuentes: fuentes ?? [...FUENTES_ANTERIORES],
      ...(enriquecerAutores === undefined ? {} : { enriquecerAutores }),
    };
    return transaccion.job.create({ data: {
      tipo, estado: elegidos.length ? "PENDIENTE" : "COMPLETADO",
      total: elegidos.length, datos,
    } });
  });
}

/** Reserva atómica entre peticiones de Coordinación; un timeout permite
 * recuperar el profesor pendiente después de diez minutos sin perder el índice.
 */
export async function procesarSiguienteProfesor(jobId: number) {
  const reserva = new Date();
  const adquirida = await prisma.job.updateMany({
    where: { id: jobId, tipo: { in: TIPOS_ESCANEO }, OR: [
      { estado: "PENDIENTE" },
      { estado: "EN_PROCESO", actualizadoEn: { lt: new Date(reserva.getTime() - TIEMPO_RESERVA_MS) } },
    ] },
    data: { estado: "EN_PROCESO", actualizadoEn: reserva },
  });
  if (!adquirida.count) return;
  const condicionReserva = { id: jobId, estado: "EN_PROCESO" as const, actualizadoEn: reserva };
  try {
    const trabajo = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    const datos = datosLoteEsquema.parse(trabajo.datos);
    const profesorId = datos.profesoresIds[datos.indice];
    if (profesorId === undefined) {
      await prisma.job.updateMany({ where: condicionReserva, data: { estado: "COMPLETADO", datos: { ...datos, fuenteEnCurso: null } } });
      return;
    }
    // El orquestador no controla este Job: el avance corresponde a toda la cola.
    const resultado = await ejecutarEscaneo({
      profesorId, rango: rangoEfectivo(datos), fuentes: datos.fuentes ?? [...FUENTES_ANTERIORES], limiteProfesores: 1,
      enriquecerAutores: debeEnriquecerAutores(datos),
      informarFuente: async (fuenteEnCurso) => {
        await prisma.job.updateMany({
          where: condicionReserva,
          // El indicador no renueva la reserva del profesor.
          data: { datos: { ...datos, fuenteEnCurso }, actualizadoEn: reserva },
        });
      },
    }, repositorioPrisma);
    const siguientes = avanzarLote({ ...datos, fuenteEnCurso: null }, resultado);
    const terminado = siguientes.indice === siguientes.profesoresIds.length;
    await prisma.job.updateMany({
      where: condicionReserva,
      data: {
        estado: terminado ? (siguientes.resumen.errores.length ? "FALLIDO" : "COMPLETADO") : "PENDIENTE",
        avance: siguientes.indice, datos: terminado ? { ...siguientes, finalizadoEn: new Date().toISOString() } : siguientes,
        error: siguientes.resumen.errores.length ? "Algunas consultas no se completaron. Puedes iniciar un nuevo escaneo para reintentarlas." : null,
      },
    });
  } catch {
    await prisma.job.updateMany({ where: condicionReserva, data: {
      estado: "FALLIDO", error: "No se pudo completar el lote. Inicia otro escaneo para reintentarlo.",
    } });
  }
}

/**
 * Detiene una búsqueda pendiente o en proceso (#279). Un profesor que se esté procesando termina,
 * pero su cierre exige EN_PROCESO y ya no sobrescribe el estado; lo guardado se conserva.
 * Devuelve false si la búsqueda ya había terminado o no existe.
 */
export async function cancelarTrabajoEscaneo(jobId: number) {
  const { count } = await prisma.job.updateMany({
    where: { id: jobId, tipo: { in: TIPOS_ESCANEO }, estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
    data: { estado: "CANCELADO", error: "La búsqueda se canceló antes de terminar." },
  });
  return count > 0;
}

export async function obtenerTrabajoPendiente() {
  return prisma.job.findFirst({
    where: { tipo: { in: TIPOS_ESCANEO }, estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
    orderBy: { creadoEn: "asc" },
  });
}
