// Cliente HTTP base para conectores de APIs externas con reintentos y control de tasa (RNF-002).

export type OpcionesPeticion = {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxReintentos?: number;
};

export type RespuestaHttp<T> = {
  data: T | null;
  status: number;
  headers: Headers;
  error?: string;
};

export async function fetchJsonConReintentos<T = unknown>(
  url: string,
  opciones?: OpcionesPeticion,
): Promise<RespuestaHttp<T>> {
  const timeoutMs = opciones?.timeoutMs ?? 20000;
  const maxReintentos = opciones?.maxReintentos ?? 3;

  let urlCompleta = url;
  if (opciones?.params) {
    const urlObj = new URL(url);
    for (const [clave, valor] of Object.entries(opciones.params)) {
      if (valor !== undefined && valor !== null && valor !== "") {
        urlObj.searchParams.append(clave, String(valor));
      }
    }
    urlCompleta = urlObj.toString();
  }

  for (let intento = 1; intento <= maxReintentos; intento++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(urlCompleta, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...opciones?.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Si es exitoso, parsear JSON
      if (resp.ok) {
        try {
          const json = (await resp.json()) as T;
          return { data: json, status: resp.status, headers: resp.headers };
        } catch {
          return { data: null, status: resp.status, headers: resp.headers, error: "JSON_INVALIDO" };
        }
      }

      // Si recibimos 429 (Too Many Requests) o 5xx (error de servidor), esperar y reintentar si no es el último intento
      const reintentable = resp.status === 429 || resp.status >= 500;
      if (reintentable && intento < maxReintentos) {
        // Verificar si la API envió Retry-After
        const retryAfter = resp.headers.get("retry-after");
        let esperaMs = intento * 1500;
        if (retryAfter) {
          const segundos = parseInt(retryAfter, 10);
          if (!isNaN(segundos) && segundos > 0) {
            esperaMs = Math.min(segundos * 1000, 10000);
          }
        }
        await new Promise((r) => setTimeout(r, esperaMs));
        continue;
      }

      return {
        data: null,
        status: resp.status,
        headers: resp.headers,
        error: `HTTP_${resp.status}`,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const esAbort = err instanceof Error && err.name === "AbortError";
      if (intento < maxReintentos) {
        await new Promise((r) => setTimeout(r, intento * 1500));
        continue;
      }
      return {
        data: null,
        status: esAbort ? 408 : 0,
        headers: new Headers(),
        error: esAbort ? "TIMEOUT" : "ERROR_CONEXION",
      };
    }
  }

  return {
    data: null,
    status: 0,
    headers: new Headers(),
    error: "INTENTOS_AGOTADOS",
  };
}
