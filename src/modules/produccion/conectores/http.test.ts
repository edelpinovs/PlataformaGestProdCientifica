import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearClienteHttp } from "./http";

const inicio = new Date("2026-11-05T12:00:00Z");
const respuestaJson = () => new Response(JSON.stringify({ resultado: "ficticio" }), {
  status: 200, headers: { "content-type": "application/json" },
});

describe("RF-020 y RNF-002: peticiones externas", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(inicio); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("espacia peticiones simultáneas al mismo origen, aunque usen claves o rutas diferentes", async () => {
    const cliente = crearClienteHttp(250);
    const instantes: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => { instantes.push(Date.now() - inicio.getTime()); return respuestaJson(); }));
    const tareas = [cliente("https://api.example/obras?api_key=ficticia-a"), cliente("https://api.example/autores?api_key=ficticia-b"), cliente("https://api.example/revistas")];
    await vi.advanceTimersByTimeAsync(500);
    await Promise.all(tareas);
    expect(instantes).toEqual([0, 250, 500]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("una API no bloquea peticiones dirigidas a otro origen", async () => {
    const cliente = crearClienteHttp(250);
    const fetchFalso = vi.fn(async () => respuestaJson());
    vi.stubGlobal("fetch", fetchFalso);
    await Promise.all([cliente("https://primera.example/obras"), cliente("https://segunda.example/obras")]);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(Date.now()).toBe(inicio.getTime());
  });

  it.each(["2", "Thu, 05 Nov 2026 12:00:02 GMT"])("respeta Retry-After expresado como %s", async (retryAfter) => {
    const cliente = crearClienteHttp();
    const instantes: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => {
      instantes.push(Date.now() - inicio.getTime());
      return instantes.length === 1 ? new Response(null, { status: 429, headers: { "retry-after": retryAfter } }) : respuestaJson();
    }));
    const tarea = cliente("https://api.example/obras");
    await vi.advanceTimersByTimeAsync(1999);
    expect(instantes).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    expect((await tarea).status).toBe(200);
    expect(instantes).toEqual([0, 2000]);
  });

  it("una pausa larga devuelve 429 y bloquea nuevas consultas tempranas al mismo proveedor", async () => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn(async () => new Response(null, { status: 429, headers: { "retry-after": "60" } }));
    vi.stubGlobal("fetch", fetchFalso);
    expect((await cliente("https://api.example/obras")).error).toBe("HTTP_429");
    expect((await cliente("https://api.example/autores")).status).toBe(429);
    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    await cliente("https://api.example/autores");
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("la cuota se respeta aunque el 429 ocurra en el último intento", async () => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn(async () => new Response(null, { status: 429, headers: { "retry-after": "60" } }));
    vi.stubGlobal("fetch", fetchFalso);
    await cliente("https://api.example/obras", { maxReintentos: 1 });
    await cliente("https://api.example/obras", { maxReintentos: 1 });
    expect(fetchFalso).toHaveBeenCalledOnce();
  });

  it("cancela también la descarga del JSON cuando los encabezados ya llegaron", async () => {
    const cliente = crearClienteHttp();
    vi.stubGlobal("fetch", vi.fn(async (_url, opciones) => ({
      ok: true, status: 200, headers: new Headers(),
      json: () => new Promise((_resolver, rechazar) => opciones.signal.addEventListener("abort", () => rechazar(new DOMException("Abortado", "AbortError")), { once: true })),
    })));
    const tarea = cliente("https://api.example/obras", { timeoutMs: 50, maxReintentos: 1 });
    await vi.advanceTimersByTimeAsync(50);
    expect((await tarea).error).toBe("TIMEOUT");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reintenta un timeout sin dejar temporizadores pendientes", async () => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn()
      .mockImplementationOnce((_url, opciones) => new Promise((_resolver, rechazar) => opciones.signal.addEventListener("abort", () => rechazar(new DOMException("Abortado", "AbortError")), { once: true })))
      .mockResolvedValueOnce(respuestaJson());
    vi.stubGlobal("fetch", fetchFalso);
    const tarea = cliente("https://api.example/obras", { timeoutMs: 50, maxReintentos: 2 });
    await vi.advanceTimersByTimeAsync(1550);
    expect((await tarea).status).toBe(200);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("un JSON inválido no se reintenta como si fuera un fallo de red", async () => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn(async () => new Response("JSON roto", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
    expect((await cliente("https://api.example/obras")).error).toBe("JSON_INVALIDO");
    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([401, 403, 404])("no reintenta el error permanente HTTP %s", async (estado) => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn(async () => new Response(null, { status: estado }));
    vi.stubGlobal("fetch", fetchFalso);
    expect((await cliente("https://api.example/obras")).status).toBe(estado);
    expect(fetchFalso).toHaveBeenCalledOnce();
  });

  it("reintenta 503 con espera progresiva y se detiene al agotar los intentos", async () => {
    const cliente = crearClienteHttp();
    const instantes: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async () => { instantes.push(Date.now() - inicio.getTime()); return new Response(null, { status: 503 }); }));
    const tarea = cliente("https://api.example/obras", { maxReintentos: 3 });
    await vi.advanceTimersByTimeAsync(4500);
    expect((await tarea).error).toBe("HTTP_503");
    expect(instantes).toEqual([0, 1500, 4500]);
  });

  it("envía parámetros y cabeceras sin cachear respuestas de escaneo", async () => {
    const cliente = crearClienteHttp();
    const fetchFalso = vi.fn(async () => respuestaJson());
    vi.stubGlobal("fetch", fetchFalso);
    await cliente("https://api.example/obras", { params: { anio: 2026, vacio: "", ausente: undefined }, headers: { "X-API-Key": "ficticia" } });
    expect(fetchFalso).toHaveBeenCalledWith("https://api.example/obras?anio=2026", expect.objectContaining({
      cache: "no-store", headers: { Accept: "application/json", "X-API-Key": "ficticia" },
    }));
  });
});
