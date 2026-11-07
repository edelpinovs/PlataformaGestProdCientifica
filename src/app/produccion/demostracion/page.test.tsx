import { afterEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ permiso: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.permiso }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("No disponible"); } }));
vi.mock("./simulador", () => ({ SimuladorEscaneo: () => null }));
import Pagina from "./page";
describe("Página de demostración", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("deniega el acceso antes de renderizar", async () => {
    dobles.permiso.mockRejectedValue(new Error("Sin permiso"));
    await expect(Pagina()).rejects.toThrow("Sin permiso");
  });
  it("no existe en producción y renderiza con activación explícita en desarrollo", async () => {
    dobles.permiso.mockResolvedValue({ correo: "admin@demo.invalid", rol: "ADMINISTRADOR" });
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("PRODUCCION_DEMO", "1");
    await expect(Pagina()).rejects.toThrow("No disponible");
    vi.stubEnv("NODE_ENV", "development");
    expect(await Pagina()).toBeDefined();
  });
});
