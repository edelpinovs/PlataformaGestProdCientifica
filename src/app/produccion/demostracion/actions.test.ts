import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ permiso: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.permiso }));
import { demostrarEscaneoAction } from "./actions";
import { memoriaDemoVacia } from "@/modules/produccion/demostracion";
function formulario() { const datos = new FormData(); datos.set("operacion", "escanear-1"); return datos; }
describe("Protección del modo de demostración", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("PRODUCCION_DEMO", "1"); });
  afterEach(() => vi.unstubAllEnvs());
  it("exige permisos antes de ejecutar la simulación", async () => {
    dobles.permiso.mockRejectedValue(new Error("Sin permiso"));
    await expect(demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, formulario())).rejects.toThrow("Sin permiso");
    expect(dobles.permiso).toHaveBeenCalledWith("produccion");
  });
  it.each(["production", "test"])("bloquea %s incluso con la bandera activada", async (entorno) => {
    vi.stubEnv("NODE_ENV", entorno);
    const resultado = await demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, formulario());
    expect(resultado.error).toBeDefined(); expect(resultado.memoria.obras).toHaveLength(0);
  });
  it("bloquea desarrollo por defecto y valida el estado recibido", async () => {
    vi.stubEnv("PRODUCCION_DEMO", "");
    expect((await demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, formulario())).error).toBeDefined();
    vi.stubEnv("PRODUCCION_DEMO", "1");
    const anterior = { memoria: { ...memoriaDemoVacia(), obras: Array(100).fill({}) } };
    expect((await demostrarEscaneoAction(anterior, formulario())).error).toBeDefined();
  });
  it("devuelve resultados ficticios en desarrollo y errores legibles para entradas inválidas", async () => {
    const resultado = await demostrarEscaneoAction({ memoria: memoriaDemoVacia() }, formulario());
    expect(resultado.memoria.obras).toHaveLength(2);
    const datos = formulario(); datos.set("anio", "no-es-un-año");
    expect((await demostrarEscaneoAction(resultado, datos)).error).toContain("Revisa");
  });
});
