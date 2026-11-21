import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarGrado } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  gradoCientifico: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries({ nombre: "Doctorado", nomenclatura: "DR", ...extra })) datos.set(clave, valor);
  return datos;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });
}

describe("alta de grado científico en modal (D-214, #184)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.gradoCientifico.findMany.mockResolvedValue([]);
    dobles.gradoCientifico.create.mockResolvedValue({ id: 1 });
  });

  it("exige el permiso del módulo antes de leer o escribir datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarGrado({}, formulario())).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("catalogos");
    expect(dobles.gradoCientifico.findMany).not.toHaveBeenCalled();
    expect(dobles.gradoCientifico.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado, sin redirigir, y actualiza el listado", async () => {
    const resultado = await registrarGrado({}, formulario({ nomenclatura: "dr" }));
    expect(resultado).toEqual({ exito: "Se registró «Doctorado» correctamente." });
    expect(dobles.gradoCientifico.create).toHaveBeenCalledWith({ data: { nombre: "Doctorado", nomenclatura: "DR" } });
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/grados");
  });

  it("un dato inválido devuelve el error en español con su campo y los valores, sin crear", async () => {
    const resultado = await registrarGrado({}, formulario({ nomenclatura: "D1" }));
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBe("La nomenclatura debe tener de 2 a 10 letras, sin espacios ni números.");
    expect(resultado.campo).toBe("nomenclatura");
    expect(resultado.valores).toEqual({ nombre: "Doctorado", nomenclatura: "D1" });
    expect(dobles.gradoCientifico.create).not.toHaveBeenCalled();
  });

  it("un campo ausente se rechaza con un mensaje propio, nunca con el de la librería", async () => {
    const datos = formulario();
    datos.delete("nombre");
    const resultado = await registrarGrado({}, datos);
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("nombre");
    expect(resultado.error).toBeTruthy();
    expect(resultado.error).not.toMatch(/invalid|expected|received/i);
  });

  it("un nombre ya registrado se rechaza con el campo marcado y conserva los valores", async () => {
    dobles.gradoCientifico.findMany.mockResolvedValue([{ nombre: "Doctorado", nomenclatura: "DOC" }]);
    const resultado = await registrarGrado({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("nombre");
    expect(resultado.error).toBe("Ya existe un grado científico con el nombre «Doctorado».");
    expect(resultado.valores).toEqual({ nombre: "Doctorado", nomenclatura: "DR" });
    expect(dobles.gradoCientifico.create).not.toHaveBeenCalled();
  });

  it("si otro administrador lo registró entre la consulta y el alta (P2002), no cierra y lo avisa", async () => {
    dobles.gradoCientifico.create.mockRejectedValue(errorPrisma("P2002"));
    const resultado = await registrarGrado({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBe("Ese grado científico ya existe en el catálogo.");
    expect(resultado.valores).toEqual({ nombre: "Doctorado", nomenclatura: "DR" });
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });

  it("un error inesperado no se disfraza de éxito: se propaga y el modal muestra su mensaje genérico", async () => {
    dobles.gradoCientifico.create.mockRejectedValue(new Error("conexión perdida"));
    await expect(registrarGrado({}, formulario())).rejects.toThrow("conexión perdida");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});
