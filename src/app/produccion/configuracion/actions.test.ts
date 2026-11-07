import { beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ permiso: vi.fn(), comprobar: vi.fn(), guardar: vi.fn(), obtener: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.permiso }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../configuracion-scopus", () => ({ comprobarClaveScopus: dobles.comprobar, guardarClaveScopus: dobles.guardar, obtenerClaveScopus: dobles.obtener }));
import { configurarScopusAction } from "./actions";
import { afterEach } from "vitest";
function datos(operacion = "guardar") { const datos = new FormData(); datos.set("clave", "ficticia"); datos.set("operacion", operacion); return datos; }
describe("Acción de configuración Scopus", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("SCOPUS_CLAVE_MAESTRA", "ab".repeat(32)); dobles.comprobar.mockResolvedValue(null); });
  afterEach(() => vi.unstubAllEnvs());
  it("exige administrador antes de acceder a claves", async () => {
    dobles.permiso.mockRejectedValue(new Error("Sin permiso"));
    await expect(configurarScopusAction({}, datos())).rejects.toThrow("Sin permiso");
    expect(dobles.permiso).toHaveBeenCalledWith(["ADMINISTRADOR"]);
    expect(dobles.comprobar).not.toHaveBeenCalled();
  });
  it("guarda solo tras una conexión válida y no devuelve la clave", async () => {
    const resultado = await configurarScopusAction({}, datos());
    expect(dobles.guardar).toHaveBeenCalledWith("ficticia");
    expect(resultado.exito).toBeDefined();
    expect(JSON.stringify(resultado)).not.toContain("ficticia");
  });
  it("conserva la clave existente ante fallo de conexión o protección ausente", async () => {
    dobles.comprobar.mockResolvedValue("Acceso rechazado");
    expect((await configurarScopusAction({}, datos())).error).toBeDefined();
    expect(dobles.guardar).not.toHaveBeenCalled();
    vi.stubEnv("SCOPUS_CLAVE_MAESTRA", "");
    expect((await configurarScopusAction({}, datos())).error).toContain("protección");
  });
  it("comprueba la actual sin reemplazarla y oculta excepciones", async () => {
    dobles.obtener.mockResolvedValue("actual-ficticia");
    expect((await configurarScopusAction({}, datos("comprobar-actual"))).exito).toBeDefined();
    expect(dobles.guardar).not.toHaveBeenCalled();
    dobles.obtener.mockRejectedValue(new Error("secreto"));
    expect(JSON.stringify(await configurarScopusAction({}, datos("comprobar-actual")))).not.toContain("secreto");
  });
});
