import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarDivision } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  division: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries({ nombre: "División de Ingenierías", clave: "DI", ...extra })) datos.set(clave, valor);
  return datos;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });
}

describe("alta de división académica en modal (D-214, #184)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.division.findMany.mockResolvedValue([]);
    dobles.division.create.mockResolvedValue({ id: 1 });
  });

  it("exige el permiso del módulo antes de leer o escribir datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarDivision({}, formulario())).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("catalogos");
    expect(dobles.division.findMany).not.toHaveBeenCalled();
    expect(dobles.division.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado, sin redirigir, y actualiza el listado", async () => {
    const resultado = await registrarDivision({}, formulario());
    expect(resultado).toEqual({ exito: "Se registró «División de Ingenierías» correctamente." });
    expect(dobles.division.create).toHaveBeenCalledOnce();
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/divisiones");
  });

  it("un dato ausente devuelve un mensaje propio con su campo y los valores, sin crear", async () => {
    const resultado = await registrarDivision({}, formulario({ clave: "" }));
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBe("La clave institucional es obligatoria.");
    expect(resultado.campo).toBe("clave");
    expect(resultado.valores).toEqual({ nombre: "División de Ingenierías", clave: "" });
    expect(dobles.division.create).not.toHaveBeenCalled();
  });

  it("una clave ya registrada se rechaza con el campo marcado y conserva los valores", async () => {
    dobles.division.findMany.mockResolvedValue([{ nombre: "Otra división", clave: "DI" }]);
    const resultado = await registrarDivision({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("clave");
    expect(resultado.error).toMatch(/Ya existe una división con la clave/);
    expect(resultado.valores).toEqual({ nombre: "División de Ingenierías", clave: "DI" });
    expect(dobles.division.create).not.toHaveBeenCalled();
  });

  it("si otro administrador la registró entre la consulta y el alta (P2002), no cierra y lo avisa", async () => {
    dobles.division.create.mockRejectedValue(errorPrisma("P2002"));
    const resultado = await registrarDivision({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("clave");
    expect(resultado.error).toBe("Esa clave institucional ya existe en el catálogo.");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });

  it("un error inesperado no se disfraza de éxito: se propaga y el modal muestra su mensaje genérico", async () => {
    dobles.division.create.mockRejectedValue(new Error("conexión perdida"));
    await expect(registrarDivision({}, formulario())).rejects.toThrow("conexión perdida");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});
