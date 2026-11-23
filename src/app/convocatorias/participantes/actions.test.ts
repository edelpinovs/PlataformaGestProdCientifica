import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

// RF-018: alta y baja de participantes. Base y sesión son dobles; datos inventados.
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  redirect: vi.fn(),
  recalcular: vi.fn(),
  enListado: vi.fn(),
  llamadas: [] as string[],
  prisma: {
    profesor: { findFirst: vi.fn() },
    convocatoria: { findUnique: vi.fn(), upsert: vi.fn() },
    participacionConvocatoria: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));
vi.mock("@/modules/convocatorias/recalcular", () => ({
  recalcularConvocatoria: dobles.recalcular,
  profesoresEnListado: dobles.enListado,
}));

const { eliminarParticipante, registrarParticipante } = await import("./actions");

const ANIO = new Date().getFullYear();
const formulario = (campos: Record<string, string>) => {
  const datos = new FormData();
  for (const [k, v] of Object.entries(campos)) datos.set(k, v);
  return datos;
};
const alta = (campos: Record<string, string> = {}) =>
  registrarParticipante({}, formulario({ programa: "SNII", anio: String(ANIO), profesorId: "40", ...campos }));

beforeEach(() => {
  vi.resetAllMocks();
  dobles.llamadas.length = 0;
  dobles.requireModulo.mockImplementation(async () => { dobles.llamadas.push("permiso"); return { id: "u" }; });
  dobles.prisma.profesor.findFirst.mockImplementation(async () => {
    dobles.llamadas.push("profesor");
    return { id: 40, nombres: "Ana", apellidos: "Prueba Uno", codigo: "2009001" };
  });
  dobles.prisma.convocatoria.findUnique.mockResolvedValue(null);
  dobles.prisma.convocatoria.upsert.mockResolvedValue({ id: 5 });
  dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.prisma));
});

describe("registrarParticipante (RF-018)", () => {
  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(alta()).rejects.toThrow("sin permiso");
    expect(dobles.prisma.profesor.findFirst).not.toHaveBeenCalled();
  });

  it("solo acepta profesores activos", async () => {
    dobles.prisma.profesor.findFirst.mockResolvedValue(null);
    const r = await alta();
    expect(r.error).toBe("El profesor ya no está disponible para esta operación. Selecciona otro.");
    expect(dobles.prisma.profesor.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 40, estatusLaboral: "ACTIVO" } }));
  });

  it("explica en español un año o un profesor inválidos", async () => {
    expect((await alta({ anio: "1999" })).error).toBe("El año debe ser 2000 o posterior.");
    expect((await alta({ profesorId: "" })).error).toBe("Selecciona un profesor válido de la lista.");
  });

  it("no registra dos veces al mismo profesor", async () => {
    dobles.prisma.convocatoria.findUnique.mockResolvedValue({ id: 5, cargas: [] });
    dobles.prisma.participacionConvocatoria.findUnique.mockResolvedValue({ id: 1 });
    expect((await alta()).error).toBe(`Ese profesor ya está registrado en SNII ${ANIO}.`);
    expect(dobles.prisma.participacionConvocatoria.create).not.toHaveBeenCalled();
  });

  it("traduce el choque de la base (P2002) al mismo mensaje", async () => {
    dobles.prisma.participacionConvocatoria.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7" }),
    );
    expect((await alta()).error).toBe(`Ese profesor ya está registrado en SNII ${ANIO}.`);
  });

  it("no cambia los participantes de una convocatoria confirmada", async () => {
    dobles.prisma.convocatoria.findUnique.mockResolvedValue({ id: 5, cargas: [{ id: 9 }] });
    expect((await alta()).error).toBe(`La convocatoria SNII ${ANIO} ya se confirmó; no se pueden cambiar sus participantes.`);
  });

  it("crea la convocatoria si hace falta, registra al participante como manual y recalcula", async () => {
    const r = await alta();
    expect(r).toEqual({ exito: `Se registró a Prueba Uno, Ana en SNII ${ANIO}.` });
    expect(dobles.prisma.convocatoria.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { programa: "SNII", anio: ANIO } }));
    expect(dobles.prisma.participacionConvocatoria.create).toHaveBeenCalledWith({ data: { convocatoriaId: 5, profesorId: 40, origen: "MANUAL" } });
    expect(dobles.recalcular).toHaveBeenCalledWith(dobles.prisma, 5);
    expect(dobles.llamadas[0]).toBe("permiso");
  });
});

describe("eliminarParticipante (RF-018)", () => {
  const participacion = {
    profesorId: 40,
    profesor: { nombres: "Ana", apellidos: "Prueba Uno" },
    convocatoria: { id: 5, programa: "SNII", anio: 2026, cargas: [] as { id: number }[] },
  };

  beforeEach(() => {
    dobles.prisma.participacionConvocatoria.findUnique.mockResolvedValue(participacion);
    dobles.enListado.mockResolvedValue(new Set([99]));
    dobles.prisma.participacionConvocatoria.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(eliminarParticipante({}, formulario({ id: "1" }))).rejects.toThrow("sin permiso");
    expect(dobles.prisma.participacionConvocatoria.findUnique).not.toHaveBeenCalled();
  });

  it("no quita a quien aparece en el listado oficial", async () => {
    dobles.enListado.mockResolvedValue(new Set([40]));
    const r = await eliminarParticipante({}, formulario({ id: "1" }));
    expect(r.error).toBe("Aparece en el listado oficial de SNII 2026; para quitarlo, elimina o vuelve a leer la carga.");
    expect(dobles.prisma.participacionConvocatoria.deleteMany).not.toHaveBeenCalled();
  });

  it("explica que ya no existe si el id es inválido o se borró antes", async () => {
    expect((await eliminarParticipante({}, formulario({ id: "abc" }))).error).toBe("Ese participante ya no está registrado. Recarga la página.");
    dobles.prisma.participacionConvocatoria.deleteMany.mockResolvedValue({ count: 0 });
    expect((await eliminarParticipante({}, formulario({ id: "1" }))).error).toBe("Ese participante ya no está registrado. Recarga la página.");
  });

  it("borra, recalcula y vuelve al listado con el resultado", async () => {
    await eliminarParticipante({}, formulario({ id: "1" }));
    expect(dobles.prisma.participacionConvocatoria.deleteMany).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(dobles.recalcular).toHaveBeenCalledWith(dobles.prisma, 5);
    expect(dobles.redirect).toHaveBeenCalledWith(
      `/convocatorias/participantes?eliminado=${encodeURIComponent("Prueba Uno, Ana (SNII 2026)")}`, "replace",
    );
  });
});
