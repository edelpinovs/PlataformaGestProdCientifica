import { describe, expect, it } from "vitest";
import { comprobarServicio, nombreEntorno, versionCorta } from "./sistema";

describe("comprobación de servicios", () => {
  it("mide el tiempo de respuesta", async () => {
    const tiempos = [100, 142.4];
    const r = await comprobarServicio(async () => "ok", () => tiempos.shift() ?? 0);
    expect(r).toEqual({ responde: true, milisegundos: 42 });
  });

  it("un fallo se vuelve «no responde» y no propaga el error ni su mensaje", async () => {
    const r = await comprobarServicio(async () => {
      throw new Error("postgres://usuario:secreto@servidor");
    });
    expect(r.responde).toBe(false);
    expect(JSON.stringify(r)).not.toContain("secreto");
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
