import { beforeEach, describe, expect, it, vi } from "vitest";
import { editarReconocimientoProdep, registrarReconocimientoProdep } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesor: { findUnique: vi.fn() },
  reconocimientoProdep: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    profesorId: "7",
    tipoSolicitud: "RENOVACION",
    resultado: "APROBADO",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-12-31",
    ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

const existente = {
  id: 2,
  inicio: new Date("2026-06-01T00:00:00.000Z"),
  fin: new Date("2027-05-31T00:00:00.000Z"),
  resultado: "APROBADO" as const,
};

describe("acciones PRODEP (RF-011)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findUnique.mockResolvedValue({ id: 7 });
    dobles.reconocimientoProdep.findMany.mockResolvedValue([existente]);
    dobles.reconocimientoProdep.findUnique.mockResolvedValue({ convocatoriaId: null });
    dobles.reconocimientoProdep.create.mockResolvedValue({});
    dobles.reconocimientoProdep.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rechaza el registro antes de guardar e identifica el rango en conflicto", async () => {
    const estado = await registrarReconocimientoProdep({}, formulario());
    expect(estado.error).toContain("2026-06-01 al 2027-05-31");
    expect(estado.campo).toBe("fechas");
    expect(dobles.reconocimientoProdep.create).not.toHaveBeenCalled();
  });

  it("no consulta vigencias al registrar un dictamen no aprobado", async () => {
    const estado = await registrarReconocimientoProdep({}, formulario({ resultado: "NO_APROBADO" }));
    expect(estado.error).toBeUndefined();
    expect(dobles.reconocimientoProdep.findMany).not.toHaveBeenCalled();
    expect(dobles.reconocimientoProdep.create).toHaveBeenCalledOnce();
  });

  it("permite editar las fechas propias, pero conserva la detección de otros conflictos", async () => {
    dobles.reconocimientoProdep.findMany.mockResolvedValue([
      { ...existente, id: 9, inicio: new Date("2026-01-01T00:00:00.000Z"), fin: new Date("2026-12-31T00:00:00.000Z") },
    ]);
    const datos = formulario({ fechaInicio: "2026-01-01", fechaFin: "2026-12-31" });
    datos.set("id", "9");
    await editarReconocimientoProdep({}, datos);
    expect(dobles.reconocimientoProdep.updateMany).toHaveBeenCalledOnce();
  });

  it("rechaza una edición que choca con otra vigencia distinta", async () => {
    dobles.reconocimientoProdep.findMany.mockResolvedValue([
      { ...existente, id: 9, inicio: new Date("2026-01-01T00:00:00.000Z"), fin: new Date("2026-12-31T00:00:00.000Z") },
      existente,
    ]);
    const datos = formulario({ fechaInicio: "2026-01-01", fechaFin: "2026-12-31" });
    datos.set("id", "9");
    const estado = await editarReconocimientoProdep({}, datos);
    expect(estado.error).toContain("se traslapa");
    expect(estado.campo).toBe("fechas");
    expect(dobles.reconocimientoProdep.updateMany).not.toHaveBeenCalled();
  });

  it("exige permiso antes de consultar reconocimientos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(registrarReconocimientoProdep({}, formulario())).rejects.toThrow("Sin permiso");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
  });
});
