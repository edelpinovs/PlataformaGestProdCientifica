import { beforeEach, describe, expect, it, vi } from "vitest";
import { getModulo } from "@/modules/registry";
import { GET } from "./route";

const dobles = vi.hoisted(() => ({ requireModulo: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("exportar reportes (issue #261)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("el módulo solo admite administración y coordinación", () => {
    expect(getModulo("reportes").roles).toEqual(["ADMINISTRADOR", "COORDINADOR"]);
  });

  it("exige el módulo antes de armar el archivo", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    const pedido = GET(new Request("http://localhost/reportes/exportar?reporte=completo&formato=xlsx&columnas=correo,cvu"));
    await expect(pedido).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("reportes");
  });

  it("el reporte de publicaciones también exige el módulo antes de leer datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    const pedido = GET(new Request("http://localhost/reportes/exportar?reporte=publicaciones&formato=pdf"));
    await expect(pedido).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("reportes");
  });
});
