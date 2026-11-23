"use server";

import { revalidatePath } from "next/cache";
import { requireModulo } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidarProfesorSeleccionado } from "@/lib/selectores/profesor";

// RF-019 (CU-010): en la revisión de una carga, la Coordinación resuelve a mano los renglones
// dudosos o sin coincidencia. Solo cambia el renglón (profesor y criterio MANUAL); nada se escribe
// en M3 ni en los participantes hasta confirmar la carga (#24).

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
