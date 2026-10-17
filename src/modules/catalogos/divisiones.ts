import { z } from "zod";
import { claveCatalogo, nombreCatalogo, normalizar } from "./comun";

export const division = z.object({
  nombre: nombreCatalogo(150),
  clave: claveCatalogo({ obligatoria: "La clave institucional es obligatoria.", nombre: "La clave" }),
});

export type Division = z.infer<typeof division>;

export type Duplicada = { campo: keyof Division; mensaje: string };

// RF-002: la clave institucional identifica a la división y no puede repetirse.
// El nombre tampoco, para que no haya dos divisiones indistinguibles al elegir una (RF-003).
export function buscarDuplicada(nueva: Division, existentes: Division[]): Duplicada | null {
  const porClave = existentes.find((d) => normalizar(d.clave) === normalizar(nueva.clave));
  if (porClave) {
    return { campo: "clave", mensaje: `Ya existe una división con la clave «${porClave.clave}» (${porClave.nombre}).` };
  }

  const porNombre = existentes.find((d) => normalizar(d.nombre) === normalizar(nueva.nombre));
  if (porNombre) {
    return {
      campo: "nombre",
      mensaje: `Ya existe una división con el nombre «${porNombre.nombre}» (clave ${porNombre.clave}).`,
    };
  }

  return null;
}
