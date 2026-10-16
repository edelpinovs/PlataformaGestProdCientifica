import { z } from "zod";
import { normalizar, texto } from "./comun";

const sinDivision = "Elige la división a la que pertenece.";

export const departamento = z.object({
  nombre: texto("El nombre", 150),
  nomenclatura: texto("La nomenclatura", 20),
  // Llega del <select> como texto; "" (sin elegir) se convierte en 0 y no pasa.
  divisionId: z.coerce.number({ error: sinDivision }).int(sinDivision).positive(sinDivision),
});

export type Departamento = z.infer<typeof departamento>;

export type Contexto = {
  divisiones: { id: number; nombre: string }[];
  departamentos: Departamento[];
};

export type Problema = { campo: keyof Departamento; mensaje: string };

// RF-003: todo departamento pertenece a una División existente. La nomenclatura es única
// en el catálogo y el nombre no se repite dentro de la misma división.
export function revisarDepartamento(nuevo: Departamento, { divisiones, departamentos }: Contexto): Problema | null {
  const division = divisiones.find((d) => d.id === nuevo.divisionId);
  if (!division) {
    return { campo: "divisionId", mensaje: "La división elegida no existe. Recarga la página y elige otra." };
  }

  const porNomenclatura = departamentos.find(
    (d) => normalizar(d.nomenclatura) === normalizar(nuevo.nomenclatura),
  );
  if (porNomenclatura) {
    return {
      campo: "nomenclatura",
      mensaje: `Ya existe un departamento con la nomenclatura «${porNomenclatura.nomenclatura}» (${porNomenclatura.nombre}).`,
    };
  }

  const porNombre = departamentos.find(
    (d) => d.divisionId === nuevo.divisionId && normalizar(d.nombre) === normalizar(nuevo.nombre),
  );
  if (porNombre) {
    return { campo: "nombre", mensaje: `La división «${division.nombre}» ya tiene un departamento llamado «${porNombre.nombre}».` };
  }

  return null;
}
