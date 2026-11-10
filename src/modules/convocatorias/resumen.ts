import { z } from "zod";
import type { ResumenLectura } from "./lectura";

// RF-017: el resumen de la lectura se guarda en Job.datos (campo JSON). Al mostrarlo se valida
// su forma: una tarea que aún no se lee, o de una versión anterior, no tiene resumen.
const esquemaResumen = z.object({
  renglones: z.number().int(),
  conCvu: z.number().int(),
  conVigencia: z.number().int(),
  porNivel: z.record(z.string(), z.number().int()),
  avisos: z.array(z.object({ renglon: z.number().int(), mensaje: z.string() })),
  totalAvisos: z.number().int(),
});

export function leerResumen(datos: unknown): ResumenLectura | null {
  const resultado = z.object({ resumen: esquemaResumen }).safeParse(datos);
  return resultado.success ? resultado.data.resumen : null;
}
