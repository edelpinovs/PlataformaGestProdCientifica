import { resumenEliminacion } from "@/modules/administracion/auditoria";

// #379 (sub-issue de #277): resúmenes de la bitácora para los borrados de Cuerpos Académicos.
// Solo identificadores: la clave del CA, el id de la LGAC y el código del profesor. Nunca nombres de
// profesores, correos ni teléfonos (D-294).

export const MODULO_AUDITORIA_CA = "cuerpos-academicos";

/** Tipos de entidad con que se guardan en la bitácora. */
export const ENTIDAD_CA = {
  cuerpo: "CuerpoAcademico",
  lgac: "Lgac",
  integrante: "IntegranteCa",
} as const;

export function resumenCuerpoEliminado(clave: string, id: number): string {
  return resumenEliminacion("el cuerpo académico", `${clave} (id ${id})`);
}

export function resumenLgacEliminada(idLgac: number, claveCuerpo: string): string {
  return resumenEliminacion("la LGAC", `id ${idLgac} del cuerpo académico ${claveCuerpo}`);
}

/** Sin código del profesor, se identifica por su id interno (y así se dice, sin llamarlo «código»). */
export function resumenIntegranteQuitado(claveCuerpo: string, profesor: { id: number; codigo?: string | null }): string {
  const quien = profesor.codigo ? `con código ${profesor.codigo}` : `con id ${profesor.id}`;
  return resumenEliminacion("al integrante", `${quien} del cuerpo académico ${claveCuerpo}`);
}

/** El vínculo integrante–CA no tiene id propio: se identifica por el par cuerpo:profesor. */
export function idIntegrante(cuerpoId: number, profesorId: number): string {
  return `${cuerpoId}:${profesorId}`;
}
