"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { registrarAuditoria } from "@/lib/auditoria";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidarProfesorSeleccionado } from "@/lib/selectores/profesor";
import { eventoAuditoria, resumenCargaConfirmada } from "@/modules/administracion/auditoria";
import { cargarConfirmacion } from "@/modules/convocatorias/cargar-confirmacion";
import { planearConfirmacion } from "@/modules/convocatorias/confirmacion";
import { recalcularConvocatoria } from "@/modules/convocatorias/recalcular";

// RF-019 (CU-010): en la revisión de una carga, la Coordinación resuelve a mano los renglones
// dudosos o sin coincidencia (solo cambia el renglón: profesor y criterio MANUAL) y, al final,
// confirma la carga: eso registra los reconocimientos en M3 y el resultado de los participantes.

export type EstadoFila = { error?: string; exito?: string };

const NO_ESTA = "Ese renglón ya no está en esta carga.";
const NO_EN_REVISION = "Esta carga ya no está en revisión.";
const CAMBIO = "Ese renglón ya cambió. Recarga la página.";
const ruta = (cargaId: number) => `/convocatorias/revision/${cargaId}`;

/** Identificador de 32 bits positivo, o null si el formulario trae otra cosa. */
function idDe(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");
  if (!/^[1-9]\d{0,9}$/.test(texto)) return null;
  const n = Number(texto);
  return n <= 2147483647 ? n : null;
}

/** Lee el renglón y comprueba que sea de esa carga y que la carga siga en revisión. */
async function renglonEnRevision(formData: FormData) {
  const renglonId = idDe(formData.get("renglonId"));
  const cargaId = idDe(formData.get("cargaId"));
  if (renglonId === null || cargaId === null) return { error: NO_ESTA } as const;
  const renglon = await prisma.renglonResultado.findUnique({
    where: { id: renglonId },
    select: { id: true, numero: true, cargaId: true, criterio: true, carga: { select: { estado: true } } },
  });
  if (!renglon || renglon.cargaId !== cargaId) return { error: NO_ESTA } as const;
  if (renglon.carga.estado !== "EN_REVISION") return { error: NO_EN_REVISION } as const;
  return { renglon } as const;
}

