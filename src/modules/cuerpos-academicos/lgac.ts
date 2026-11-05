import { z } from "zod";
import { limpiar, normalizar, texto } from "../catalogos/comun";

const eligeCuerpo = "Ese cuerpo académico ya no existe. Recarga la página.";
const eligeIntegrante = "Elige al menos un integrante de esta línea.";

const descripcionOpcional = z
  .string()
  .transform(limpiar)
  .pipe(z.string().max(400, "La descripción admite como máximo 400 caracteres."))
  .transform((s) => (s.length === 0 ? null : s));

export const altaLgac = z.object({
  cuerpoId: z.coerce.number({ error: eligeCuerpo }).int().positive(),
  nombre: texto("El nombre", 200),
  descripcion: descripcionOpcional,
  profesorIds: z
    .array(z.coerce.number({ error: eligeIntegrante }).int().positive())
    .min(1, eligeIntegrante)
    // Un envío manipulado podría repetir el mismo integrante; se queda una sola vez.
    .transform((ids) => [...new Set(ids)]),
});

export type AltaLgac = z.infer<typeof altaLgac>;

export type LgacExistente = { id?: number; nombre: string };

export type ProblemaLgac = { campo: "nombre" | "profesorIds"; mensaje: string };

// RF-015 · CU-009: la línea es del CA, el nombre no se duplica ahí y los profesores son integrantes.
export function revisarLgac(
  datos: AltaLgac,
  integrantes: { profesorId: number }[],
  existentes: LgacExistente[],
  idPropio?: number,
): ProblemaLgac | null {
  if (integrantes.length === 0) {
    return {
      campo: "profesorIds",
      mensaje: "Primero asigna integrantes. Las LGAC se vinculan a integrantes de este cuerpo académico.",
    };
  }

  const idsIntegrantes = new Set(integrantes.map((i) => i.profesorId));
  if (datos.profesorIds.some((id) => !idsIntegrantes.has(id))) {
    return {
      campo: "profesorIds",
      mensaje: "Solo se vinculan integrantes de este cuerpo académico. Quita a quien ya no pertenezca.",
    };
  }

  const otras = idPropio === undefined ? existentes : existentes.filter((l) => l.id !== idPropio);
  const duplicada = otras.find((l) => normalizar(l.nombre) === normalizar(datos.nombre));
  if (duplicada) {
    return {
      campo: "nombre",
      mensaje: `Ya existe la LGAC «${duplicada.nombre}» en este cuerpo académico.`,
    };
  }

  return null;
}

export function idsDeProfesores(formData: FormData) {
  return formData.getAll("profesorIds").map(String);
}
