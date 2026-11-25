import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarEscaneoAction, reintentarEscaneoAction } from "./actions";
import { resumenVacio } from "@/modules/produccion/lotes";
import { TrabajoEscaneoPendiente } from "@/modules/produccion/fechas-escaneo";

const dobles = vi.hoisted(() => ({ permiso: vi.fn(), leer: vi.fn(), crear: vi.fn(), cancelar: vi.fn(), procesar: vi.fn(), after: vi.fn(), redirigir: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRol: dobles.permiso }));
vi.mock("@/lib/prisma", () => ({ prisma: { job: { findFirst: dobles.leer } } }));
vi.mock("./trabajos", () => ({
  crearTrabajoEscaneo: dobles.crear, cancelarTrabajoEscaneo: dobles.cancelar, procesarSiguienteProfesor: dobles.procesar,
  TIPOS_ESCANEO: ["escaneo-manual", "escaneo-diario"], MENSAJE_REINTENTO_SIN_ACTIVOS: "Ninguno de los profesores sigue activo para reintentar.",
}));
vi.mock("next/server", () => ({ after: dobles.after }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirigir }));

const formulario = (jobId?: string) => { const datos = new FormData(); if (jobId !== undefined) datos.set("jobId", jobId); return datos; };
const fallido = {
  id: 9, estado: "FALLIDO", datos: {
    version: 1, profesoresIds: [3, 5], indice: 2, fuentes: ["ORCID", "OPENALEX"], desde: "2025-01-01", hasta: "2025-06-30", enriquecerAutores: false,
    resumen: { ...resumenVacio(), errores: ["OpenAlex (Prof. 5): HTTP_429"], consultasFuentes: [{ profesorId: 5, fuente: "OPENALEX", estado: "INCIDENCIA", cantidad: 0 }] },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  dobles.permiso.mockResolvedValue({ rol: "ADMINISTRADOR" });
  dobles.leer.mockResolvedValue(fallido);
  dobles.crear.mockResolvedValue({ id: 10, estado: "PENDIENTE" });
});

describe("issue 279: cancelar y reintentar búsquedas", () => {
  it("exige Administración o Coordinación antes de leer o cambiar datos", async () => {
    dobles.permiso.mockImplementation(async (roles) => { expect(roles).toEqual(["ADMINISTRADOR", "COORDINADOR"]); throw new Error("Sin permiso"); });
    await expect(cancelarEscaneoAction({}, formulario("9"))).rejects.toThrow("Sin permiso");
    await expect(reintentarEscaneoAction({}, formulario("9"))).rejects.toThrow("Sin permiso");
    expect(dobles.cancelar).not.toHaveBeenCalled();
    expect(dobles.leer).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "abc", "0", "-3", "1.5", "2147483648"])("rechaza en español el identificador manipulado %s", async (jobId) => {
    expect(await cancelarEscaneoAction({}, formulario(jobId))).toEqual({ error: expect.stringMatching(/^Selecciona una (sola )?búsqueda( válida)?\.$/) });
    expect(await reintentarEscaneoAction({}, formulario(jobId))).toEqual({ error: expect.stringMatching(/^Selecciona una (sola )?búsqueda( válida)?\.$/) });
    expect(dobles.cancelar).not.toHaveBeenCalled();
    expect(dobles.crear).not.toHaveBeenCalled();
  });

  it("cancela una búsqueda en curso y explica si ya había terminado", async () => {
    dobles.cancelar.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await cancelarEscaneoAction({}, formulario("9"))).toEqual({ mensaje: "Búsqueda cancelada. Se conserva lo guardado hasta ese momento." });
    expect(dobles.cancelar).toHaveBeenCalledWith(9);
    expect(await cancelarEscaneoAction({}, formulario("9"))).toEqual({ error: "La búsqueda ya había terminado; no hay nada que cancelar." });
  });

  it("no muestra errores técnicos al fallar la cancelación", async () => {
    dobles.cancelar.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    expect(await cancelarEscaneoAction({}, formulario("9"))).toEqual({ error: "No se pudo cancelar la búsqueda. Inténtalo de nuevo." });
  });

  it("reintenta solo lo que falló, con el mismo periodo y opciones, y lleva a Escanear", async () => {
    await reintentarEscaneoAction({}, formulario("9"));
    expect(dobles.crear).toHaveBeenCalledWith("escaneo-manual", [5], { desde: "2025-01-01", hasta: "2025-06-30" }, ["OPENALEX"], false);
    expect(dobles.after).toHaveBeenCalledOnce();
    expect(dobles.redirigir).toHaveBeenCalledWith("/produccion/escaneo");
  });

  it("no reintenta búsquedas en curso o completadas", async () => {
    for (const estado of ["PENDIENTE", "EN_PROCESO", "COMPLETADO"]) {
      dobles.leer.mockResolvedValueOnce({ ...fallido, estado });
      expect(await reintentarEscaneoAction({}, formulario("9"))).toEqual({ error: "Solo se reintentan búsquedas con incidencias o canceladas." });
    }
    expect(dobles.crear).not.toHaveBeenCalled();
  });

  it("explica cuando ya hay otra búsqueda en curso o ningún profesor sigue activo", async () => {
    dobles.crear.mockRejectedValueOnce(new TrabajoEscaneoPendiente(4));
    expect(await reintentarEscaneoAction({}, formulario("9"))).toEqual({ error: "Ya hay una búsqueda en curso. Continúala o cancélala antes de reintentar." });
    dobles.crear.mockRejectedValueOnce(new Error("Ninguno de los profesores sigue activo para reintentar."));
    expect(await reintentarEscaneoAction({}, formulario("9"))).toEqual({ error: "Ninguno de los profesores sigue activo para reintentar." });
    dobles.crear.mockRejectedValueOnce(new Error("secreto de la base"));
    expect(await reintentarEscaneoAction({}, formulario("9"))).toEqual({ error: "No se pudo crear el reintento. Inténtalo de nuevo más tarde." });
    expect(dobles.redirigir).not.toHaveBeenCalled();
  });

  it("no crea un reintento inútil si solo faltaba la clave", async () => {
    dobles.leer.mockResolvedValue({ ...fallido, datos: { ...fallido.datos, indice: 2, resumen: { ...resumenVacio(),
      errores: ["Scopus (Prof. 3): NO_API_KEY"], consultasFuentes: [{ profesorId: 3, fuente: "SCOPUS", estado: "INCIDENCIA", cantidad: 0 }] } } });
    expect(await reintentarEscaneoAction({}, formulario("9"))).toEqual({ error: "Las consultas fallaron porque falta la clave de acceso de una fuente. Configúrala antes de reintentar." });
    expect(dobles.crear).not.toHaveBeenCalled();
  });
});
