import { beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarEscaneoAction } from "./actions";
import { resumenVacio } from "@/modules/produccion/lotes";
import { TrabajoEscaneoPendiente } from "@/modules/produccion/fechas-escaneo";

const dobles = vi.hoisted(() => ({ permiso: vi.fn(), crear: vi.fn(), leer: vi.fn(), procesar: vi.fn(), after: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.permiso }));
vi.mock("@/lib/prisma", () => ({ prisma: { job: { findFirst: dobles.leer } } }));
vi.mock("./trabajos", () => ({ crearTrabajoEscaneo: dobles.crear, procesarSiguienteProfesor: dobles.procesar, TIPOS_ESCANEO: ["escaneo-manual", "escaneo-diario"] }));
vi.mock("next/server", () => ({ after: dobles.after }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  dobles.permiso.mockResolvedValue({ rol: "COORDINADOR" });
  const trabajo = { id: 7, estado: "PENDIENTE", avance: 0, total: 2, datos: { version: 1, profesoresIds: [1,2], indice: 0, resumen: resumenVacio() } };
  dobles.crear.mockResolvedValue(trabajo);
  dobles.leer.mockResolvedValue(trabajo);
});

describe("escaneo manual exclusivo de Coordinación (#170)", () => {
  it.each(["ADMINISTRADOR", "DOCENTE"])("deniega inicio y continuación a %s antes de acceder a datos", async rol => {
    dobles.permiso.mockImplementation(async roles => { expect(roles).toEqual(["COORDINADOR"]); throw new Error(`Sin permiso: ${rol}`); });
    for (const continuar of [false, true]) {
      const datos = new FormData(); if (continuar) datos.set("jobId", "7");
      await expect(iniciarEscaneoAction({}, datos)).rejects.toThrow("Sin permiso");
    }
    expect(dobles.leer).not.toHaveBeenCalled(); expect(dobles.crear).not.toHaveBeenCalled(); expect(dobles.after).not.toHaveBeenCalled();
  });
  it("Coordinación puede iniciar y continuar el mismo trabajo sin crearlo de nuevo", async () => {
    await iniciarEscaneoAction({}, new FormData());
    const datos = new FormData(); datos.set("jobId", "7");
    await iniciarEscaneoAction({}, datos);
    expect(dobles.permiso).toHaveBeenCalledWith(["COORDINADOR"]);
    expect(dobles.crear).toHaveBeenCalledExactlyOnceWith("escaneo-manual", undefined, undefined);
    expect(dobles.after).toHaveBeenCalledTimes(2);
  });
  it("un doble inicio ofrece continuar el trabajo pendiente en lugar de lanzar otro", async () => {
    dobles.crear.mockRejectedValue(new TrabajoEscaneoPendiente(12));
    expect(await iniciarEscaneoAction({}, new FormData())).toEqual({ error: "Ya hay una búsqueda pendiente. Continúala antes de iniciar otra.", jobId: 12, continuar: true });
    expect(dobles.after).not.toHaveBeenCalled();
  });
});
