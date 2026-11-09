import { beforeEach, describe, expect, it, vi } from "vitest";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: { autoria: { findUnique: dobles.findUnique, update: dobles.update } } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, RedirectType: { replace: "replace" } }));

import { confirmarAutoria, rechazarHomonimo } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });
  dobles.findUnique.mockResolvedValue({ profesorId: 7, publicacionId: 12, estado: "PENDIENTE" });
  dobles.update.mockResolvedValue({});
});

function formulario(profesor = "7", publicacion = "12") {
  const datos = new FormData();
  datos.set("profesorId", profesor);
  datos.set("publicacionId", publicacion);
  datos.set("retorno", "vista=bandeja&q=agua&fuente=ORCID&estado=PENDIENTE&pagina=3");
  return datos;
}

describe("acciones de la bandeja paginada", () => {
  it.each([
    [confirmarAutoria, "VALIDADA", "confirmada"],
    [rechazarHomonimo, "RECHAZADA", "rechazada"],
  ] as const)("conserva la consulta al revisar una autoría", async (accion, estado, aviso) => {
    await expect(accion(formulario())).rejects.toThrow(`/validacion?q=agua&vista=bandeja&fuente=ORCID&estado=PENDIENTE&pagina=3&accion=${aviso}`);
    expect(dobles.requireModulo).toHaveBeenCalledWith("validacion");
    expect(dobles.update).toHaveBeenCalledWith({ where: { publicacionId_profesorId: { publicacionId: 12, profesorId: 7 } }, data: { estado, revisadaEn: expect.any(Date) } });
  });

  it.each(["Infinity", "NaN", "0", "-1", "1.5", "9007199254740992"])("rechaza un identificador manipulado (%s) antes de consultar", async valor => {
    for (const accion of [confirmarAutoria, rechazarHomonimo]) {
      await expect(accion(formulario("7", valor))).rejects.toThrow("error=datos-invalidos");
    }
    expect(dobles.findUnique).not.toHaveBeenCalled();
    expect(dobles.update).not.toHaveBeenCalled();
  });

  it("no permite confirmar autorías de otro profesor aunque el retorno sea válido", async () => {
    await expect(confirmarAutoria(formulario("8"))).rejects.toThrow("error=sin-permiso");
    expect(dobles.findUnique).not.toHaveBeenCalled();
    expect(dobles.update).not.toHaveBeenCalled();
  });
});
