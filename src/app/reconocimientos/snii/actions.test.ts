import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarReconocimientoSnii } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesor: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  reconocimientoSnii: { findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    profesorId: "7", cvu: "123456", nivel: "NIVEL_1", tipoParticipacion: "RENOVACION",
    fechaInicio: "2026-01-01", fechaFin: "2026-12-31", ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

const existente = { id: 1, inicio: new Date("2026-06-01T00:00:00.000Z"), fin: new Date("2027-05-31T00:00:00.000Z") };

describe("RF-007: traslape de periodos SNII según el resultado guardado", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findUnique.mockResolvedValue({ id: 7, cvu: "123456" });
    dobles.profesor.findFirst.mockResolvedValue(null);
    dobles.reconocimientoSnii.findMany.mockResolvedValue([existente]);
    dobles.$transaction.mockResolvedValue({ error: null });
  });

  it("un nivel aprobado que choca con otro periodo se rechaza", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario());
    expect(estado.error).toMatch(/se traslapa/);
    expect(dobles.$transaction).not.toHaveBeenCalled();
  });

  it("NO_APROBADO en reconsideración se guarda como EN_RECONSIDERACION y también revisa el traslape", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario({ nivel: "NO_APROBADO", enRecursoReconsideracion: "on" }));
    expect(dobles.reconocimientoSnii.findMany).toHaveBeenCalledOnce();
    expect(estado.error).toMatch(/se traslapa/);
    expect(dobles.$transaction).not.toHaveBeenCalled();
  });

  it("NO_APROBADO sin reconsideración no revisa el traslape", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario({ nivel: "NO_APROBADO" }));
    expect(dobles.reconocimientoSnii.findMany).not.toHaveBeenCalled();
    expect(estado.error).toBeUndefined();
    expect(dobles.$transaction).toHaveBeenCalledOnce();
  });

  it("exige permiso antes de leer la base", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(registrarReconocimientoSnii({}, formulario())).rejects.toThrow("Sin permiso");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
  });
});
