import type { Prisma } from "@/generated/prisma/client";
import type { EntradaConfirmacion } from "./confirmacion";

// RF-019: lee lo que necesita planearConfirmacion. Solo los renglones que importan (con profesor o
// dudosos): en el listado nacional del SNII casi todo lo demás es de otras instituciones.
// Recibe el cliente de la transacción para que la confirmación lea y escriba sobre el mismo estado.

const dia = (fecha: Date | null) => (fecha ? fecha.toISOString().slice(0, 10) : null);

export async function cargarConfirmacion(
  tx: Prisma.TransactionClient,
  cargaId: number,
  convocatoria: { programa: string; anio: number },
): Promise<EntradaConfirmacion> {
  const programa = convocatoria.programa === "PRODEP" ? "PRODEP" : "SNII";
  const renglones = await tx.renglonResultado.findMany({
    where: { cargaId, OR: [{ profesorId: { not: null } }, { criterio: "AMBIGUO" }] },
    select: {
      id: true, numero: true, apellidoPaterno: true, apellidoMaterno: true, nombres: true,
      profesorId: true, criterio: true, nivel: true, vigenciaInicio: true, vigenciaFin: true,
    },
    orderBy: { numero: "asc" },
  });
  const ids = [...new Set(renglones.flatMap((r) => (r.profesorId === null ? [] : [r.profesorId])))];

  const [profesores, historialSnii, historialProdep] = await Promise.all([
    programa === "PRODEP" && ids.length
      ? tx.profesor.findMany({ where: { id: { in: ids } }, select: { id: true, tipoContratacion: true } })
      : [],
    programa === "SNII" && ids.length
      ? tx.reconocimientoSnii.findMany({ where: { profesorId: { in: ids } }, select: { id: true, profesorId: true, resultado: true, inicio: true, fin: true } })
      : [],
    programa === "PRODEP" && ids.length
      ? tx.reconocimientoProdep.findMany({
        where: { profesorId: { in: ids } },
        select: { id: true, profesorId: true, tipoSolicitud: true, resultado: true, inicio: true, fin: true },
      })
      : [],
  ]);

  return {
    programa,
    anio: convocatoria.anio,
    renglones: renglones.map((r) => ({
      id: r.id,
      numero: r.numero,
      nombre: [r.apellidoPaterno, r.apellidoMaterno, r.nombres].filter(Boolean).join(" "),
      profesorId: r.profesorId,
      criterio: r.criterio,
      // La lectura nunca guarda «No aprobado» como nivel de un renglón.
      nivel: r.nivel === "NO_APROBADO" ? null : r.nivel,
      vigenciaInicio: dia(r.vigenciaInicio),
      vigenciaFin: dia(r.vigenciaFin),
    })),
    contratacion: Object.fromEntries(profesores.map((p) => [p.id, p.tipoContratacion])),
    historialSnii: historialSnii.map((h) => ({ id: h.id, profesorId: h.profesorId, resultado: h.resultado, inicio: dia(h.inicio)!, fin: dia(h.fin)! })),
    historialProdep: historialProdep.map((h) => ({
      id: h.id, profesorId: h.profesorId, tipoSolicitud: h.tipoSolicitud, resultado: h.resultado, inicio: dia(h.inicio)!, fin: dia(h.fin)!,
    })),
  };
}
