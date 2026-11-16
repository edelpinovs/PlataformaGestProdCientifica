import { z } from "zod";
import { hayTraslape, type PeriodoVigencia } from "./vigencia";

export const TIPOS_SOLICITUD_PRODEP = ["PRIMER_RECONOCIMIENTO", "RENOVACION"] as const;
export const RESULTADOS_PRODEP = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;

export type ResultadoProdep = (typeof RESULTADOS_PRODEP)[number];
export type PeriodoProdep = PeriodoVigencia & { resultado: ResultadoProdep };

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const fechaProdep = z.string().refine(fechaValida, "Ingresa una fecha válida.");

export const reconocimientoProdep = z.object({
  profesorId: z.number({ error: "Selecciona un profesor." })
    .int("Selecciona un profesor.")
    .positive("Selecciona un profesor."),
  tipoSolicitud: z.enum(TIPOS_SOLICITUD_PRODEP, { error: "Selecciona un tipo de solicitud válido." }),
  resultado: z.enum(RESULTADOS_PRODEP, { error: "Selecciona un resultado válido." }),
  fechaInicio: fechaProdep,
  fechaFin: fechaProdep,
}).superRefine((datos, contexto) => {
  if (fechaValida(datos.fechaInicio) && fechaValida(datos.fechaFin) && datos.fechaInicio > datos.fechaFin) {
    contexto.addIssue({
      code: "custom",
      path: ["fechaFin"],
      message: "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
    });
  }
});

export type ReconocimientoProdep = z.infer<typeof reconocimientoProdep>;

export function hayTraslapeProdep(
  existentes: PeriodoProdep[],
  nuevo: PeriodoProdep,
  excluirId?: number,
): PeriodoVigencia | null {
  if (nuevo.resultado === "NO_APROBADO") return null;
  return hayTraslape(
    existentes.filter((periodo) => periodo.resultado !== "NO_APROBADO"),
    nuevo,
    excluirId,
  );
}
