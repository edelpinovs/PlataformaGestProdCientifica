import { prisma } from "@/lib/prisma";
import { ejecutarEscaneo } from "@/modules/produccion/escaneo";
import { avanzarLote, datosLoteEsquema, resumenVacio, type DatosLote } from "@/modules/produccion/lotes";
import { repositorioPrisma } from "./repositorio";

export const TIPOS_ESCANEO = ["escaneo-manual", "escaneo-diario"];
const TIEMPO_RESERVA_MS = 10 * 60 * 1000;

export async function crearTrabajoEscaneo(tipo: string, profesorId?: number, anio?: number) {
  const profesores = await prisma.profesor.findMany({
    where: { estatusLaboral: "ACTIVO", ...(profesorId ? { id: profesorId } : {}) },
    select: { id: true }, orderBy: { id: "asc" },
  });
  if (profesorId && profesores.length === 0) throw new Error("El profesor no está disponible para escanear.");
  const datos: DatosLote = {
    version: 1, profesoresIds: profesores.map((profesor) => profesor.id), indice: 0,
    ...(anio ? { anio } : {}), resumen: resumenVacio(),
  };
  return prisma.job.create({ data: {
    tipo, estado: profesores.length ? "PENDIENTE" : "COMPLETADO",
    total: profesores.length, datos,
  } });
}

/** Reserva atómica compartida entre cron y navegador; un timeout permite
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
      await prisma.job.updateMany({ where: condicionReserva, data: { estado: "COMPLETADO" } });
      return;
    }
    // El orquestador no controla este Job: el avance corresponde a toda la cola.
    const resultado = await ejecutarEscaneo({ profesorId, anio: datos.anio, limiteProfesores: 1 }, repositorioPrisma);
    const siguientes = avanzarLote(datos, resultado);
    const terminado = siguientes.indice === siguientes.profesoresIds.length;
    await prisma.job.updateMany({
      where: condicionReserva,
      data: {
        estado: terminado ? (siguientes.resumen.errores.length ? "FALLIDO" : "COMPLETADO") : "PENDIENTE",
        avance: siguientes.indice, datos: siguientes,
        error: siguientes.resumen.errores.length ? "Algunas consultas no se completaron. Puedes iniciar un nuevo escaneo para reintentarlas." : null,
      },
    });
  } catch {
    await prisma.job.updateMany({ where: condicionReserva, data: {
      estado: "FALLIDO", error: "No se pudo completar el lote. Inicia otro escaneo para reintentarlo.",
    } });
  }
}

export async function obtenerTrabajoPendiente() {
  return prisma.job.findFirst({
    where: { tipo: { in: TIPOS_ESCANEO }, estado: { in: ["PENDIENTE", "EN_PROCESO"] } },
    orderBy: { creadoEn: "asc" },
  });
}
