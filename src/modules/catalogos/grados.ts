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
// Al editar (#55) se pasa `idPropio`, para que el grado no choque consigo mismo.
export function buscarDuplicado(
  nuevo: GradoCientifico,
  catalogo: (GradoCientifico & { id?: number })[],
  idPropio?: number,
): Duplicado | null {
  const existentes = idPropio === undefined ? catalogo : catalogo.filter((g) => g.id !== idPropio);
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

// #55: un grado asignado a profesores no se elimina. La base no lo impediría:
// la relación es opcional y Prisma dejaría a esos profesores sin grado.
export function motivoNoEliminable(nombre: string, profesores: number): string | null {
  if (profesores === 0) return null;
  const quienes = profesores === 1 ? "1 profesor" : `${profesores} profesores`;
  return `No se puede eliminar «${nombre}»: está asignado a ${quienes}. Cambia su grado antes de eliminarlo.`;
}
