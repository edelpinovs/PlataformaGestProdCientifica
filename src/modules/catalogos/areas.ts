import { z } from "zod";
import { cantidad, nombreCatalogo, normalizar } from "./comun";

// Issue 264: catálogo de áreas. El nombre no se repite (sin distinguir mayúsculas ni acentos).

export const area = z.object({ nombre: nombreCatalogo(150) });

export type Area = z.infer<typeof area>;

export type DuplicadaArea = { campo: keyof Area; mensaje: string };

// Al editar se pasa `idPropio`, para que el área no choque consigo misma.
export function buscarAreaDuplicada(
  nueva: Area,
  catalogo: (Area & { id?: number })[],
  idPropio?: number,
): DuplicadaArea | null {
  const existentes = idPropio === undefined ? catalogo : catalogo.filter((a) => a.id !== idPropio);
  const igual = existentes.find((a) => normalizar(a.nombre) === normalizar(nueva.nombre));
  return igual ? { campo: "nombre", mensaje: `Ya existe un área llamada «${igual.nombre}».` } : null;
}

// Un área con subáreas no se elimina (la base también lo impide: P2003).
export function motivoAreaNoEliminable(nombre: string, subareas: number): string | null {
  if (subareas === 0) return null;
  const que = subareas === 1 ? "Elimínala o cámbiala" : "Elimínalas o cámbialas";
  return `No se puede eliminar «${nombre}»: tiene ${cantidad(subareas, "subárea", "subáreas")}. ${que} de área antes.`;
}
