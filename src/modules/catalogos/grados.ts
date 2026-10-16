import { z } from "zod";

// Recorta y colapsa espacios internos antes de validar.
const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");

export const gradoCientifico = z.object({
  // Letras (con acentos), espacios y puntos: "Doctorado en Ciencias", "Maestría en C. Sociales".
  nombre: z
    .string()
    .transform(limpiar)
    .pipe(
      z
        .string()
        .min(1, "El nombre es obligatorio.")
        .min(3, "El nombre debe tener al menos 3 caracteres.")
        .max(100, "El nombre admite como máximo 100 caracteres.")
        .regex(/^\p{L}[\p{L} .]*$/u, "El nombre solo admite letras, espacios y puntos."),
    ),
  // Solo letras y siempre en mayúsculas, como DR, MTRO o LIC.
  nomenclatura: z
    .string()
    .transform((s) => limpiar(s).toUpperCase())
    .pipe(
      z
        .string()
        .min(1, "La nomenclatura es obligatoria.")
        .regex(/^\p{L}{2,10}$/u, "La nomenclatura debe tener de 2 a 10 letras, sin espacios ni números."),
    ),
});

export type GradoCientifico = z.infer<typeof gradoCientifico>;

// Forma de comparación: sin mayúsculas ni acentos ("Maestría" = "maestria").
function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export type Duplicado = { campo: keyof GradoCientifico; mensaje: string };

// RF-001: nombre y nomenclatura no deben existir previamente en el catálogo.
export function buscarDuplicado(
  nuevo: GradoCientifico,
  existentes: GradoCientifico[],
): Duplicado | null {
  const porNombre = existentes.find((g) => normalizar(g.nombre) === normalizar(nuevo.nombre));
  if (porNombre) {
    return { campo: "nombre", mensaje: `Ya existe un grado científico con el nombre «${porNombre.nombre}».` };
  }

  const porNomenclatura = existentes.find(
    (g) => normalizar(g.nomenclatura) === normalizar(nuevo.nomenclatura),
  );
  if (porNomenclatura) {
    return {
      campo: "nomenclatura",
      mensaje: `Ya existe un grado científico con la nomenclatura «${porNomenclatura.nomenclatura}».`,
    };
  }

  return null;
}
