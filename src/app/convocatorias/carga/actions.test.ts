import { beforeEach, describe, expect, it, vi } from "vitest";

// RF-017: registrar la carga lanza su lectura en segundo plano; «Volver a leer» la repite.
// #380: eliminar una carga deja su constancia en la bitácora de auditoría.
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  after: vi.fn(),
  redirect: vi.fn(),
  procesarCarga: vi.fn(),
  supabase: {
    storage: {
      from: () => ({
        info: async () => ({ data: { size: 1000 }, error: null }),
        remove: vi.fn(),
      }),
    },
  },
  prisma: {
    cargaResultados: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    convocatoria: { upsert: vi.fn() },
    job: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    auditoria: { create: vi.fn() },
    renglonResultado: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => dobles.supabase }));
vi.mock("next/server", () => ({ after: dobles.after }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: dobles.redirect,
  RedirectType: { replace: "replace" },
}));
vi.mock("./procesamiento", () => ({ procesarCarga: dobles.procesarCarga, TIEMPO_ATASCO_MS: 10 * 60 * 1000 }));

const { eliminarCarga, registrarCarga, volverALeer } = await import("./actions");

const formulario = (id: string) => {
  const datos = new FormData();
  datos.set("id", id);
  return datos;
};

// Ejecuta lo que se haya pasado a after(), como haría Next al terminar la respuesta.
async function correrAfter() {
  for (const [tarea] of dobles.after.mock.calls) await tarea();
}

describe("registrarCarga lanza la lectura (RF-017)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
    dobles.prisma.cargaResultados.findFirst.mockResolvedValue(null);
    dobles.prisma.convocatoria.upsert.mockResolvedValue({ id: 5 });
    dobles.prisma.cargaResultados.create.mockResolvedValue({ id: 3 });
    dobles.prisma.job.create.mockResolvedValue({ id: 7 });
    dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.prisma));
  });

  it("lee el archivo en segundo plano con la sesión de la persona", async () => {
    const resultado = await registrarCarga({ programa: "SNII", anio: 2025, ruta: "snii/2025/20261109T100000-resultados.pdf" });
    expect(resultado.registrada).toBe("SNII 2025 · resultados.pdf");
    expect(dobles.after).toHaveBeenCalledTimes(1);
    await correrAfter();
    expect(dobles.procesarCarga).toHaveBeenCalledWith(7, dobles.supabase);
  });
});

describe("volverALeer (RF-017)", () => {
  const hace = (minutos: number) => new Date(Date.now() - minutos * 60 * 1000);

  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({ id: 3, estado: "FALLIDA" });
    dobles.prisma.job.findFirst.mockResolvedValue({ id: 7, actualizadoEn: hace(1) });
    dobles.prisma.cargaResultados.updateMany.mockResolvedValue({ count: 1 });
    dobles.prisma.job.updateMany.mockResolvedValue({ count: 1 });
    dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.prisma));
  });

  it("revisa el permiso antes que nada", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(volverALeer({}, formulario("3"))).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.requireModulo).toHaveBeenCalledWith("convocatorias");
    expect(dobles.prisma.cargaResultados.findUnique).not.toHaveBeenCalled();
  });

  it("explica que la carga ya no existe si el id no es válido", async () => {
    expect(await volverALeer({}, formulario("abc"))).toEqual({ error: "Esa carga ya no existe. Recarga la página." });
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue(null);
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "Esa carga ya no existe. Recarga la página." });
  });

  it("no vuelve a leer una carga leída, confirmada o que se está leyendo", async () => {
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({ id: 3, estado: "EN_REVISION" });
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "Esta carga ya se leyó." });
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({ id: 3, estado: "CONFIRMADA" });
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "Esta carga ya se confirmó." });
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({ id: 3, estado: "PROCESANDO" });
    dobles.prisma.job.findFirst.mockResolvedValue({ id: 7, actualizadoEn: hace(2) });
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "La carga se está leyendo. Espera unos minutos." });
    expect(dobles.after).not.toHaveBeenCalled();
  });

  it("reinicia la tarea de una carga fallida y la vuelve a leer", async () => {
    await volverALeer({}, formulario("3"));
    expect(dobles.prisma.cargaResultados.updateMany).toHaveBeenCalledWith({
      where: { id: 3, estado: { in: ["FALLIDA", "PROCESANDO"] } },
      data: { estado: "PROCESANDO" },
    });
    const [{ where, data }] = dobles.prisma.job.updateMany.mock.calls[0];
    expect(where.id).toBe(7);
    expect(where.OR[0]).toEqual({ estado: { not: "EN_PROCESO" } });
    expect(data).toEqual({ estado: "PENDIENTE", error: null, avance: 0 });
    await correrAfter();
    expect(dobles.procesarCarga).toHaveBeenCalledWith(7, dobles.supabase);
    expect(dobles.redirect).toHaveBeenCalledWith("/convocatorias", "replace");
  });

  it("no regresa el estado si la carga cambió mientras se pedía volver a leer", async () => {
    dobles.prisma.cargaResultados.updateMany.mockResolvedValue({ count: 0 });
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "Esa carga ya cambió. Recarga la página." });
    expect(dobles.after).not.toHaveBeenCalled();
  });

  it("no reinicia una lectura que otra pestaña acaba de empezar", async () => {
    dobles.prisma.job.updateMany.mockResolvedValue({ count: 0 });
    expect(await volverALeer({}, formulario("3"))).toEqual({ error: "La carga se está leyendo. Espera unos minutos." });
    expect(dobles.after).not.toHaveBeenCalled();
  });
});

