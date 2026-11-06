import { beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ permiso: vi.fn(), estado: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.permiso }));
vi.mock("../configuracion-scopus", () => ({ estadoConfiguracionScopus: dobles.estado }));
vi.mock("./formulario", () => ({ FormularioConfiguracionScopus: () => null }));
import Pagina from "./page";
describe("Acceso a configuración Scopus", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each(["DOCENTE", "COORDINADOR", "SIN_SESION"])("bloquea %s antes de leer configuración", async () => {
    dobles.permiso.mockRejectedValue(new Error("Sin permiso"));
    await expect(Pagina()).rejects.toThrow("Sin permiso");
    expect(dobles.estado).not.toHaveBeenCalled();
    expect(dobles.permiso).toHaveBeenCalledWith(["ADMINISTRADOR"]);
  });
  it("permite administrar sin entregar la clave al componente", async () => {
    dobles.permiso.mockResolvedValue({ correo: "admin@demo.invalid", rol: "ADMINISTRADOR" });
    dobles.estado.mockResolvedValue({ configurada: true, protegida: true, origen: "Aplicación", actualizadaEn: null });
    expect(await Pagina()).toBeDefined();
    expect(dobles.estado).toHaveBeenCalledOnce();
  });
});
