import { z } from "zod";

// Recorta y colapsa espacios internos.
export const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");

// Nombre de un elemento de catálogo: letras (con acentos), espacios, puntos, comas y guiones;
// empieza con letra y no admite números: "Doctorado en Ciencias", "División de C. Económicas",
// "Departamento de Humanidades, Artes y Culturas", "Ciencias Económico-Administrativas".
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
        .regex(/^\p{L}[\p{L} .,-]*$/u, "El nombre solo admite letras, espacios, puntos, comas y guiones."),
    );

// Clave o nomenclatura de catálogo: letras, números y guiones, empieza con letra, de 2 a 20
// caracteres y siempre en mayúsculas, como DIV-A o DEP-A1. `campo` va en los mensajes.
export const claveCatalogo = (campo: { obligatoria: string; nombre: string }) =>
  z
    .string()
    .transform((s) => limpiar(s).toUpperCase())
    .pipe(
      z
        .string()
        .min(1, campo.obligatoria)
        .regex(
          /^\p{L}[\p{L}\d-]{1,19}$/u,
          `${campo.nombre} debe tener de 2 a 20 caracteres: letras, números y guiones, empezando con letra.`,
        ),
    );

// Identificador que envía una fila editable (campo oculto `id`); null si no es válido.
export function idDeFormulario(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// "1 profesor", "3 profesores".
export function cantidad(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// ["a", "b", "c"] → "a, b y c".
export function enumerar(partes: string[]) {
  return partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

// Forma de comparación: sin mayúsculas ni acentos ("Maestría" = "maestria").
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
