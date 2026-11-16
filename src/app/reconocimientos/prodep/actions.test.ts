import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  editarReconocimientoProdep,
  registrarReconocimientoProdep,
} from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesor: { findUnique: vi.fn() },
  reconocimientoProdep: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
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
    tipoSolicitud: "PRIMER_RECONOCIMIENTO",
    resultado: "APROBADO",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-12-31",
    ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

describe("acciones de Perfil Deseable PRODEP", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findUnique.mockResolvedValue({ id: 7, tipoContratacion: "TIEMPO_COMPLETO" });
    dobles.reconocimientoProdep.create.mockResolvedValue({});
    dobles.reconocimientoProdep.findUnique.mockResolvedValue({ convocatoriaId: null });
    dobles.reconocimientoProdep.updateMany.mockResolvedValue({ count: 1 });
  });

  it("consulta la contratación real y permite el alta de Tiempo Completo", async () => {
    const estado = await registrarReconocimientoProdep({}, formulario());

    expect(dobles.profesor.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, tipoContratacion: true },
    });
    expect(dobles.reconocimientoProdep.create).toHaveBeenCalledOnce();
    expect(estado.registrado).toBe(true);
  });

  it("rechaza el alta de Asignatura sin guardar", async () => {
    dobles.profesor.findUnique.mockResolvedValue({ id: 7, tipoContratacion: "ASIGNATURA" });

    const estado = await registrarReconocimientoProdep({}, formulario());

    expect(estado.error).toBe("El Perfil Deseable PRODEP requiere Tiempo Completo.");
    expect(dobles.reconocimientoProdep.create).not.toHaveBeenCalled();
  });

  it("rechaza la edición de Asignatura sin actualizar", async () => {
    dobles.profesor.findUnique.mockResolvedValue({ id: 7, tipoContratacion: "ASIGNATURA" });
    const datos = formulario({ id: "3" });

    const estado = await editarReconocimientoProdep({}, datos);

    expect(estado.error).toBe("El Perfil Deseable PRODEP requiere Tiempo Completo.");
    expect(dobles.reconocimientoProdep.updateMany).not.toHaveBeenCalled();
  });

  it("permite editar a Tiempo Completo", async () => {
    const datos = formulario({ id: "3" });

    await editarReconocimientoProdep({}, datos);

    expect(dobles.reconocimientoProdep.updateMany).toHaveBeenCalledOnce();
  });

  it("exige permiso antes de consultar la contratación", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));

    await expect(registrarReconocimientoProdep({}, formulario())).rejects.toThrow("Sin permiso");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
  });
});
