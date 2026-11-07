import { beforeEach, describe, expect, it, vi } from "vitest";
import { cifrarClaveScopus } from "@/modules/produccion/configuracion-scopus";
const dobles = vi.hoisted(() => ({ leer: vi.fn(), guardar: vi.fn(), http: vi.fn(), indice: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { configuracionScopus: { findUnique: dobles.leer, upsert: dobles.guardar } } }));
vi.mock("@/modules/produccion/conectores/http", () => ({ fetchJsonConReintentos: dobles.http }));
vi.mock("@/modules/produccion/conectores/scopus", () => ({ consultarIndiceH: dobles.indice }));
import { obtenerClaveScopus, estadoConfiguracionScopus, guardarClaveScopus, consultarIndiceHConfigurado, comprobarClaveScopus } from "./configuracion-scopus";
import { afterEach } from "vitest";
describe("Persistencia de configuración Scopus", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("SCOPUS_CLAVE_MAESTRA", "ab".repeat(32)); vi.stubEnv("SCOPUS_API_KEY", "respaldo-ficticio"); });
  afterEach(() => vi.unstubAllEnvs());
  it("guarda solo el cifrado y devuelve únicamente metadatos al consultar el estado", async () => {
    await guardarClaveScopus("clave-ficticia");
    expect(JSON.stringify(dobles.guardar.mock.calls)).not.toContain("clave-ficticia");
    dobles.leer.mockResolvedValue({ actualizadaEn: new Date("2026-01-01") });
    expect(await estadoConfiguracionScopus()).toEqual({ configurada: true, protegida: true, origen: "Aplicación", actualizadaEn: "2026-01-01T00:00:00.000Z" });
    expect(dobles.leer).toHaveBeenLastCalledWith({ where: { id: "institucional" }, select: { actualizadaEn: true } });
  });
  it("inyecta la configuración vigente al índice h y falla sin respaldo silencioso", async () => {
    dobles.leer.mockResolvedValue({ claveCifrada: cifrarClaveScopus("app-ficticia", "ab".repeat(32)) });
    await consultarIndiceHConfigurado("123");
    expect(dobles.indice).toHaveBeenCalledWith("123", "app-ficticia");
    dobles.leer.mockResolvedValue({ claveCifrada: "roto" });
    await expect(obtenerClaveScopus()).rejects.toThrow("No se pudo abrir");
    dobles.leer.mockResolvedValue(null);
    expect(await obtenerClaveScopus()).toBe("respaldo-ficticio");
  });
  it("comprueba sin persistir y traduce respuestas de error incluso con HTTP 200", async () => {
    dobles.http.mockResolvedValue({ status: 200, data: { "service-error": {} } });
    expect(await comprobarClaveScopus("ficticia")).toContain("No se pudo");
    dobles.http.mockResolvedValue({ status: 200, data: { "search-results": {} } });
    expect(await comprobarClaveScopus("ficticia")).toBeNull();
    expect(dobles.guardar).not.toHaveBeenCalled();
  });
});
