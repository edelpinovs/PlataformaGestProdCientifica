// Estado del sistema (issue 243): comprobaciones de solo lectura. Nunca devuelven valores de variables
// de entorno ni mensajes de error de las librerías: solo si algo responde y cuánto tardó.

export type ResultadoComprobacion = { responde: boolean; milisegundos: number };

/** Ejecuta `ping` y mide cuánto tarda. Un fallo se convierte en «no responde», sin propagar el error. */
export async function comprobarServicio(
  ping: () => Promise<unknown>,
  ahora: () => number = () => performance.now(),
): Promise<ResultadoComprobacion> {
  const inicio = ahora();
  let responde = true;
  try {
    await ping();
  } catch {
    responde = false;
  }
  return { responde, milisegundos: Math.max(0, Math.round(ahora() - inicio)) };
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
