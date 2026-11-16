import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consultarVigenciaProdep,
  editarReconocimientoProdep,
  registrarReconocimientoProdep,
} from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesor: { findUnique: vi.fn() },
  reconocimientoProdep: {
    create: vi.fn(),
    findMany: vi.fn(),
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
    fechaFin: "2028-12-31",
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
    dobles.reconocimientoProdep.findMany.mockResolvedValue([]);
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
  describe("vigencia de 3 o 6 años (RF-010)", () => {
    const fecha = (dia: string) => new Date(`${dia}T00:00:00.000Z`);
    const antecedentes = [
      { id: 1, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", inicio: fecha("2020-01-01"), fin: fecha("2022-12-31") },
      { id: 2, tipoSolicitud: "RENOVACION", resultado: "APROBADO", inicio: fecha("2023-01-01"), fin: fecha("2025-12-31") },
    ];

    it("rechaza un alta cuya fecha de fin no es la que corresponde, sin guardar", async () => {
      const estado = await registrarReconocimientoProdep({}, formulario({ fechaFin: "2026-12-31" }));

      expect(estado).toMatchObject({
        error: "La fecha de fin debe ser 2028-12-31 para una vigencia de 3 años.",
        campo: "fechaFin",
      });
      expect(dobles.reconocimientoProdep.create).not.toHaveBeenCalled();
    });

    it("da seis años a la renovación que consolida el historial del profesor", async () => {
      dobles.reconocimientoProdep.findMany.mockResolvedValue(antecedentes);
      const renovacion = { tipoSolicitud: "RENOVACION", fechaInicio: "2026-01-01" };

      const corta = await registrarReconocimientoProdep({}, formulario({ ...renovacion, fechaFin: "2028-12-31" }));
      expect(corta.error).toBe("La fecha de fin debe ser 2031-12-31 para una vigencia de 6 años.");
      expect(dobles.reconocimientoProdep.create).not.toHaveBeenCalled();

      const estado = await registrarReconocimientoProdep({}, formulario({ ...renovacion, fechaFin: "2031-12-31" }));
      expect(estado.registrado).toBe(true);
      expect(dobles.reconocimientoProdep.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { profesorId: 7 } }));
    });

    it("al editar, el registro que se edita no cuenta como antecedente de sí mismo", async () => {
      await editarReconocimientoProdep({}, formulario({ id: "3" }));

      expect(dobles.reconocimientoProdep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profesorId: 7, id: { not: 3 } } }),
      );
      expect(dobles.reconocimientoProdep.updateMany).toHaveBeenCalledOnce();
    });

    it("rechaza la edición con un fin incorrecto sin actualizar", async () => {
      const estado = await editarReconocimientoProdep({}, formulario({ id: "3", fechaFin: "2027-12-31" }));

      expect(estado.campo).toBe("fechaFin");
      expect(dobles.reconocimientoProdep.updateMany).not.toHaveBeenCalled();
    });

    it("revisa la contratación antes de consultar el historial", async () => {
      dobles.profesor.findUnique.mockResolvedValue({ id: 7, tipoContratacion: "ASIGNATURA" });

      await registrarReconocimientoProdep({}, formulario());

      expect(dobles.reconocimientoProdep.findMany).not.toHaveBeenCalled();
    });
  });

  describe("vista previa de la vigencia (RF-010)", () => {
    const entrada = { profesorId: 7, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", fechaInicio: "2026-01-01" };

    it("devuelve el fin y la explicación calculados en el servidor", async () => {
      expect(await consultarVigenciaProdep(entrada)).toEqual({
        fechaFin: "2028-12-31",
        duracionAnios: 3,
        texto: "Primer reconocimiento: se aplican tres años de vigencia.",
      });
      expect(dobles.requireModulo).toHaveBeenCalledWith("reconocimientos");
    });

    it("excluye el registro que se edita del historial", async () => {
      await consultarVigenciaProdep({ ...entrada, excluirId: 3 });

      expect(dobles.reconocimientoProdep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { profesorId: 7, id: { not: 3 } } }),
      );
    });

    it("no calcula con datos atípicos ni sin permiso", async () => {
      expect(await consultarVigenciaProdep({ ...entrada, profesorId: Number.NaN })).toBeNull();
      expect(await consultarVigenciaProdep({ ...entrada, fechaInicio: "2026-02-30" })).toBeNull();
      expect(await consultarVigenciaProdep(null)).toBeNull();
      expect(dobles.reconocimientoProdep.findMany).not.toHaveBeenCalled();

      dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
      await expect(consultarVigenciaProdep(entrada)).rejects.toThrow("Sin permiso");
    });
  });
});
