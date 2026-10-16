import { z } from "zod";

// Recorta y colapsa espacios internos antes de validar.
const texto = (campo: string, max: number) =>
  z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, `${campo} es obligatorio.`)
        .max(max, `${campo} admite como máximo ${max} caracteres.`),
    );

export const gradoCientifico = z.object({
  nombre: texto("El nombre", 100),
  nomenclatura: texto("La nomenclatura", 20),
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
