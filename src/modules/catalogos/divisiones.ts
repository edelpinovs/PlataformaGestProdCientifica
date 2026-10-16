import { z } from "zod";
import { normalizar, texto } from "./comun";

export const division = z.object({
  nombre: texto("El nombre", 150),
  clave: texto("La clave institucional", 20),
});

export type Division = z.infer<typeof division>;

// RF-002: la clave institucional identifica a la división y no puede repetirse.
export function buscarClaveDuplicada(nueva: Division, existentes: Division[]): string | null {
  const otra = existentes.find((d) => normalizar(d.clave) === normalizar(nueva.clave));
  return otra ? `Ya existe una división con la clave «${otra.clave}» (${otra.nombre}).` : null;
}
