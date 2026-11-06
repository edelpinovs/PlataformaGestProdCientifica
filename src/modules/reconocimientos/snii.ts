import { z } from "zod";

export const NIVELES_SNII = ["CANDIDATO", "NIVEL_1", "NIVEL_2", "NIVEL_3", "EMERITO", "NO_APROBADO"] as const;
export const TIPOS_PARTICIPACION_SNII = ["NUEVO_INGRESO", "RENOVACION", "REINGRESO_NO_VIGENTE"] as const;

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const fechaSnii = z.string().refine(fechaValida, "Ingresa una fecha válida.");

export const reconocimientoSnii = z.object({
  profesorId: z.number({ error: "Selecciona un profesor." })
    .int("Selecciona un profesor.")
    .positive("Selecciona un profesor."),
  cvu: z.string().trim()
    .min(1, "El CVU es obligatorio.")
    .max(30, "El CVU no puede superar 30 caracteres.")
    .regex(/^\d+$/, "El CVU solo puede contener números."),
  nivel: z.enum(NIVELES_SNII, { error: "Selecciona un nivel SNII válido." }),
  tipoParticipacion: z.enum(TIPOS_PARTICIPACION_SNII, { error: "Selecciona un tipo de participación válido." }),
  fechaInicio: fechaSnii,
  fechaFin: fechaSnii,
  enRecursoReconsideracion: z.boolean(),
}).superRefine((datos, contexto) => {
  if (fechaValida(datos.fechaInicio) && fechaValida(datos.fechaFin) && datos.fechaInicio >= datos.fechaFin) {
    contexto.addIssue({
      code: "custom",
      path: ["fechaFin"],
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    });
  }
});

export type ReconocimientoSnii = z.infer<typeof reconocimientoSnii>;

export function resultadoSnii(nivel: ReconocimientoSnii["nivel"], enRecursoReconsideracion: boolean) {
  if (enRecursoReconsideracion) return "EN_RECONSIDERACION" as const;
  return nivel === "NO_APROBADO" ? "NO_APROBADO" as const : "APROBADO" as const;
}