export async function asignarProfesor(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("convocatorias");

  const leido = await renglonEnRevision(formData);
  if (!leido.renglon) return { error: leido.error };
  const { renglon } = leido;
  if (renglon.criterio !== "AMBIGUO" && renglon.criterio !== "SIN_COINCIDENCIA") {
    return { error: "Solo se asignan renglones dudosos o sin coincidencia." };
  }

  // Solo profesores activos: el selector los ofrece, pero el servidor vuelve a comprobarlo (D-215).
  const elegido = await revalidarProfesorSeleccionado(formData.get("profesorId"), (id) =>
    prisma.profesor.findFirst({
      where: { id, estatusLaboral: "ACTIVO" },
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
  );
  if (!elegido.profesor) return { error: elegido.error };
  const profesor = elegido.profesor;

  const otro = await prisma.renglonResultado.findFirst({
    where: { cargaId: renglon.cargaId, profesorId: profesor.id, id: { not: renglon.id } },
    select: { numero: true },
    orderBy: { numero: "asc" },
  });
  if (otro) return { error: `Ese profesor ya está en el renglón ${otro.numero} de esta carga.` };

  // La condición va en el mismo UPDATE: si la carga se confirma o el renglón cambia en este
  // instante, no se asigna.
  const { count } = await prisma.renglonResultado.updateMany({
    where: {
      id: renglon.id,
      cargaId: renglon.cargaId,
      criterio: { in: ["AMBIGUO", "SIN_COINCIDENCIA"] },
      carga: { estado: "EN_REVISION" },
    },
    data: { profesorId: profesor.id, criterio: "MANUAL" },
  });
  if (!count) return { error: CAMBIO };

  revalidatePath(ruta(renglon.cargaId));
  return { exito: `Se asignó a ${profesor.apellidos}, ${profesor.nombres} al renglón ${renglon.numero}.` };
}

export async function quitarAsignacion(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  await requireModulo("convocatorias");

  const leido = await renglonEnRevision(formData);
  if (!leido.renglon) return { error: leido.error };
  const { renglon } = leido;
  if (renglon.criterio !== "MANUAL") return { error: "Solo se quitan las asignaciones hechas a mano." };

  const { count } = await prisma.renglonResultado.updateMany({
    where: { id: renglon.id, cargaId: renglon.cargaId, criterio: "MANUAL", carga: { estado: "EN_REVISION" } },
    data: { profesorId: null, criterio: "SIN_COINCIDENCIA" },
  });
  if (!count) return { error: CAMBIO };

  revalidatePath(ruta(renglon.cargaId));
  return { exito: `Se quitó la asignación del renglón ${renglon.numero}.` };
}

const NO_EXISTE_CARGA = "Esa carga ya no existe. Recarga la página.";

/**
 * Confirma la carga en una sola transacción: la carga pasa a Confirmada, se crean los
 * reconocimientos que planea planearConfirmacion (lo omitido se muestra antes y no se crea) y se
 * guarda el resultado oficial de los participantes (RF-018). Si algo falla, no cambia nada.
 */
export async function confirmarCarga(_: EstadoFila, formData: FormData): Promise<EstadoFila> {
  const perfil = await requireModulo("convocatorias");

  const cargaId = idDe(formData.get("cargaId"));
  if (cargaId === null) return { error: NO_EXISTE_CARGA };

  const resultado = await prisma.$transaction(async (tx) => {
    const carga = await tx.cargaResultados.findUnique({
      where: { id: cargaId },
      select: { estado: true, convocatoria: { select: { id: true, programa: true, anio: true } } },
    });
    if (!carga) return { error: NO_EXISTE_CARGA };
    if (carga.estado !== "EN_REVISION") return { error: NO_EN_REVISION };
    const { convocatoria } = carga;
    const nombre = `${convocatoria.programa} ${convocatoria.anio}`;
    const otra = await tx.cargaResultados.findFirst({ where: { convocatoriaId: convocatoria.id, estado: "CONFIRMADA" }, select: { id: true } });
    if (otra) return { error: `Ya hay otra carga confirmada de ${nombre}; no se puede confirmar una segunda.` };

    const plan = planearConfirmacion(await cargarConfirmacion(tx, cargaId, convocatoria));
    if (plan.bloqueo) return { error: plan.bloqueo };

    // La condición va en el mismo UPDATE: si otra persona la confirmó o la eliminó en este instante, no se repite.
    const { count } = await tx.cargaResultados.updateMany({
      where: { id: cargaId, estado: "EN_REVISION" },
      data: { estado: "CONFIRMADA", balance: { snii: plan.snii.length, prodep: plan.prodep.length, omitidos: plan.omitidos.length } },
    });
    if (!count) return { error: NO_EN_REVISION };

    const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
    if (plan.snii.length) {
      await tx.reconocimientoSnii.createMany({
        data: plan.snii.map((s) => ({
          profesorId: s.profesorId, nivel: s.nivel, tipoParticipacion: s.tipoParticipacion, resultado: "APROBADO" as const,
          inicio: dia(s.inicio), fin: dia(s.fin), convocatoriaId: convocatoria.id,
        })),
      });
    }
    if (plan.prodep.length) {
      await tx.reconocimientoProdep.createMany({
        data: plan.prodep.map((p) => ({
          profesorId: p.profesorId, tipoSolicitud: p.tipoSolicitud, resultado: "APROBADO" as const,
          inicio: dia(p.inicio), fin: dia(p.fin), convocatoriaId: convocatoria.id,
        })),
      });
    }
    await recalcularConvocatoria(tx, convocatoria.id);
    // #380: la constancia va en la misma transacción, con identificadores y conteos (D-294).
    const renglones = await tx.renglonResultado.count({ where: { cargaId } });
    const resumen = resumenCargaConfirmada(cargaId, renglones, plan.snii.length + plan.prodep.length);
    await registrarAuditoria(tx, eventoAuditoria("carga.confirmada", perfil, { tipo: "CargaResultados", id: String(cargaId) }, resumen));
    return { nombre, creados: plan.snii.length + plan.prodep.length, omitidos: plan.omitidos.length };
  }, { timeout: 30_000 });

  if ("error" in resultado) return { error: resultado.error };
  revalidatePath("/convocatorias");
  revalidatePath("/convocatorias/participantes");
  revalidatePath(ruta(cargaId));
  revalidatePath("/reconocimientos", "layout");
  const texto = `${resultado.nombre}: ${resultado.creados} ${resultado.creados === 1 ? "reconocimiento registrado" : "reconocimientos registrados"}`
    + (resultado.omitidos ? `, ${resultado.omitidos} por registrar a mano` : "");
  redirect(`/convocatorias?confirmada=${encodeURIComponent(texto)}`, RedirectType.replace);
}
