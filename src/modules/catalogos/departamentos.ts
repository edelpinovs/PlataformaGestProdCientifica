import { z } from "zod";
import { cantidad, claveCatalogo, enumerar, nombreCatalogo, normalizar } from "./comun";

const sinDivision = "Elige la división a la que pertenece.";

export const departamento = z.object({
  nombre: nombreCatalogo(150),
  nomenclatura: claveCatalogo({ obligatoria: "La nomenclatura es obligatoria.", nombre: "La nomenclatura" }),
  // Llega del <select> como texto; "" (sin elegir) se convierte en 0 y no pasa.
  divisionId: z.coerce.number({ error: sinDivision }).int(sinDivision).positive(sinDivision),
});

export type Departamento = z.infer<typeof departamento>;

export type Contexto = {
  divisiones: { id: number; nombre: string }[];
  departamentos: (Departamento & { id?: number })[];
};

export type Problema = { campo: keyof Departamento; mensaje: string };

// RF-003: todo departamento pertenece a una División existente. La nomenclatura es única
// en el catálogo y el nombre no se repite dentro de la misma división.
// Al editar (#59) se pasa `idPropio`, para que el departamento no choque consigo mismo.
export function revisarDepartamento(nuevo: Departamento, contexto: Contexto, idPropio?: number): Problema | null {
  const { divisiones } = contexto;
  const departamentos =
    idPropio === undefined ? contexto.departamentos : contexto.departamentos.filter((d) => d.id !== idPropio);
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

export type UsoDepartamento = { profesores: number; programas: number; cuerpos: number };

// #59: un departamento con profesores, programas educativos o cuerpos académicos no se elimina.
// Con profesores y programas la base no lo impediría (relación opcional: Prisma haría SetNull).
export function motivoDepartamentoNoEliminable(nombre: string, uso: UsoDepartamento): string | null {
  const partes = [
    uso.profesores > 0 ? cantidad(uso.profesores, "profesor", "profesores") : null,
    uso.programas > 0 ? cantidad(uso.programas, "programa educativo", "programas educativos") : null,
    uso.cuerpos > 0 ? cantidad(uso.cuerpos, "cuerpo académico", "cuerpos académicos") : null,
  ].filter((p): p is string => p !== null);
  if (partes.length === 0) return null;
  return `No se puede eliminar «${nombre}»: tiene ${enumerar(partes)}. Cámbialos de departamento antes de eliminarlo.`;
}
