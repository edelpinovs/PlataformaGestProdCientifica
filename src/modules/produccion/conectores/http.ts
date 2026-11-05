// Cliente HTTP de APIs externas: separación por origen, reintentos y timeout
// durante toda la descarga, incluidos los cuerpos JSON (RF-020, RNF-002).
export type OpcionesPeticion = {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxReintentos?: number;
  maxEsperaMs?: number;
};

export type RespuestaHttp<T> = {
  data: T | null;
  status: number;
  headers: Headers;
  error?: string;
};

function esperaReintento(valor: string | null): number | null {
  if (!valor?.trim()) return null;
  if (/^\d+$/.test(valor.trim())) return Number(valor) * 1000;
  const fecha = Date.parse(valor);
  return Number.isFinite(fecha) ? Math.max(0, fecha - Date.now()) : null;
}

const esperar = (milisegundos: number) => new Promise<void>((resolver) => setTimeout(resolver, milisegundos));

/** La cola y el enfriamiento son por origen y por proceso. No reemplazan una
 * cuota compartida entre instancias; los 429 del proveedor siguen siendo la
 * autoridad para detener consultas cuando se agota una cuota global.
 */
export function crearClienteHttp(intervaloMinimoMs = 250) {
  const turnos = new Map<string, Promise<void>>();
  const siguientePeticion = new Map<string, number>();

  return async function consultarJson<T = unknown>(url: string, opciones?: OpcionesPeticion): Promise<RespuestaHttp<T>> {
    const destino = new URL(url);
    for (const [clave, valor] of Object.entries(opciones?.params ?? {})) {
      if (valor !== undefined && valor !== null && valor !== "") destino.searchParams.append(clave, String(valor));
    }
    const origen = destino.origin;
    const anterior = turnos.get(origen) ?? Promise.resolve();
    let liberar!: () => void;
    const turno = new Promise<void>((resolver) => { liberar = resolver; });
    turnos.set(origen, turno);
    await anterior;

    const maxIntentos = Math.max(1, opciones?.maxReintentos ?? 3);
    const timeoutMs = Math.max(1, opciones?.timeoutMs ?? 20_000);
    const maxEsperaMs = Math.max(0, opciones?.maxEsperaMs ?? 10_000);
    try {
      for (let intento = 1; intento <= maxIntentos; intento++) {
        const espera = Math.max(0, (siguientePeticion.get(origen) ?? 0) - Date.now());
        if (espera > maxEsperaMs) {
          return { data: null, status: 429, headers: new Headers({ "retry-after": String(Math.ceil(espera / 1000)) }), error: "HTTP_429" };
        }
        if (espera) await esperar(espera);
        siguientePeticion.set(origen, Date.now() + Math.max(0, intervaloMinimoMs));

        const controlador = new AbortController();
        const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
        let pausa = intento * 1500;
        try {
          const respuesta = await fetch(destino.toString(), {
            method: "GET", cache: "no-store",
            headers: { Accept: "application/json", ...opciones?.headers }, signal: controlador.signal,
          });
          if (respuesta.ok) {
            try {
              const data = await respuesta.json() as T;
              return { data, status: respuesta.status, headers: respuesta.headers };
            } catch (error: unknown) {
              if (controlador.signal.aborted || !(error instanceof SyntaxError)) throw error;
              return { data: null, status: respuesta.status, headers: respuesta.headers, error: "JSON_INVALIDO" };
            }
          }

          const reintentable = respuesta.status === 429 || respuesta.status >= 500;
          const esperaServidor = reintentable ? esperaReintento(respuesta.headers.get("retry-after")) : null;
          pausa = esperaServidor ?? pausa;
          // Conserva también las pausas largas para las peticiones que ya están
          // en cola, sin retener una función de Vercel esperando minutos u horas.
          if (reintentable) siguientePeticion.set(origen, Math.max(siguientePeticion.get(origen) ?? 0, Date.now() + pausa));
          await respuesta.body?.cancel();
          if (!reintentable || intento === maxIntentos || pausa > maxEsperaMs) {
            return { data: null, status: respuesta.status, headers: respuesta.headers, error: `HTTP_${respuesta.status}` };
          }
        } catch (error: unknown) {
          const timeout = controlador.signal.aborted || (error instanceof Error && error.name === "AbortError");
          if (intento === maxIntentos || pausa > maxEsperaMs) {
            return { data: null, status: timeout ? 408 : 0, headers: new Headers(), error: timeout ? "TIMEOUT" : "ERROR_CONEXION" };
          }
          siguientePeticion.set(origen, Math.max(siguientePeticion.get(origen) ?? 0, Date.now() + pausa));
        } finally {
          clearTimeout(temporizador);
        }
      }
      return { data: null, status: 0, headers: new Headers(), error: "INTENTOS_AGOTADOS" };
    } finally {
      liberar();
      if (turnos.get(origen) === turno) turnos.delete(origen);
    }
  };
}

export const fetchJsonConReintentos = crearClienteHttp();
