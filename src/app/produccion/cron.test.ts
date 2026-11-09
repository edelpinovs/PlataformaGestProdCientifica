import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/escaneo/route";

const dobles = vi.hoisted(() => ({ crear: vi.fn(), procesar: vi.fn(), leer: vi.fn(), after: vi.fn() }));
vi.mock("./trabajos", () => ({ crearTrabajoEscaneo: dobles.crear, procesarSiguienteProfesor: dobles.procesar, obtenerTrabajoPendiente: dobles.leer }));
vi.mock("next/server", async importar => ({ ...await importar<typeof import("next/server")>(), after: dobles.after }));

describe("cron retirado: búsqueda solo manual (#170)", () => {
  it("no inicia ni continúa trabajos aunque llegue una llamada al endpoint antiguo", async () => {
    const respuesta = await GET();
    expect(respuesta.status).toBe(410);
    expect(await respuesta.json()).toEqual({ error: "El escaneo programado está desactivado. Coordinación puede iniciarlo manualmente desde Producción." });
    expect(dobles.crear).not.toHaveBeenCalled();
    expect(dobles.procesar).not.toHaveBeenCalled();
    expect(dobles.leer).not.toHaveBeenCalled();
    expect(dobles.after).not.toHaveBeenCalled();
  });
  it("Vercel no tiene programada una ejecución periódica de escaneo", () => {
    const configuracion = JSON.parse(readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"));
    expect((configuracion.crons ?? []).some((cron: { path: string }) => cron.path === "/api/cron/escaneo")).toBe(false);
  });
});