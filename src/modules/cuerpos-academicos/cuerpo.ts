import { z } from "zod";
import { nombreCatalogo, normalizar, texto } from "../catalogos/comun";

export const NIVELES_CONSOLIDACION = ["EN_FORMACION", "EN_CONSOLIDACION", "CONSOLIDADO"] as const;
export type NivelConsolidacion = (typeof NIVELES_CONSOLIDACION)[number];

export const ETIQUETA_NIVEL: Record<NivelConsolidacion, string> = {
  EN_FORMACION: "En formación",
  EN_CONSOLIDACION: "En consolidación",
  CONSOLIDADO: "Consolidado",
};

const sinDepartamento = "Elige el departamento al que pertenece.";
const sinNivel = "Elige el nivel de consolidación.";
const anioInvalido = "Indica un año entre 1990 y 2100.";

export const cuerpoAcademico = z
  .object({
    nombre: nombreCatalogo(200),
    // Letras, números y guiones, empieza con letra y siempre en mayúsculas, como CA-001.
    clave: z
      .string()
      .transform((s) => s.trim().replace(/\s+/g, " ").toUpperCase())
      .pipe(
        z
          .string()
          .min(1, "La clave es obligatoria.")
          .regex(
            /^\p{L}[\p{L}\d-]{1,19}$/u,
            "La clave debe tener de 2 a 20 caracteres: letras, números y guiones, empezando con letra.",
          ),
      ),
    nivel: z.enum(NIVELES_CONSOLIDACION, { error: sinNivel }),
    areaProdep: texto("El área PRODEP", 150),
    disciplina: texto("La disciplina", 150),
    departamentoId: z.coerce.number({ error: sinDepartamento }).int(sinDepartamento).positive(sinDepartamento),
    anioRegistro: z.coerce.number({ error: anioInvalido }).int(anioInvalido).min(1990, anioInvalido).max(2100, anioInvalido),
    anioVencimiento: z.coerce.number({ error: anioInvalido }).int(anioInvalido).min(1990, anioInvalido).max(2100, anioInvalido),
  })
  .superRefine((datos, ctx) => {
    if (datos.anioVencimiento < datos.anioRegistro) {
      ctx.addIssue({
        code: "custom",
        path: ["anioVencimiento"],
        message: "El año de vencimiento no puede ser anterior al de registro.",
      });
    }
  });

export type CuerpoAcademicoDatos = z.infer<typeof cuerpoAcademico>;

export type ContextoCuerpo = {
  departamentos: { id: number; nombre: string }[];
  cuerpos: (Pick<CuerpoAcademicoDatos, "clave"> & { id?: number })[];
};

export type ProblemaCuerpo = { campo: keyof CuerpoAcademicoDatos; mensaje: string };

// RF-012: la clave identifica al CA y no puede repetirse. El departamento debe existir.
// Al editar (#59) se pasa `idPropio` para que el CA no choque consigo mismo.
export function revisarCuerpo(
  nuevo: CuerpoAcademicoDatos,
  { departamentos, cuerpos }: ContextoCuerpo,
  idPropio?: number,
): ProblemaCuerpo | null {
  const departamento = departamentos.find((d) => d.id === nuevo.departamentoId);
  if (!departamento) {
    return {
      campo: "departamentoId",
      mensaje: "El departamento elegido no existe. Recarga la página y elige otro.",
    };
  }

  const existentes = idPropio === undefined ? cuerpos : cuerpos.filter((c) => c.id !== idPropio);
  const porClave = existentes.find((c) => normalizar(c.clave) === normalizar(nuevo.clave));
  if (porClave) {
    return { campo: "clave", mensaje: `Ya existe un cuerpo académico con la clave «${porClave.clave}».` };
  }

  return null;
}

// Un CA con integrantes o LGAC no se elimina: Prisma sí lo permitiría (Cascade)
// y se llevaría esos registros sin avisar.
export function motivoNoEliminable(nombre: string, integrantes: number, lgacs: number): string | null {
  if (integrantes === 0 && lgacs === 0) return null;
  const partes: string[] = [];
  if (integrantes > 0) partes.push(integrantes === 1 ? "1 integrante" : `${integrantes} integrantes`);
  if (lgacs > 0) partes.push(lgacs === 1 ? "1 LGAC" : `${lgacs} LGAC`);
  return `No se puede eliminar «${nombre}»: tiene ${partes.join(" y ")}. Quítalos antes de eliminarlo.`;
}
