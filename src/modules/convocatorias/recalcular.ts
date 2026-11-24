import type { Prisma } from "@/generated/prisma/client";
import { calcularParticipaciones } from "./participantes";

// RF-018: el resultado de los participantes sale del cruce con el listado oficial.
// Mientras la carga está en revisión el resultado es solo preliminar y no se guarda: el reporte
// de convocatoria anual (RF-028) cuenta como «no aprobado» lo que esté guardado en la
// participación. Se escribe al confirmar la carga (la actualización masiva de RF-019).

type Cliente = Prisma.TransactionClient;
type EstadoLeido = "EN_REVISION" | "CONFIRMADA";

/**
 * Profesores que coincidieron en la carga más reciente de la convocatoria con ese estado, o
 * `null` si no hay ninguna. `EN_REVISION` da el resultado preliminar; `CONFIRMADA`, el oficial.
 */
export async function profesoresEnListado(tx: Cliente, convocatoriaId: number, estado: EstadoLeido): Promise<Set<number> | null> {
  const carga = await tx.cargaResultados.findFirst({
    where: { convocatoriaId, estado },
    orderBy: [{ creadaEn: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  if (!carga) return null;
  const filas = await tx.renglonResultado.findMany({
    where: { cargaId: carga.id, profesorId: { not: null } },
    select: { profesorId: true },
    distinct: ["profesorId"],
  });
  return new Set(filas.map((f) => f.profesorId!));
}

/** Guarda el resultado oficial según la carga confirmada. Lo llamará la confirmación (RF-019). */
export async function recalcularConvocatoria(tx: Cliente, convocatoriaId: number): Promise<void> {
  const enListado = await profesoresEnListado(tx, convocatoriaId, "CONFIRMADA");
  const actuales = await tx.participacionConvocatoria.findMany({
    where: { convocatoriaId },
    select: { id: true, profesorId: true, origen: true, resultado: true },
  });
  const cambios = calcularParticipaciones(actuales, enListado);

  if (cambios.borrar.length) {
    await tx.participacionConvocatoria.deleteMany({ where: { id: { in: cambios.borrar } } });
  }
  if (cambios.crear.length) {
    await tx.participacionConvocatoria.createMany({
      data: cambios.crear.map((profesorId) => ({ convocatoriaId, profesorId, origen: "LISTADO" as const, resultado: "APROBADO" as const })),
      skipDuplicates: true,
    });
  }
  const actualizar = [
    [cambios.aprobar, "APROBADO"],
    [cambios.noAprobar, "NO_APROBADO"],
    [cambios.limpiar, null],
  ] as const;
  for (const [ids, resultado] of actualizar) {
    if (ids.length) await tx.participacionConvocatoria.updateMany({ where: { id: { in: [...ids] } }, data: { resultado } });
  }
}
