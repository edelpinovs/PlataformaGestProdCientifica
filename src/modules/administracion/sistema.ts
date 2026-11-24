// Estado del sistema (issue 243): comprobaciones de solo lectura. Nunca devuelven valores de variables
// de entorno ni mensajes de error de las librerías: solo si algo responde y cuánto tardó.

export type ResultadoComprobacion = {
  responde: boolean;
  milisegundos: number;
  /** Verdadero si no contestó dentro del tiempo límite (distinto de un fallo que responde rápido). */
  agotado: boolean;
};

/** Segundos que se espera a un servicio antes de decir «no responde». */
export const LIMITE_COMPROBACION_MS = 3000;

export type Espera<T> = { ok: true; valor: T } | { ok: false; agotado: boolean };

/**
 * Ejecuta `tarea` y espera su valor como máximo `limiteMs`. Un fallo o pasar del límite devuelve
 * `ok: false` (con `agotado` si fue por tiempo), sin propagar el error ni esperar más. Sirve para toda
 * lectura de la página de sistema, no solo para el ping: si la base no contesta, ninguna consulta que
 * dependa de ella puede dejar la página colgada.
 */
export async function esperarConLimite<T>(
  tarea: () => Promise<T>,
  limiteMs: number = LIMITE_COMPROBACION_MS,
): Promise<Espera<T>> {
  let agotado = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => {
        agotado = true;
        rechazar(new Error("tiempo agotado"));
      }, limiteMs);
    });
    return { ok: true, valor: await Promise.race([Promise.resolve().then(tarea), limite]) };
  } catch {
    return { ok: false, agotado };
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Ejecuta `ping` y mide cuánto tarda. Un fallo o pasar de `limiteMs` se convierte en «no responde», sin
 * propagar el error ni esperar más: una base que no contesta no debe dejar la página colgada.
 */
export async function comprobarServicio(
  ping: () => Promise<unknown>,
  ahora: () => number = () => performance.now(),
  limiteMs: number = LIMITE_COMPROBACION_MS,
): Promise<ResultadoComprobacion> {
  const inicio = ahora();
  const espera = await esperarConLimite(ping, limiteMs);
  return {
    responde: espera.ok,
    agotado: !espera.ok && espera.agotado,
    milisegundos: Math.max(0, Math.round(ahora() - inicio)),
  };
}

const ENTORNOS: Record<string, string> = { production: "Producción", preview: "Vista previa", development: "Desarrollo" };

/** Entorno de despliegue en español; fuera de Vercel es «Local». */
export function nombreEntorno(valor: string | undefined): string {
  return ENTORNOS[valor ?? ""] ?? "Local";
}

/** Los siete primeros caracteres del commit desplegado, o null si no hay. */
export function versionCorta(commit: string | undefined): string | null {
  const limpio = commit?.trim();
  return limpio ? limpio.slice(0, 7) : null;
}
