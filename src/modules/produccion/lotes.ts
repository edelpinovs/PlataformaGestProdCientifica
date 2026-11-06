import { z } from "zod";
import type { ResumenEscaneo } from "./escaneo";

export function resumenVacio(): ResumenEscaneo {
  return { profesoresProcesados: 0, publicacionesEncontradas: 0, publicacionesGuardadas: 0,
    autoriasCreadas: 0, coautoriasDetectadas: 0, errores: [] };
}

const entero = z.number({ error: "El avance del escaneo no es válido." }).int().nonnegative();
export const datosLoteEsquema = z.object({
  version: z.literal(1), profesoresIds: z.array(z.number().int().positive()), indice: entero,
  anio: z.number().int().min(1990).max(2100).optional(),
  resumen: z.object({
    profesoresProcesados: entero, publicacionesEncontradas: entero, publicacionesGuardadas: entero,
    autoriasCreadas: entero, coautoriasDetectadas: entero, errores: z.array(z.string()),
  }),
}).refine((datos) => datos.indice <= datos.profesoresIds.length, {
  error: "El avance supera la cantidad de profesores del escaneo.",
});
export type DatosLote = z.infer<typeof datosLoteEsquema>;

export const solicitudEscaneoEsquema = z.object({
  profesorId: z.union([
    z.literal("todos"),
    z.string().regex(/^[1-9]\d*$/, "Selecciona un profesor válido.").refine(
      (valor) => Number.isSafeInteger(Number(valor)), "Selecciona un profesor válido.",
    ),
  ], { error: "Selecciona un profesor válido." }),
  anio: z.string({ error: "Indica un año válido." }).trim().refine(
    (valor) => !valor || (/^\d{4}$/.test(valor) && Number(valor) >= 1990 && Number(valor) <= new Date().getUTCFullYear() + 1),
    "Indica un año entre 1990 y el próximo año, o deja el campo vacío.",
  ),
});

export function avanzarLote(datos: DatosLote, resultado: ResumenEscaneo): DatosLote {
  if (datos.indice >= datos.profesoresIds.length) return datos;
  const resumen = { ...datos.resumen };
  resumen.profesoresProcesados += resultado.profesoresProcesados;
  resumen.publicacionesEncontradas += resultado.publicacionesEncontradas;
  resumen.publicacionesGuardadas += resultado.publicacionesGuardadas;
  resumen.autoriasCreadas += resultado.autoriasCreadas;
  resumen.coautoriasDetectadas += resultado.coautoriasDetectadas;
  // Limita el JSON guardado cuando las fuentes fallan repetidamente.
  resumen.errores = [...resumen.errores, ...resultado.errores].slice(0, 50);
  return { ...datos, indice: datos.indice + 1, resumen };
}