describe("eliminarCarga deja constancia en la bitácora (#380)", () => {
  const actor = { id: "00000000-0000-0000-0000-000000000001", correo: "coordinacion@demo.invalid" };
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue(actor);
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({
      estado: "EN_REVISION", archivoRuta: "snii/2026/20261018T160509-resultados-snii-2026.pdf", convocatoria: { programa: "SNII", anio: 2026 },
    });
    dobles.prisma.job.count.mockResolvedValue(0);
    dobles.prisma.cargaResultados.deleteMany.mockResolvedValue({ count: 1 });
    dobles.prisma.renglonResultado.count.mockResolvedValue(12);
    dobles.prisma.$transaction.mockImplementation(async (fn) => fn(dobles.prisma));
  });

  it("guarda el borrado y su registro en la misma transacción, sin datos personales", async () => {
    await eliminarCarga({}, formulario("9"));
    expect(dobles.prisma.auditoria.create).toHaveBeenCalledWith({
      data: {
        actorId: actor.id, actorCorreo: actor.correo, modulo: "convocatorias", accion: "registro.eliminado",
        entidad: "CargaResultados", entidadId: "9", resumen: "Eliminó la carga 9 de SNII 2026 con 12 renglones.",
      },
    });
    expect(dobles.redirect).toHaveBeenCalled();
  });

  it("no escribe en la bitácora si la carga ya se confirmó o no se borró", async () => {
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({
      estado: "CONFIRMADA", archivoRuta: "snii/2026/x-resultados.pdf", convocatoria: { programa: "SNII", anio: 2026 },
    });
    await eliminarCarga({}, formulario("9"));
    dobles.prisma.cargaResultados.findUnique.mockResolvedValue({
      estado: "EN_REVISION", archivoRuta: "snii/2026/x-resultados.pdf", convocatoria: { programa: "SNII", anio: 2026 },
    });
    dobles.prisma.cargaResultados.deleteMany.mockResolvedValue({ count: 0 });
    await eliminarCarga({}, formulario("9"));
    expect(dobles.prisma.auditoria.create).not.toHaveBeenCalled();
  });

  it("si falla el registro de la bitácora, explica en español y no sigue (revisión del #393)", async () => {
    dobles.prisma.$transaction.mockRejectedValue(new Error("conexión perdida"));
    expect(await eliminarCarga({}, formulario("9"))).toEqual({ error: "No se pudo guardar el cambio. Inténtalo de nuevo; no se modificó nada." });
    expect(dobles.redirect).not.toHaveBeenCalled();
  });

  it("el resumen dice «1 renglón» en singular", async () => {
    dobles.prisma.renglonResultado.count.mockResolvedValue(1);
    await eliminarCarga({}, formulario("9"));
    expect(dobles.prisma.auditoria.create.mock.calls[0][0].data.resumen).toBe("Eliminó la carga 9 de SNII 2026 con 1 renglón.");
  });
});
