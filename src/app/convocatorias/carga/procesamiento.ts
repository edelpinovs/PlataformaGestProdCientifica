import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BUCKET, extension, TIEMPO_ATASCO_MS } from "@/modules/convocatorias/carga";
import { filasDeExcel } from "@/modules/convocatorias/lector-excel";
import { fragmentosDePdf } from "@/modules/convocatorias/lector-pdf";
import { cruzarRenglones } from "@/modules/convocatorias/cruce";
import { interpretarListado } from "@/modules/convocatorias/lectura";
import { agruparEnFilas } from "@/modules/convocatorias/pdf-filas";
import { recalcularConvocatoria } from "@/modules/convocatorias/recalcular";

// RF-017 (RNF-001): lee el archivo de una carga en segundo plano y guarda sus renglones.
// RF-018: antes de guardarlos los cruza con el directorio y recalcula los participantes.
// No es Server Action (no lleva "use server"): solo la llaman registrarCarga y volverALeer,
// que ya revisaron el permiso, y recibe el cliente de Storage con la sesión de esa persona.

export const TIPO_TAREA = "carga-resultados";
export { TIEMPO_ATASCO_MS };
const TAMANO_BLOQUE = 1000;

const SIN_CARGA = "Esa carga ya no existe.";
const SIN_DESCARGA = "No se pudo descargar el archivo. Vuelve a leerlo en unos minutos.";
const ESCANEADO = "El PDF no tiene texto seleccionable (parece escaneado); súbelo en Excel.";
const ERROR_GENERAL = "No se pudo leer el archivo. Vuelve a intentarlo o súbelo en Excel.";

// Lo único que se usa de Storage; permite pasar el cliente de Supabase o un doble en las pruebas.
export type AlmacenArchivos = {
  storage: { from(bucket: string): { download(ruta: string): Promise<{ data: Blob | null; error: unknown }> } };
};

class ErrorLectura extends Error {}
// Otra lectura retomó la tarea por atasco: se revierte lo hecho y la carga queda en sus manos.
class ReservaPerdida extends Error {}

const datosTarea = z.looseObject({ cargaId: z.number().int().positive() });

async function filasDelArchivo(ruta: string, datos: Uint8Array): Promise<string[][]> {
  if (extension(ruta) !== "pdf") return filasDeExcel(datos);
  const fragmentos = await fragmentosDePdf(datos);
  if (fragmentos.length === 0) throw new ErrorLectura(ESCANEADO);
  return agruparEnFilas(fragmentos);
}

export async function procesarCarga(jobId: number, almacen: AlmacenArchivos): Promise<void> {
  // Reserva atómica, como el escaneo de M6: si otra lectura ya la tomó, no se hace nada.
  const reserva = new Date();
  const adquirida = await prisma.job.updateMany({
    where: {
      id: jobId,
      tipo: TIPO_TAREA,
      OR: [
        { estado: "PENDIENTE" },
        { estado: "EN_PROCESO", actualizadoEn: { lt: new Date(reserva.getTime() - TIEMPO_ATASCO_MS) } },
      ],
    },
    data: { estado: "EN_PROCESO", actualizadoEn: reserva },
  });
  if (!adquirida.count) return;
  const reservada = { id: jobId, estado: "EN_PROCESO" as const, actualizadoEn: reserva };

  let cargaId: number | undefined;
  try {
    const tarea = await prisma.job.findUnique({ where: { id: jobId } });
    const datos = datosTarea.safeParse(tarea?.datos);
    if (!datos.success) throw new ErrorLectura(SIN_CARGA);
    cargaId = datos.data.cargaId;

    const carga = await prisma.cargaResultados.findUnique({
      where: { id: cargaId },
      select: { archivoRuta: true, convocatoriaId: true, convocatoria: { select: { programa: true } } },
    });
    if (!carga) throw new ErrorLectura(SIN_CARGA);

    const { data: archivo, error } = await almacen.storage.from(BUCKET).download(carga.archivoRuta);
    if (error || !archivo) throw new ErrorLectura(SIN_DESCARGA);
    const filas = await filasDelArchivo(carga.archivoRuta, new Uint8Array(await archivo.arrayBuffer()));

    const lectura = interpretarListado(filas, carga.convocatoria.programa);
    if (!lectura.ok) throw new ErrorLectura(lectura.error);

    // RF-018: solo el directorio activo; un profesor dado de baja no cuenta como coincidencia.
    const activos = await prisma.profesor.findMany({
      where: { estatusLaboral: "ACTIVO" },
      select: { id: true, cvu: true, codigo: true, nombres: true, apellidos: true },
    });
    const cruce = cruzarRenglones(lectura.renglones, activos);
    const resumen = { ...lectura.resumen, cruce: cruce.resumen };
    const convocatoriaId = carga.convocatoriaId;

    const id = cargaId;
    await prisma.$transaction(
      async (tx) => {
        // Volver a leer reemplaza lo leído antes: no se duplican renglones.
        await tx.renglonResultado.deleteMany({ where: { cargaId: id } });
        for (let i = 0; i < lectura.renglones.length; i += TAMANO_BLOQUE) {
          const bloque = lectura.renglones.slice(i, i + TAMANO_BLOQUE);
          await tx.renglonResultado.createMany({
            data: bloque.map((renglon, j) => ({ ...renglon, ...cruce.cruces[i + j], cargaId: id })),
          });
        }
        const { count } = await tx.cargaResultados.updateMany({
          where: { id, estado: "PROCESANDO" },
          data: { estado: "EN_REVISION" },
        });
        if (!count) throw new ErrorLectura(SIN_CARGA);
        await recalcularConvocatoria(tx, convocatoriaId);
        const cerrada = await tx.job.updateMany({
          where: reservada,
          data: { estado: "COMPLETADO", avance: 1, datos: { ...datos.data, resumen }, error: null },
        });
        if (!cerrada.count) throw new ReservaPerdida();
      },
      // Unos 10,000 renglones tardan más que los 5 s que Prisma da por defecto a una transacción.
      { maxWait: 10_000, timeout: 120_000 },
    );
  } catch (error) {
    if (error instanceof ReservaPerdida) return;
    const mensaje = error instanceof ErrorLectura ? error.message : ERROR_GENERAL;
    await prisma.job.updateMany({ where: reservada, data: { estado: "FALLIDO", error: mensaje } }).catch(() => {});
    if (cargaId) {
      await prisma.cargaResultados
        .updateMany({ where: { id: cargaId, estado: "PROCESANDO" }, data: { estado: "FALLIDA" } })
        .catch(() => {});
    }
  }
}
