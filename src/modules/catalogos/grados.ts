import { z } from "zod";
import { normalizar, texto } from "./comun";

export const gradoCientifico = z.object({
  nombre: texto("El nombre", 100),
  nomenclatura: texto("La nomenclatura", 20),
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
