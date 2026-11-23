import { z } from "zod";
import { PRIMER_ANIO, PROGRAMAS } from "./carga";

// RF-018 (CU-010): estatus de los participantes de una convocatoria según el listado oficial.
// Con la carga en revisión el resultado es preliminar y solo se muestra; se guarda al confirmar.
// Participantes = los registrados a mano + quienes aparecen en el listado (D-239, pendiente de
// confirmar con la Coordinación, plan §8 punto 1). No Aprobado solo a registrados que no aparecen.

export type Origen = "MANUAL" | "LISTADO";
export type Participacion = {
  id: number;
  profesorId: number;
  origen: Origen;
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION" | null;
};

/** Ids de participación por operación; `crear` lleva ids de profesor. Solo incluye lo que cambia. */
export type CambiosParticipacion = {
  crear: number[];
  borrar: number[];
  aprobar: number[];
  noAprobar: number[];
  limpiar: number[];
};

/**
 * `enListado`: profesores que coincidieron en la carga vigente de la convocatoria, o `null` si
 * todavía no hay una carga leída (entonces nadie tiene resultado).
 */
export function calcularParticipaciones(actuales: Participacion[], enListado: Set<number> | null): CambiosParticipacion {
  const cambios: CambiosParticipacion = { crear: [], borrar: [], aprobar: [], noAprobar: [], limpiar: [] };
  for (const p of actuales) {
    const aparece = enListado?.has(p.profesorId) ?? false;
    if (p.origen === "LISTADO" && !aparece) cambios.borrar.push(p.id);
    else if (!enListado) { if (p.resultado !== null) cambios.limpiar.push(p.id); }
    else if (aparece) { if (p.resultado !== "APROBADO") cambios.aprobar.push(p.id); }
    else if (p.resultado !== "NO_APROBADO") cambios.noAprobar.push(p.id);
  }
  const registrados = new Set(actuales.map((p) => p.profesorId));
  for (const profesorId of enListado ?? []) if (!registrados.has(profesorId)) cambios.crear.push(profesorId);
  return cambios;
}

/** Resultado preliminar de un participante con la carga en revisión; `null` si aún no hay una. */
export function resultadoPreliminar(profesorId: number, enListado: Set<number> | null): "APROBADO" | "NO_APROBADO" | null {
  if (!enListado) return null;
  return enListado.has(profesorId) ? "APROBADO" : "NO_APROBADO";
}

export function motivoConvocatoriaConfirmada(convocatoria: string, confirmada: boolean): string | null {
  return confirmada ? `La convocatoria ${convocatoria} ya se confirmó; no se pueden cambiar sus participantes.` : null;
}

/** Programa y año del alta de un participante; mismas reglas y mensajes que la carga (RF-016). */
export function participante(anioActual: number) {
  return z.object({
    programa: z.enum(PROGRAMAS, { error: "Elige si la convocatoria es SNII o PRODEP." }),
    anio: z.coerce
      .number({ error: "Escribe el año de la convocatoria." })
      .int("El año debe ser un número entero.")
      .min(PRIMER_ANIO, `El año debe ser ${PRIMER_ANIO} o posterior.`)
      .max(anioActual + 1, `El año no puede ser posterior a ${anioActual + 1}.`),
  });
}
