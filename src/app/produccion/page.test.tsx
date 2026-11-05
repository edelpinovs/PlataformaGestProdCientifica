import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProduccionPage from "./page";
import { CONSULTA_INICIAL } from "@/modules/produccion/consulta";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(), consultarPublicaciones: vi.fn(),
  profesor: { findMany: vi.fn() }, publicacion: { count: vi.fn() },
  autoria: { count: vi.fn() }, job: { findFirst: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("./consultas", () => ({ consultarPublicaciones: dobles.consultarPublicaciones }));
vi.mock("@/components/marco", () => ({ Marco: () => null }));
vi.mock("./formulario-escaneo", () => ({ FormularioEscaneo: () => null }));

describe("RF-PC: permisos y validación de la página", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("React", React);
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
    await expect(ProduccionPage({ searchParams: Promise.resolve({ texto: "prueba" }) })).rejects.toThrow("Sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledExactlyOnceWith("produccion");
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
    expect(dobles.publicacion.count).not.toHaveBeenCalled();
  });

  it("una URL inválida no ejecuta silenciosamente una consulta sin filtros", async () => {
    await ProduccionPage({ searchParams: Promise.resolve({ profesor: "no-valido", tamanio: "50000" }) });
    expect(dobles.requireModulo).toHaveBeenCalledWith("produccion");
    expect(dobles.consultarPublicaciones).not.toHaveBeenCalled();
  });

  it("pasa al servicio solo los filtros validados y conserva el límite permitido", async () => {
    await ProduccionPage({ searchParams: Promise.resolve({ profesor: "7", estado: "PENDIENTE", tamanio: "50" }) });
    expect(dobles.consultarPublicaciones).toHaveBeenCalledExactlyOnceWith({ ...CONSULTA_INICIAL, profesor: "7", estado: "PENDIENTE", tamanio: "50" });
    expect(dobles.requireModulo.mock.invocationCallOrder[0]).toBeLessThan(dobles.consultarPublicaciones.mock.invocationCallOrder[0]);
  });
});
