import { z } from "zod";
import { cantidad, claveCatalogo, nombreCatalogo, normalizar } from "./comun";

export const division = z.object({
  nombre: nombreCatalogo(150),
  clave: claveCatalogo({ obligatoria: "La clave institucional es obligatoria.", nombre: "La clave" }),
});

export type Division = z.infer<typeof division>;

export type Duplicada = { campo: keyof Division; mensaje: string };

// RF-002: la clave institucional identifica a la división y no puede repetirse.
// El nombre tampoco, para que no haya dos divisiones indistinguibles al elegir una (RF-003).
// Al editar (#59) se pasa `idPropio`, para que la división no choque consigo misma.
export function buscarDuplicada(
  nueva: Division,
  catalogo: (Division & { id?: number })[],
  idPropio?: number,
): Duplicada | null {
  const existentes = idPropio === undefined ? catalogo : catalogo.filter((d) => d.id !== idPropio);
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

// #59: una división con departamentos no se elimina (la base también lo impide: P2003).
export function motivoDivisionNoEliminable(nombre: string, departamentos: number): string | null {
  if (departamentos === 0) return null;
  const que = departamentos === 1 ? "Elimínalo o cámbialo" : "Elimínalos o cámbialos";
  return `No se puede eliminar «${nombre}»: tiene ${cantidad(departamentos, "departamento", "departamentos")}. ${que} de división antes.`;
}
