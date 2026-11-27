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
    expect(dobles.crear).toHaveBeenCalledExactlyOnceWith("escaneo-manual", undefined, undefined, ["ORCID"], false, "");
    expect(dobles.after).toHaveBeenCalledTimes(2);
  });
  it("con «todos» pasa el departamento elegido; con un profesor lo ignora", async () => {
    const todos = new FormData(); todos.set("fuentes", "ORCID"); todos.set("profesorId", "todos"); todos.set("departamento", "3");
    await iniciarEscaneoAction({}, todos);
    expect(dobles.crear).toHaveBeenLastCalledWith("escaneo-manual", undefined, undefined, ["ORCID"], false, "3");
    const uno = new FormData(); uno.set("fuentes", "ORCID"); uno.set("profesorId", "5"); uno.set("departamento", "sin");
    await iniciarEscaneoAction({}, uno);
    expect(dobles.crear).toHaveBeenLastCalledWith("escaneo-manual", 5, undefined, ["ORCID"], false, "");
  });
  it("rechaza un departamento manipulado y explica cuando no hay activos en él, en español", async () => {
    const manipulado = new FormData(); manipulado.set("fuentes", "ORCID"); manipulado.set("departamento", "x");
    expect(await iniciarEscaneoAction({}, manipulado)).toMatchObject({ erroresCampos: { departamento: "Selecciona un departamento válido." } });
    expect(dobles.crear).not.toHaveBeenCalled();
    dobles.crear.mockRejectedValue(new Error("No hay profesores activos en ese departamento."));
    const vacio = new FormData(); vacio.set("fuentes", "ORCID"); vacio.set("departamento", "sin");
    expect(await iniciarEscaneoAction({}, vacio)).toEqual({ error: "No hay profesores activos en ese departamento.", erroresCampos: { departamento: "No hay profesores activos en ese departamento." } });
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
