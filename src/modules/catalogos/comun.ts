import { z } from "zod";

// Texto obligatorio: recorta y colapsa espacios internos antes de validar.
export const texto = (campo: string, max: number) =>
  z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
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
