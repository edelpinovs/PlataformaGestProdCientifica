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

describe("escaneo manual de Administración y Coordinación (#170, #265)", () => {
  it("deniega inicio y continuación a DOCENTE antes de acceder a datos", async () => {
    dobles.permiso.mockImplementation(async roles => { expect(roles).toEqual(["ADMINISTRADOR", "COORDINADOR"]); expect(roles).not.toContain("DOCENTE"); throw new Error("Sin permiso: DOCENTE"); });
    for (const continuar of [false, true]) {
      const datos = new FormData(); if (continuar) datos.set("jobId", "7");
      await expect(iniciarEscaneoAction({}, datos)).rejects.toThrow("Sin permiso");
    }
    expect(dobles.leer).not.toHaveBeenCalled(); expect(dobles.crear).not.toHaveBeenCalled(); expect(dobles.after).not.toHaveBeenCalled();
  });
  it.each(["ADMINISTRADOR", "COORDINADOR"])("%s puede iniciar y continuar el mismo trabajo sin crearlo de nuevo", async rol => {
    dobles.permiso.mockResolvedValue({ rol });
    const inicio = new FormData(); inicio.set("fuentes", "ORCID");
    await iniciarEscaneoAction({}, inicio);
    const datos = new FormData(); datos.set("jobId", "7");
    await iniciarEscaneoAction({}, datos);
    expect(dobles.permiso).toHaveBeenCalledWith(["ADMINISTRADOR", "COORDINADOR"]);
    expect(dobles.crear).toHaveBeenCalledExactlyOnceWith("escaneo-manual", undefined, undefined, ["ORCID"]);
    expect(dobles.after).toHaveBeenCalledTimes(2);
  });
  it("un doble inicio ofrece continuar el trabajo pendiente en lugar de lanzar otro", async () => {
    dobles.crear.mockRejectedValue(new TrabajoEscaneoPendiente(12));
    const inicio = new FormData(); inicio.set("fuentes", "ORCID");
    expect(await iniciarEscaneoAction({}, inicio)).toEqual({ error: "Ya hay una búsqueda pendiente. Continúala antes de iniciar otra.", jobId: 12, continuar: true });
    expect(dobles.after).not.toHaveBeenCalled();
  });
  it("devuelve la fuente activa y el avance real durante el escaneo", async () => {
    dobles.leer.mockResolvedValueOnce({
      id: 7, estado: "EN_PROCESO", avance: 1, total: 2,
      datos: { version: 1, profesoresIds: [1, 2], indice: 1, fuenteEnCurso: "ORCID", resumen: resumenVacio() },
    });
    const datos = new FormData();
    datos.set("jobId", "7");
    expect(await iniciarEscaneoAction({}, datos)).toMatchObject({ pendiente: true, avance: 1, total: 2, fuenteEnCurso: "ORCID" });
  });
});
