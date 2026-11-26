import { beforeEach, describe, expect, it, vi } from "vitest";

// RF-019: asignar y quitar a mano el profesor de un renglón, y confirmar la carga. Base y sesión son
// dobles; datos inventados.
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  cargarConfirmacion: vi.fn(),
  recalcularConvocatoria: vi.fn(),
  prisma: {
    profesor: { findFirst: vi.fn() },
    renglonResultado: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    cargaResultados: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    reconocimientoSnii: { createMany: vi.fn() },
    reconocimientoProdep: { createMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/modules/convocatorias/cargar-confirmacion", () => ({ cargarConfirmacion: dobles.cargarConfirmacion }));
vi.mock("@/modules/convocatorias/recalcular", () => ({ recalcularConvocatoria: dobles.recalcularConvocatoria }));

const { asignarProfesor, confirmarCarga, quitarAsignacion } = await import("./actions");

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
  dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.tx));
  dobles.tx.cargaResultados.findUnique.mockResolvedValue({ estado: "EN_REVISION", convocatoria: { id: 5, programa: "SNII", anio: 2026 } });
  dobles.tx.cargaResultados.findFirst.mockResolvedValue(null);
  dobles.tx.cargaResultados.updateMany.mockResolvedValue({ count: 1 });
  dobles.cargarConfirmacion.mockResolvedValue({
    programa: "SNII", anio: 2026, contratacion: {}, historialSnii: [], historialProdep: [],
    renglones: [
      { id: 7, numero: 12, nombre: "PRUEBA ANA", profesorId: 40, criterio: "CVU", nivel: "CANDIDATO", vigenciaInicio: null, vigenciaFin: null },
      { id: 8, numero: 13, nombre: "PRUEBA LUIS", profesorId: 41, criterio: "CVU", nivel: null, vigenciaInicio: null, vigenciaFin: null },
    ],
  });
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

describe("confirmarCarga (RF-019)", () => {
  const confirmar = (cargaId = "3") => confirmarCarga({}, formulario({ cargaId }));

  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(confirmar()).rejects.toThrow("sin permiso");
    expect(dobles.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza un id manipulado o una carga que ya no existe", async () => {
    expect((await confirmar("abc")).error).toBe("Esa carga ya no existe. Recarga la página.");
    dobles.tx.cargaResultados.findUnique.mockResolvedValue(null);
    expect((await confirmar()).error).toBe("Esa carga ya no existe. Recarga la página.");
  });

  it("solo confirma una carga en revisión y una sola por convocatoria", async () => {
    dobles.tx.cargaResultados.findUnique.mockResolvedValue({ estado: "CONFIRMADA", convocatoria: { id: 5, programa: "SNII", anio: 2026 } });
    expect((await confirmar()).error).toBe("Esta carga ya no está en revisión.");
    dobles.tx.cargaResultados.findUnique.mockResolvedValue({ estado: "EN_REVISION", convocatoria: { id: 5, programa: "SNII", anio: 2026 } });
    dobles.tx.cargaResultados.findFirst.mockResolvedValue({ id: 2 });
    expect((await confirmar()).error).toBe("Ya hay otra carga confirmada de SNII 2026; no se puede confirmar una segunda.");
    expect(dobles.tx.cargaResultados.updateMany).not.toHaveBeenCalled();
  });

  it("no confirma con renglones dudosos sin resolver", async () => {
    dobles.cargarConfirmacion.mockResolvedValue({
      programa: "SNII", anio: 2026, contratacion: {}, historialSnii: [], historialProdep: [],
      renglones: [{ id: 9, numero: 14, nombre: "DUDOSO", profesorId: null, criterio: "AMBIGUO", nivel: "NIVEL_1", vigenciaInicio: null, vigenciaFin: null }],
    });
    expect((await confirmar()).error).toBe("Resuelve el renglón dudoso antes de confirmar: asígnale su profesor.");
    expect(dobles.tx.cargaResultados.updateMany).not.toHaveBeenCalled();
  });

  it("confirma, registra lo planeado en M3, recalcula los participantes y no registra lo omitido", async () => {
    await confirmar();
    expect(dobles.tx.cargaResultados.updateMany).toHaveBeenCalledWith({
      where: { id: 3, estado: "EN_REVISION" },
      data: { estado: "CONFIRMADA", balance: { snii: 1, prodep: 0, omitidos: 1 } },
    });
    expect(dobles.tx.reconocimientoSnii.createMany).toHaveBeenCalledWith({
      data: [{
        profesorId: 40, nivel: "CANDIDATO", tipoParticipacion: "NUEVO_INGRESO", resultado: "APROBADO",
        inicio: new Date("2027-01-01T00:00:00.000Z"), fin: new Date("2030-12-31T00:00:00.000Z"), convocatoriaId: 5,
      }],
    });
    expect(dobles.tx.reconocimientoProdep.createMany).not.toHaveBeenCalled();
    expect(dobles.recalcularConvocatoria).toHaveBeenCalledWith(dobles.tx, 5);
    expect(dobles.redirect).toHaveBeenCalledWith(
      `/convocatorias?confirmada=${encodeURIComponent("SNII 2026: 1 reconocimiento registrado, 1 por registrar a mano")}`, "replace",
    );
  });

  it("no registra nada si otra persona confirmó la carga en el mismo instante", async () => {
    dobles.tx.cargaResultados.updateMany.mockResolvedValue({ count: 0 });
    expect((await confirmar()).error).toBe("Esta carga ya no está en revisión.");
    expect(dobles.tx.reconocimientoSnii.createMany).not.toHaveBeenCalled();
    expect(dobles.recalcularConvocatoria).not.toHaveBeenCalled();
  });
});
