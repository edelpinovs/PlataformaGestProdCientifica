import { beforeEach, describe, expect, it, vi } from "vitest";

// RF-017: registrar la carga lanza su lectura en segundo plano; «Volver a leer» la repite.
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
    cargaResultados: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    convocatoria: { upsert: vi.fn() },
    job: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
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

const { registrarCarga, volverALeer } = await import("./actions");

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
    expect(dobles.prisma.job.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { estado: "PENDIENTE", error: null, avance: 0 },
    });
    expect(dobles.prisma.cargaResultados.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { estado: "PROCESANDO" } });
    await correrAfter();
    expect(dobles.procesarCarga).toHaveBeenCalledWith(7, dobles.supabase);
    expect(dobles.redirect).toHaveBeenCalledWith("/convocatorias", "replace");
  });
});
