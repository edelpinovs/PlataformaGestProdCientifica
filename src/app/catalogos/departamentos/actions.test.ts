import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarDepartamento } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  division: { findMany: vi.fn() },
  departamento: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base = { nombre: "Departamento de Ciencias Exactas", nomenclatura: "DCE", divisionId: "3", ...extra };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });
}

describe("alta de departamento en modal (D-214, #184)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.division.findMany.mockResolvedValue([{ id: 3, nombre: "División de Ingenierías" }]);
    dobles.departamento.findMany.mockResolvedValue([]);
    dobles.departamento.create.mockResolvedValue({ id: 1 });
  });

  it("exige el permiso del módulo antes de leer o escribir datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarDepartamento({}, formulario())).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("catalogos");
    expect(dobles.division.findMany).not.toHaveBeenCalled();
    expect(dobles.departamento.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado, sin redirigir, y actualiza ambos listados", async () => {
    const resultado = await registrarDepartamento({}, formulario());
    expect(resultado).toEqual({ exito: "Se registró «Departamento de Ciencias Exactas» correctamente." });
    expect(dobles.departamento.create).toHaveBeenCalledOnce();
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/departamentos");
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/divisiones");
  });

  it("sin elegir división devuelve el mensaje propio con su campo y los valores, sin crear", async () => {
    const resultado = await registrarDepartamento({}, formulario({ divisionId: "" }));
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBe("Elige la división a la que pertenece.");
    expect(resultado.campo).toBe("divisionId");
    expect(resultado.valores).toMatchObject({ divisionId: "", nomenclatura: "DCE" });
    expect(dobles.departamento.create).not.toHaveBeenCalled();
  });

  it("una división manipulada o ya inexistente se rechaza, sin crear", async () => {
    const resultado = await registrarDepartamento({}, formulario({ divisionId: "99" }));
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("divisionId");
    expect(resultado.error).toBe("La división elegida no existe. Recarga la página y elige otra.");
    expect(dobles.departamento.create).not.toHaveBeenCalled();
  });

  it("una nomenclatura ya registrada se rechaza con el campo marcado", async () => {
    dobles.departamento.findMany.mockResolvedValue([{ nombre: "Otro", nomenclatura: "DCE", divisionId: 5 }]);
    const resultado = await registrarDepartamento({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("nomenclatura");
    expect(resultado.error).toMatch(/Ya existe un departamento con la nomenclatura/);
    expect(dobles.departamento.create).not.toHaveBeenCalled();
  });

  it("si la nomenclatura se tomó entre la consulta y el alta (P2002), no cierra y lo avisa", async () => {
    dobles.departamento.create.mockRejectedValue(errorPrisma("P2002"));
    const resultado = await registrarDepartamento({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("nomenclatura");
    expect(resultado.error).toBe("Esa nomenclatura ya existe en el catálogo.");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });

  it("si la división se borró entre la consulta y el alta (P2003), no cierra y lo avisa", async () => {
    dobles.departamento.create.mockRejectedValue(errorPrisma("P2003"));
    const resultado = await registrarDepartamento({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("divisionId");
    expect(resultado.error).toBe("La división elegida ya no existe. Recarga la página.");
  });

  it("un error inesperado no se disfraza de éxito: se propaga y el modal muestra su mensaje genérico", async () => {
    dobles.departamento.create.mockRejectedValue(new Error("conexión perdida"));
    await expect(registrarDepartamento({}, formulario())).rejects.toThrow("conexión perdida");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});
