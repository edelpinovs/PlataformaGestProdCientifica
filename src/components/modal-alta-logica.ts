export type ValoresAlta = Record<string, string | string[]>;
export type EstadoAlta = { error?: string; campo?: string; valores?: ValoresAlta; exito?: string };

/** Conserva campos repetidos sin incluir los metadatos internos de React. */
export function valoresAlta(datos: FormData): ValoresAlta {
  const valores: ValoresAlta = {};
  for (const [nombre, valor] of datos) {
    if (nombre.startsWith("$ACTION_") || typeof valor !== "string") continue;
    if (!Object.hasOwn(valores, nombre)) valores[nombre] = valor;
    else {
      const anterior = valores[nombre];
      valores[nombre] = Array.isArray(anterior) ? [...anterior, valor] : [anterior, valor];
    }
  }
  return valores;
}

export function decidirCierre(enviando: boolean, conCambios: boolean) {
  return enviando ? "esperar" : conCambios ? "confirmar" : "cerrar";
}

export function resultadoAlta(resultado: EstadoAlta, datos: FormData): EstadoAlta {
  if (resultado.exito && !resultado.error) return { exito: resultado.exito };
  return {
    error: resultado.error || "No se confirmó el guardado. Revisa los datos e inténtalo de nuevo.",
    campo: resultado.campo,
    valores: { ...valoresAlta(datos), ...resultado.valores },
  };
}
