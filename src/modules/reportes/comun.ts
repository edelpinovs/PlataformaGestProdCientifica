import { z } from "zod";

// Piezas comunes de los reportes. El valor `sin` aísla a quien no tiene
// departamento. Un correo marcador de la importación no se muestra como real.

export const FILTRO_SIN_DEPARTAMENTO = "sin";
export const CORREO_PENDIENTE = "Pendiente";
const DOMINIO_CORREO_PENDIENTE = "@pendiente.invalid";

export type FiltroDepartamento = number | typeof FILTRO_SIN_DEPARTAMENTO | null;

export function textoCorreo(correo: string | null | undefined, sinCorreo: string) {
  const limpio = correo?.trim() ?? "";
  if (!limpio) return sinCorreo;
  if (limpio.toLocaleLowerCase("es-MX").endsWith(DOMINIO_CORREO_PENDIENTE)) return CORREO_PENDIENTE;
  return limpio;
}

export function textoCvu(cvu: string | null | undefined, sinCvu: string) {
  const limpio = cvu?.trim() ?? "";
  return limpio || sinCvu;
}

export function leerDepartamento(
  crudo: string | string[] | undefined,
  permitidos: readonly number[],
): { id: FiltroDepartamento; error?: string } {
  if (crudo === undefined || crudo === "") return { id: null };
  if (Array.isArray(crudo)) return { id: null, error: "Elige un solo departamento." };
  const texto = crudo.trim();
  if (texto === "") return { id: null };
  if (texto === FILTRO_SIN_DEPARTAMENTO) return { id: FILTRO_SIN_DEPARTAMENTO };
  const resultado = z.string({ error: "Elige un solo departamento." })
    .regex(/^\d+$/, "Elige un departamento que exista.")
    .transform(Number)
    .safeParse(texto);
  if (!resultado.success || !permitidos.includes(resultado.data)) {
    return {
      id: null,
      error: resultado.success ? "Elige un departamento que exista." : resultado.error.issues[0]?.message ?? "Elige un departamento que exista.",
    };
  }
  return { id: resultado.data };
}

export function coincideDepartamento(filaId: number | null | undefined, filtro: FiltroDepartamento) {
  if (filtro === null) return true;
  if (filtro === FILTRO_SIN_DEPARTAMENTO) return filaId == null;
  return filaId === filtro;
}

export function columnasSinDatosPersonales<T extends string>(columnas: readonly T[]) {
  return columnas.filter((columna) => columna !== "correo" && columna !== "cvu");
}

export function mismaSeleccion<T extends string>(actual: readonly T[], referencia: readonly T[]) {
  return actual.length === referencia.length && referencia.every((columna) => actual.includes(columna));
}

/** «activo» no debe encontrar la celda «No activo». */
export function incluyeBusqueda(texto: string, busqueda: string) {
  const valor = texto.toLocaleLowerCase("es-MX");
  if (valor === "no activo" && busqueda === "activo") return false;
  return valor.includes(busqueda);
}
