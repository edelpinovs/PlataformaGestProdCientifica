import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editarArea, eliminarArea, registrarArea } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  $transaction: vi.fn(),
  auditoria: { create: vi.fn() },
  area: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  subarea: { count: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const formulario = (campos: Record<string, string> = {}) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries({ nombre: "Ciencias de la Salud", ...campos })) datos.set(clave, valor);
  return datos;
};
const errorPrisma = (code: string) => new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });

describe("áreas (issue 264)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ id: "u1", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" });
    dobles.area.findMany.mockResolvedValue([]);
    dobles.area.create.mockResolvedValue({ id: 1 });
    dobles.$transaction.mockImplementation(async (cb: (tx: typeof dobles) => unknown) => cb(dobles));
    dobles.auditoria.create.mockReturnValue(Promise.resolve({}));
  });

  it("las tres acciones exigen el permiso del módulo antes de leer o escribir", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarArea({}, formulario())).rejects.toThrow("sin permiso");
    await expect(editarArea({}, formulario({ id: "1" }))).rejects.toThrow("sin permiso");
    await expect(eliminarArea({}, formulario({ id: "1" }))).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("catalogos");
    expect(dobles.area.findMany).not.toHaveBeenCalled();
    expect(dobles.area.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado, sin redirigir", async () => {
    const r = await registrarArea({}, formulario());
    expect(r).toEqual({ exito: "Se registró «Ciencias de la Salud» correctamente." });
    expect(dobles.area.create).toHaveBeenCalledWith({ data: { nombre: "Ciencias de la Salud" } });
    expect(dobles.redirect).not.toHaveBeenCalled();
  });

  it("un nombre vacío o con números devuelve el mensaje propio y conserva los valores", async () => {
    const vacio = await registrarArea({}, formulario({ nombre: "" }));
    expect(vacio).toMatchObject({ error: "El nombre es obligatorio.", campo: "nombre", valores: { nombre: "" } });
    const numeros = await registrarArea({}, formulario({ nombre: "Área 51" }));
    expect(numeros.error).toBe("El nombre solo admite letras, espacios, puntos, comas y guiones.");
    expect(dobles.area.create).not.toHaveBeenCalled();
  });

  it("un campo ausente en un envío manipulado también responde en español", async () => {
    const r = await registrarArea({}, new FormData());
    expect(r.error).toBe("El nombre es obligatorio.");
  });

  it("un nombre repetido se rechaza sin crear; si la base lo detecta (P2002) también", async () => {
    dobles.area.findMany.mockResolvedValue([{ nombre: "Ciencias de la Salud" }]);
    const repetido = await registrarArea({}, formulario({ nombre: "ciencias de la salud" }));
    expect(repetido).toMatchObject({ error: "Ya existe un área llamada «Ciencias de la Salud».", campo: "nombre" });
    expect(dobles.area.create).not.toHaveBeenCalled();

    dobles.area.findMany.mockResolvedValue([]);
    dobles.area.create.mockRejectedValue(errorPrisma("P2002"));
    expect((await registrarArea({}, formulario())).error).toBe("Esa área ya existe en el catálogo.");
  });

  it("editar: el área no choca consigo misma y redirige con el resultado", async () => {
    dobles.area.findMany.mockResolvedValue([{ id: 1, nombre: "Ciencias de la Salud" }]);
    await editarArea({}, formulario({ id: "1" }));
    expect(dobles.area.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { nombre: "Ciencias de la Salud" } });
    expect(dobles.redirect).toHaveBeenCalledWith("/catalogos/areas?editada=Ciencias%20de%20la%20Salud", "replace");
  });

  it("editar: un identificador inválido o inexistente avisa sin escribir", async () => {
    expect((await editarArea({}, formulario({ id: "abc" }))).error).toBe("Esa área ya no existe en el catálogo. Recarga la página.");
    dobles.area.findMany.mockResolvedValue([{ id: 2, nombre: "Otra" }]);
    expect((await editarArea({}, formulario({ id: "1" }))).error).toBe("Esa área ya no existe en el catálogo. Recarga la página.");
    expect(dobles.area.update).not.toHaveBeenCalled();
  });

  it("eliminar: un área con subáreas no se elimina y el mensaje explica por qué", async () => {
    dobles.area.findUnique.mockResolvedValue({ nombre: "Biología", _count: { subareas: 2 } });
    const r = await eliminarArea({}, formulario({ id: "3" }));
    expect(r.error).toBe("No se puede eliminar «Biología»: tiene 2 subáreas. Elimínalas o cámbialas de área antes.");
    expect(dobles.area.deleteMany).not.toHaveBeenCalled();
  });

  it("eliminar: si otra persona agregó una subárea justo antes, la condición del DELETE lo impide y se explica", async () => {
    dobles.area.findUnique.mockResolvedValue({ nombre: "Biología", _count: { subareas: 0 } });
    dobles.area.deleteMany.mockResolvedValue({ count: 0 });
    dobles.subarea.count.mockResolvedValue(1);
    const r = await eliminarArea({}, formulario({ id: "3" }));
    expect(dobles.area.deleteMany).toHaveBeenCalledWith({ where: { id: 3, subareas: { none: {} } } });
    expect(r.error).toBe("No se puede eliminar «Biología»: tiene 1 subárea. Elimínala o cámbiala de área antes.");
  });

  it("eliminar: un P2003 de la base se traduce en lugar de subir como excepción", async () => {
    dobles.area.findUnique.mockResolvedValue({ nombre: "Biología", _count: { subareas: 0 } });
    dobles.$transaction.mockRejectedValue(errorPrisma("P2003"));
    dobles.subarea.count.mockResolvedValue(1);
    expect((await eliminarArea({}, formulario({ id: "3" }))).error).toContain("tiene 1 subárea");
  });
});
