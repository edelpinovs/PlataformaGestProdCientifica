import { afterEach, describe, expect, it, vi } from "vitest";
import { demoHabilitada, ejecutarDemostracion, memoriaDemoVacia } from "./demostracion";

describe("Demostración aislada", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("está desactivada por defecto y siempre bloqueada fuera de desarrollo", () => {
    expect(demoHabilitada("development", undefined)).toBe(false);
    expect(demoHabilitada("production", "1")).toBe(false);
    expect(demoHabilitada("test", "1")).toBe(false);
    expect(demoHabilitada("development", "1")).toBe(true);
  });
  it("usa el motor real con historial, incremental, deduplicación, coautorías y estados", async () => {
    const http = vi.fn(() => { throw new Error("No se permite HTTP en la demostración"); });
    vi.stubGlobal("fetch", http);
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
    const vacia = memoriaDemoVacia();
    const primero = await ejecutarDemostracion(vacia, "escanear-1");
    expect(primero.memoria.obras).toHaveLength(2);
    expect(primero.memoria.autorias).toHaveLength(2);
    expect([...(primero.fuentesConsultadas ?? [])].sort()).toEqual(["OPENALEX: historial completo", "ORCID: historial completo"]);
    expect(vacia.obras).toHaveLength(0);
    const repetido = await ejecutarDemostracion(primero.memoria, "escanear-1");
    expect(repetido.memoria.obras).toHaveLength(2);
    expect(repetido.memoria.autorias).toHaveLength(2);
    expect(repetido.mensaje).toContain("Autorías nuevas: 0");
    expect([...(repetido.fuentesConsultadas ?? [])].sort()).toEqual(["OPENALEX: 2025", "OPENALEX: 2026", "ORCID: 2025", "ORCID: 2026"]);
    const segundo = await ejecutarDemostracion(repetido.memoria, "escanear-2");
    expect(segundo.memoria.obras).toHaveLength(2);
    expect(segundo.memoria.autorias).toHaveLength(4);
    const validado = await ejecutarDemostracion(segundo.memoria, "validar-1");
    const rechazado = await ejecutarDemostracion(validado.memoria, "rechazar-2");
    const reescaneo = await ejecutarDemostracion(rechazado.memoria, "escanear-1", 2018);
    const otro = await ejecutarDemostracion(reescaneo.memoria, "escanear-2", 2023);
    expect(otro.memoria.autorias.map((fila) => fila.estado)).toEqual(["VALIDADA", "VALIDADA", "RECHAZADA", "RECHAZADA"]);
    expect(otro.memoria.cortes).toEqual(segundo.memoria.cortes);
    expect((await ejecutarDemostracion(otro.memoria, "reiniciar")).memoria).toEqual(vacia);
    expect(http).not.toHaveBeenCalled();
  });
  it("respeta el año solicitado y no crea corte histórico", async () => {
    const resultado = await ejecutarDemostracion(memoriaDemoVacia(), "escanear-1", 2018);
    expect(resultado.memoria.obras).toHaveLength(1);
    expect(resultado.memoria.cortes).toHaveLength(0);
  });
});
