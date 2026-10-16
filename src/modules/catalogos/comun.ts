import { z } from "zod";

// Recorta y colapsa espacios internos.
export const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");

// Texto obligatorio: limpia los espacios antes de validar.
export const texto = (campo: string, max: number) =>
  z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(1, `${campo} es obligatorio.`)
        .max(max, `${campo} admite como máximo ${max} caracteres.`),
    );

// Forma de comparación: sin mayúsculas ni acentos ("Maestría" = "maestria").
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
