import { beforeEach, describe, expect, it, vi } from "vitest";

// RF-019: asignar y quitar a mano el profesor de un renglón. Base y sesión son dobles; datos inventados.
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    profesor: { findFirst: vi.fn() },
    renglonResultado: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));

const { asignarProfesor, quitarAsignacion } = await import("./actions");

const formulario = (campos: Record<string, string>) => {
  const datos = new FormData();
  for (const [k, v] of Object.entries(campos)) datos.set(k, v);
  return datos;
};
const asignar = (campos: Record<string, string> = {}) =>
  asignarProfesor({}, formulario({ renglonId: "7", cargaId: "3", profesorId: "40", ...campos }));
const quitar = (campos: Record<string, string> = {}) =>
  quitarAsignacion({}, formulario({ renglonId: "7", cargaId: "3", ...campos }));
const renglon = (cambios: object = {}) => ({
  id: 7, numero: 12, cargaId: 3, criterio: "AMBIGUO", carga: { estado: "EN_REVISION" }, ...cambios,
});

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue({ id: "u" });
  dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon());
  dobles.prisma.renglonResultado.findFirst.mockResolvedValue(null);
  dobles.prisma.renglonResultado.updateMany.mockResolvedValue({ count: 1 });
  dobles.prisma.profesor.findFirst.mockResolvedValue({ id: 40, nombres: "Ana", apellidos: "Prueba Uno", codigo: "2009001" });
});

describe("asignarProfesor (RF-019)", () => {
  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(asignar()).rejects.toThrow("sin permiso");
    expect(dobles.prisma.renglonResultado.findUnique).not.toHaveBeenCalled();
  });

  it("guarda el profesor como MANUAL solo si el renglón y la carga siguen igual", async () => {
    const r = await asignar();
    expect(r).toEqual({ exito: "Se asignó a Prueba Uno, Ana al renglón 12." });
    expect(dobles.prisma.renglonResultado.updateMany).toHaveBeenCalledWith({
      where: { id: 7, cargaId: 3, criterio: { in: ["AMBIGUO", "SIN_COINCIDENCIA"] }, carga: { estado: "EN_REVISION" } },
      data: { profesorId: 40, criterio: "MANUAL" },
    });
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/convocatorias/revision/3");
  });

  it("no cambia una carga que ya no está en revisión", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ carga: { estado: "CONFIRMADA" } }));
    expect((await asignar()).error).toBe("Esta carga ya no está en revisión.");
    expect(dobles.prisma.renglonResultado.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza un renglón de otra carga o un id manipulado", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ cargaId: 99 }));
    expect((await asignar()).error).toBe("Ese renglón ya no está en esta carga.");
    expect((await asignar({ renglonId: "abc" })).error).toBe("Ese renglón ya no está en esta carga.");
    expect((await asignar({ cargaId: "99999999999" })).error).toBe("Ese renglón ya no está en esta carga.");
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(null);
    expect((await asignar()).error).toBe("Ese renglón ya no está en esta carga.");
    expect(dobles.prisma.renglonResultado.updateMany).not.toHaveBeenCalled();
  });

  it("solo asigna renglones dudosos o sin coincidencia", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ criterio: "NOMBRE" }));
    expect((await asignar()).error).toBe("Solo se asignan renglones dudosos o sin coincidencia.");
    expect(dobles.prisma.renglonResultado.updateMany).not.toHaveBeenCalled();
  });

  it("solo acepta profesores activos y explica un profesor inválido en español", async () => {
    dobles.prisma.profesor.findFirst.mockResolvedValue(null);
    expect((await asignar()).error).toBe("El profesor ya no está disponible para esta operación. Selecciona otro.");
    expect(dobles.prisma.profesor.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 40, estatusLaboral: "ACTIVO" } }));
    expect((await asignar({ profesorId: "" })).error).toBe("Selecciona un profesor válido de la lista.");
  });

  it("no pone al mismo profesor en dos renglones de la carga", async () => {
    dobles.prisma.renglonResultado.findFirst.mockResolvedValue({ numero: 41 });
    expect((await asignar()).error).toBe("Ese profesor ya está en el renglón 41 de esta carga.");
    expect(dobles.prisma.renglonResultado.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { cargaId: 3, profesorId: 40, id: { not: 7 } },
    }));
    expect(dobles.prisma.renglonResultado.updateMany).not.toHaveBeenCalled();
  });

  it("avisa si el renglón cambió entre la lectura y el guardado", async () => {
    dobles.prisma.renglonResultado.updateMany.mockResolvedValue({ count: 0 });
    expect((await asignar()).error).toBe("Ese renglón ya cambió. Recarga la página.");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("quitarAsignacion (RF-019)", () => {
  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(quitar()).rejects.toThrow("sin permiso");
    expect(dobles.prisma.renglonResultado.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve un renglón MANUAL a sin coincidencia", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ criterio: "MANUAL" }));
    expect(await quitar()).toEqual({ exito: "Se quitó la asignación del renglón 12." });
    expect(dobles.prisma.renglonResultado.updateMany).toHaveBeenCalledWith({
      where: { id: 7, cargaId: 3, criterio: "MANUAL", carga: { estado: "EN_REVISION" } },
      data: { profesorId: null, criterio: "SIN_COINCIDENCIA" },
    });
  });

  it("no quita una coincidencia del cruce automático", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ criterio: "CVU" }));
    expect((await quitar()).error).toBe("Solo se quitan las asignaciones hechas a mano.");
    expect(dobles.prisma.renglonResultado.updateMany).not.toHaveBeenCalled();
  });

  it("no cambia una carga que ya no está en revisión", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ criterio: "MANUAL", carga: { estado: "CONFIRMADA" } }));
    expect((await quitar()).error).toBe("Esta carga ya no está en revisión.");
  });

  it("avisa si el renglón cambió entre la lectura y el guardado", async () => {
    dobles.prisma.renglonResultado.findUnique.mockResolvedValue(renglon({ criterio: "MANUAL" }));
    dobles.prisma.renglonResultado.updateMany.mockResolvedValue({ count: 0 });
    expect((await quitar()).error).toBe("Ese renglón ya cambió. Recarga la página.");
  });
});
