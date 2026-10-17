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

// Nombre de un elemento de catálogo: letras (con acentos), espacios y puntos,
// empieza con letra: "Doctorado en Ciencias", "División de C. Económicas".
// La primera letra se guarda en mayúscula para que el catálogo sea uniforme.
export const nombreCatalogo = (max: number) =>
  z
    .string()
    .transform((s) => {
      const limpio = limpiar(s);
      return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    })
    .pipe(
      z
        .string()
        .min(1, "El nombre es obligatorio.")
        .min(3, "El nombre debe tener al menos 3 caracteres.")
        .max(max, `El nombre admite como máximo ${max} caracteres.`)
        .regex(/^\p{L}[\p{L} .]*$/u, "El nombre solo admite letras, espacios y puntos."),
    );

// Forma de comparación: sin mayúsculas ni acentos ("Maestría" = "maestria").
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
