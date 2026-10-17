import { z } from "zod";
import { limpiar, nombreCatalogo, normalizar } from "./comun";

export const gradoCientifico = z.object({
  nombre: nombreCatalogo(100),
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
