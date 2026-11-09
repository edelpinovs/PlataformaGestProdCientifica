import { z } from "zod";

export type OpcionProfesor = { id: number; nombres: string; apellidos: string; codigo: string };

function textoBuscable(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim();
}

/** Busca solo dentro de las opciones autorizadas que entrega el módulo consumidor. */
export function buscarProfesores(opciones: readonly OpcionProfesor[], busqueda: string) {
  const palabras = textoBuscable(busqueda).split(/\s+/).filter(Boolean);
  return opciones.filter(p => {
    const texto = textoBuscable(`${p.nombres} ${p.apellidos} ${p.codigo}`);
    return palabras.every(palabra => texto.includes(palabra));
  });
}

export const idProfesorSeleccionado = z.string({ error: "Selecciona un profesor." })
  .regex(/^[1-9]\d*$/, "Selecciona un profesor válido de la lista.")
  .transform(Number)
  .pipe(z.number({ error: "Selecciona un profesor válido de la lista." }).int("Selecciona un profesor válido de la lista.").max(Number.MAX_SAFE_INTEGER, "Selecciona un profesor válido de la lista."));

/**
 * Se llama dentro de la Server Action, después de exigir permisos. El callback consulta
 * con Prisma la elegibilidad actual: las opciones del cliente nunca autorizan el alta.
 */
export async function revalidarProfesorSeleccionado(
  valor: unknown,
  buscarElegible: (id: number) => Promise<OpcionProfesor | null>,
): Promise<{ profesor: OpcionProfesor; error?: never } | { error: string; profesor?: never }> {
  const resultado = idProfesorSeleccionado.safeParse(valor);
  if (!resultado.success) return { error: resultado.error.issues[0].message };
  try {
    const profesor = await buscarElegible(resultado.data);
    if (!profesor || profesor.id !== resultado.data) return { error: "El profesor ya no está disponible para esta operación. Selecciona otro." };
    return { profesor };
  } catch {
    return { error: "No se pudo verificar el profesor. Inténtalo de nuevo." };
  }
}
