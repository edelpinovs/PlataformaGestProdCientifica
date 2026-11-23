import type { Prisma } from "@/generated/prisma/client";
import { calcularParticipaciones } from "./participantes";

// RF-018: aplica en la base el estatus de los participantes de una convocatoria. Se llama dentro
// de una transacción al terminar la lectura, al eliminar una carga y al registrar o quitar un
// participante. La carga vigente es la más reciente que ya se leyó (en revisión o confirmada).

type Cliente = Prisma.TransactionClient;

/** Profesores que coincidieron en la carga vigente, o `null` si la convocatoria no tiene una leída. */
export async function profesoresEnListado(tx: Cliente, convocatoriaId: number): Promise<Set<number> | null> {
  const vigente = await tx.cargaResultados.findFirst({
    where: { convocatoriaId, estado: { in: ["EN_REVISION", "CONFIRMADA"] } },
    orderBy: [{ creadaEn: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  if (!vigente) return null;
  const filas = await tx.renglonResultado.findMany({
    where: { cargaId: vigente.id, profesorId: { not: null } },
    select: { profesorId: true },
    distinct: ["profesorId"],
  });
  return new Set(filas.map((f) => f.profesorId!));
}

export async function recalcularConvocatoria(tx: Cliente, convocatoriaId: number): Promise<void> {
  const enListado = await profesoresEnListado(tx, convocatoriaId);
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
