import { z } from "zod";

/**
 * Filtro por departamento del profesor, común a Escanear y Publicaciones.
 * Vacío = todos; `sin` = profesores sin departamento asignado (muchos datos reales lo tienen pendiente);
 * un número = el id del departamento.
 */
export const SIN_DEPARTAMENTO = "sin";
export const MENSAJE_DEPARTAMENTO = "Selecciona un departamento válido.";
export const MENSAJE_DEPARTAMENTO_SIN_ACTIVOS = "No hay profesores activos en ese departamento.";

export const departamentoEsquema = z.string({ error: MENSAJE_DEPARTAMENTO }).refine(
  (valor) => valor === "" || valor === SIN_DEPARTAMENTO || (/^[1-9]\d*$/.test(valor) && Number(valor) <= 2147483647),
  MENSAJE_DEPARTAMENTO,
);

export type Departamento = { id: number; nombre: string; nomenclatura: string };

/** Opciones de la lista, sin «Todos»: cada pantalla lo agrega a su manera. «Sin departamento» va al final. */
export function opcionesDepartamento(departamentos: Departamento[]) {
  return [
    ...departamentos.map((departamento) => ({ valor: String(departamento.id), texto: `${departamento.nombre} (${departamento.nomenclatura})` })),
    { valor: SIN_DEPARTAMENTO, texto: "Sin departamento" },
  ];
}

/** Condición de Prisma sobre el profesor; `undefined` si no se filtra. */
export function condicionDepartamento(valor: string | undefined): { departamentoId: number | null } | undefined {
  if (!valor) return undefined;
  return { departamentoId: valor === SIN_DEPARTAMENTO ? null : Number(valor) };
}

/** Texto para resúmenes: «sin departamento», el nombre o, si ya no existe, su número. */
export function textoDepartamento(valor: string, departamentos: Departamento[]): string {
  if (valor === SIN_DEPARTAMENTO) return "sin departamento";
  const departamento = departamentos.find((opcion) => String(opcion.id) === valor);
  return departamento ? `${departamento.nombre} (${departamento.nomenclatura})` : `el departamento #${valor}`;
}
