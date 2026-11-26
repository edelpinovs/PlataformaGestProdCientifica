import { afterEach, describe, expect, it, vi } from "vitest";
import { comprobarServicio, esperarConLimite, LIMITE_COMPROBACION_MS, nombreEntorno, versionCorta } from "./sistema";

describe("comprobación de servicios", () => {
  it("mide el tiempo de respuesta", async () => {
    const tiempos = [100, 142.4];
    const r = await comprobarServicio(async () => "ok", () => tiempos.shift() ?? 0);
    expect(r).toEqual({ responde: true, agotado: false, milisegundos: 42 });
  });

  it("un fallo se vuelve «no responde» y no propaga el error ni su mensaje", async () => {
    const r = await comprobarServicio(async () => {
      throw new Error("postgres://usuario:secreto@servidor");
    });
    expect(r.responde).toBe(false);
    expect(JSON.stringify(r)).not.toContain("secreto");
  });

  it("un fallo rápido no cuenta como tiempo agotado", async () => {
    const r = await comprobarServicio(async () => {
      throw new Error("conexión rechazada");
    });
    expect(r).toMatchObject({ responde: false, agotado: false });
  });

  describe("tiempo límite", () => {
    afterEach(() => vi.useRealTimers());

    it("el límite predeterminado es de 3 segundos", () => {
      expect(LIMITE_COMPROBACION_MS).toBe(3000);
    });

    it("si el servicio no contesta, responde «no responde» al pasar el límite sin esperarlo", async () => {
      vi.useFakeTimers();
      const sinRespuesta = () => new Promise<never>(() => {});
      const pendiente = comprobarServicio(sinRespuesta);
      await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS - 1);
      let terminado = false;
      void pendiente.then(() => (terminado = true));
      await Promise.resolve();
      expect(terminado).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pendiente).toMatchObject({ responde: false, agotado: true });
    });

    it("un servicio que contesta a tiempo no deja un temporizador pendiente", async () => {
      vi.useFakeTimers();
      const r = await comprobarServicio(async () => "ok");
      expect(r).toMatchObject({ responde: true, agotado: false });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("acepta otro límite", async () => {
      vi.useFakeTimers();
      const pendiente = comprobarServicio(() => new Promise<never>(() => {}), undefined, 500);
      await vi.advanceTimersByTimeAsync(500);
      expect(await pendiente).toMatchObject({ responde: false, agotado: true });
    });

    it("un ping que lanza de inmediato (antes de devolver una promesa) también es «no responde»", async () => {
      const r = await comprobarServicio(() => {
        throw new Error("falla síncrona con secreto");
      });
      expect(r).toMatchObject({ responde: false, agotado: false });
      expect(JSON.stringify(r)).not.toContain("secreto");
    });
  });

  describe("esperar con límite", () => {
    afterEach(() => vi.useRealTimers());

    it("devuelve el valor si llega a tiempo, sin dejar un temporizador pendiente", async () => {
      vi.useFakeTimers();
      expect(await esperarConLimite(async () => 42)).toEqual({ ok: true, valor: 42 });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("pasado el límite devuelve ok: false y agotado, sin esperar a la tarea", async () => {
      vi.useFakeTimers();
      const pendiente = esperarConLimite(() => new Promise<never>(() => {}));
      await vi.advanceTimersByTimeAsync(LIMITE_COMPROBACION_MS);
      expect(await pendiente).toEqual({ ok: false, agotado: true });
    });

    it("un fallo rápido devuelve ok: false sin agotado y sin propagar el mensaje", async () => {
      const r = await esperarConLimite(async () => {
        throw new Error("clave ilegible: secreto-123");
      });
      expect(r).toEqual({ ok: false, agotado: false });
      expect(JSON.stringify(r)).not.toContain("secreto");
    });

    it("una tarea que lanza de forma síncrona también devuelve ok: false", async () => {
      expect(
        await esperarConLimite(() => {
          throw new Error("síncrona");
        }),
      ).toEqual({ ok: false, agotado: false });
    });
  });

  it("nunca devuelve un tiempo negativo", async () => {
    const tiempos = [50, 40];
    expect((await comprobarServicio(async () => 1, () => tiempos.shift() ?? 0)).milisegundos).toBe(0);
  });
});

describe("entorno y versión", () => {
  it("traduce el entorno de Vercel y cae en Local", () => {
    expect(nombreEntorno("production")).toBe("Producción");
    expect(nombreEntorno("preview")).toBe("Vista previa");
    expect(nombreEntorno("development")).toBe("Desarrollo");
    expect(nombreEntorno(undefined)).toBe("Local");
    expect(nombreEntorno("otro")).toBe("Local");
  });

  it("acorta el commit o devuelve null si no hay", () => {
    expect(versionCorta("0123456789abcdef")).toBe("0123456");
    expect(versionCorta("  ")).toBeNull();
    expect(versionCorta(undefined)).toBeNull();
  });
});
