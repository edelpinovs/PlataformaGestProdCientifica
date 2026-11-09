import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicacionesPage from "./publicaciones/page";
import ProduccionPage from "./page";
import EscaneoPage from "./escaneo/page";
import { CONSULTA_INICIAL } from "@/modules/produccion/consulta";
import { FormularioEscaneo } from "./formulario-escaneo";

const dobles = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireModulo: vi.fn(), consultarPublicaciones: vi.fn(),
  profesor: { findMany: vi.fn() }, publicacion: { count: vi.fn() },
  autoria: { count: vi.fn() }, job: { findFirst: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("./consultas", () => ({ consultarPublicaciones: dobles.consultarPublicaciones }));
vi.mock("@/components/marco", () => ({ Marco: () => null }));
vi.mock("./formulario-escaneo", () => ({ FormularioEscaneo: () => null }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));

describe("RF-PC: permisos y validación de la página", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("React", React);
    dobles.redirect.mockImplementation((ruta) => { throw new Error(`Redirección: ${ruta}`); });
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR", correo: "admin@demo.invalid" });
    dobles.profesor.findMany.mockResolvedValue([]);
    dobles.publicacion.count.mockResolvedValue(0);
    dobles.autoria.count.mockResolvedValue(0);
    dobles.job.findFirst.mockResolvedValue(null);
    dobles.consultarPublicaciones.mockResolvedValue({ total: 0, publicaciones: [], pagina: 1, totalPaginas: 1, desde: 0, hasta: 0 });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("exige permiso antes de leer profesores o publicaciones", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(PublicacionesPage({ searchParams: Promise.resolve({ texto: "prueba" }) })).rejects.toThrow("Sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledExactlyOnceWith("produccion");
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
    expect(dobles.publicacion.count).not.toHaveBeenCalled();
  });

  it("una URL inválida no ejecuta silenciosamente una consulta sin filtros", async () => {
    await PublicacionesPage({ searchParams: Promise.resolve({ profesor: "no-valido", tamanio: "50000" }) });
    expect(dobles.requireModulo).toHaveBeenCalledWith("produccion");
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
  });

  it("pasa al servicio solo los filtros validados y conserva el límite permitido", async () => {
    await PublicacionesPage({ searchParams: Promise.resolve({ profesor: "7", estado: "PENDIENTE", tamanio: "50" }) });
    expect(dobles.consultarPublicaciones).toHaveBeenCalledExactlyOnceWith({ ...CONSULTA_INICIAL, filtros: { ...CONSULTA_INICIAL.filtros, profesor: "7", estado: "PENDIENTE" } });
    expect(dobles.requireModulo.mock.invocationCallOrder[0]).toBeLessThan(dobles.consultarPublicaciones.mock.invocationCallOrder[0]);
  });

  it.each(["resumen", "escaneo"])("protege la nueva pantalla de %s antes de leer datos", async (pantalla) => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    const peticion = pantalla === "resumen" ? ProduccionPage({ searchParams: Promise.resolve({}) }) : EscaneoPage();
    await expect(peticion).rejects.toThrow("Sin permiso");
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
    expect(dobles.publicacion.count).not.toHaveBeenCalled();
    expect(dobles.job.findFirst).not.toHaveBeenCalled();
  });

  it("el resumen no carga el formulario ni las filas de publicaciones", async () => {
    await ProduccionPage({ searchParams: Promise.resolve({}) });
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
    expect(dobles.publicacion.count).toHaveBeenCalledOnce();
  });

  it("los enlaces antiguos conservan filtros, cantidad y página al abrir la nueva consulta", async () => {
    await expect(ProduccionPage({ searchParams: Promise.resolve({ profesor: "7", tamanio: "50", pagina: "2" }) })).rejects.toThrow("Redirección:");
    const destino = new URL(dobles.redirect.mock.calls[0][0], "https://ejemplo.invalid");
    expect(destino.pathname).toBe("/produccion/publicaciones");
    expect(destino.searchParams.get("profesor")).toBe("7");
    expect(destino.searchParams.get("pagina")).toBe("2");
    expect(dobles.publicacion.count).not.toHaveBeenCalled();
  });

  it("la pantalla de escaneo solo ofrece profesores activos y no carga publicaciones", async () => {
    await EscaneoPage();
    expect(dobles.profesor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { estatusLaboral: "ACTIVO" } }));
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
  });

  it.each(["ADMINISTRADOR", "COORDINADOR"])("solo incluye el formulario ejecutable para Coordinación (%s)", async rol => {
    dobles.requireModulo.mockResolvedValue({ rol, correo: "perfil@demo.invalid" });
    const pagina = await EscaneoPage();
    function contieneFormulario(nodo: React.ReactNode): boolean {
      if (Array.isArray(nodo)) return nodo.some(contieneFormulario);
      if (!React.isValidElement<{ children?: React.ReactNode }>(nodo)) return false;
      return nodo.type === FormularioEscaneo || contieneFormulario(nodo.props.children);
    }
    expect(contieneFormulario(pagina)).toBe(rol === "COORDINADOR");
  });
});
