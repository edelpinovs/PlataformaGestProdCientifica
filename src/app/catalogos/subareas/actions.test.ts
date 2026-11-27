import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editarSubarea, eliminarSubarea, registrarSubarea } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  $transaction: vi.fn(),
  auditoria: { create: vi.fn() },
  area: { findMany: vi.fn() },
  subarea: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const formulario = (campos: Record<string, string> = {}) => {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries({ nombre: "Genética molecular", areaId: "3", ...campos })) datos.set(clave, valor);
  return datos;
};
const errorPrisma = (code: string) => new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });

describe("subáreas (issue 264)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ id: "u1", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" });
    dobles.area.findMany.mockResolvedValue([{ id: 3, nombre: "Biología" }]);
    dobles.subarea.findMany.mockResolvedValue([]);
    dobles.subarea.create.mockResolvedValue({ id: 1 });
    dobles.$transaction.mockImplementation(async (cb: (tx: typeof dobles) => unknown) => cb(dobles));
    dobles.auditoria.create.mockReturnValue(Promise.resolve({}));
  });

  it("las tres acciones exigen el permiso del módulo antes de leer o escribir", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(registrarSubarea({}, formulario())).rejects.toThrow("sin permiso");
    await expect(editarSubarea({}, formulario({ id: "1" }))).rejects.toThrow("sin permiso");
    await expect(eliminarSubarea({}, formulario({ id: "1" }))).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("catalogos");
    expect(dobles.area.findMany).not.toHaveBeenCalled();
    expect(dobles.subarea.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado y actualiza ambos listados", async () => {
    const r = await registrarSubarea({}, formulario());
    expect(r).toEqual({ exito: "Se registró «Genética molecular» correctamente." });
    expect(dobles.subarea.create).toHaveBeenCalledWith({ data: { nombre: "Genética molecular", areaId: 3 } });
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/subareas");
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/catalogos/areas");
  });

  it("sin elegir área, o con un valor manipulado, responde en español sin crear", async () => {
    for (const areaId of ["", "NaN", "-1"]) {
      const r = await registrarSubarea({}, formulario({ areaId }));
      expect(r).toMatchObject({ error: "Elige el área a la que pertenece.", campo: "areaId" });
    }
    expect((await registrarSubarea({}, new FormData())).error).toBe("El nombre es obligatorio.");
    expect(dobles.subarea.create).not.toHaveBeenCalled();
  });

  it("un área que ya no existe se rechaza", async () => {
    const r = await registrarSubarea({}, formulario({ areaId: "99" }));
    expect(r).toMatchObject({ error: "El área elegida no existe. Recarga la página y elige otra.", campo: "areaId" });
    expect(dobles.subarea.create).not.toHaveBeenCalled();
  });

  it("una subárea repetida en la misma área se rechaza; la base (P2002 y P2003) también se traduce", async () => {
    dobles.subarea.findMany.mockResolvedValue([{ nombre: "Genética molecular", areaId: 3 }]);
    const repetida = await registrarSubarea({}, formulario({ nombre: "genetica molecular" }));
    expect(repetida.error).toBe("El área «Biología» ya tiene una subárea llamada «Genética molecular».");

    dobles.subarea.findMany.mockResolvedValue([]);
    dobles.subarea.create.mockRejectedValueOnce(errorPrisma("P2002"));
    expect((await registrarSubarea({}, formulario())).error).toBe("Esa subárea ya existe en el área elegida.");
    dobles.subarea.create.mockRejectedValueOnce(errorPrisma("P2003"));
    expect((await registrarSubarea({}, formulario())).error).toBe("El área elegida ya no existe. Recarga la página.");
  });

  it("editar: la subárea no choca consigo misma y se puede mover de área", async () => {
    dobles.subarea.findMany.mockResolvedValue([{ id: 1, nombre: "Genética molecular", areaId: 3 }]);
    await editarSubarea({}, formulario({ id: "1" }));
    expect(dobles.subarea.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { nombre: "Genética molecular", areaId: 3 } });
    expect(dobles.redirect).toHaveBeenCalledWith("/catalogos/subareas?editada=Gen%C3%A9tica%20molecular", "replace");
  });

  it("editar: un identificador inexistente avisa sin escribir", async () => {
    dobles.subarea.findMany.mockResolvedValue([{ id: 2, nombre: "Otra", areaId: 3 }]);
    expect((await editarSubarea({}, formulario({ id: "1" }))).error).toBe("Esa subárea ya no existe en el catálogo. Recarga la página.");
    expect(dobles.subarea.update).not.toHaveBeenCalled();
  });

  it("eliminar: borra, deja constancia y redirige; si ya no existe, lo dice", async () => {
    dobles.subarea.findUnique.mockResolvedValue({ nombre: "Genética" });
    dobles.subarea.deleteMany.mockResolvedValue({ count: 1 });
    await eliminarSubarea({}, formulario({ id: "4" }));
    expect(dobles.auditoria.create).toHaveBeenCalledOnce();
    expect(dobles.redirect).toHaveBeenCalledWith("/catalogos/subareas?eliminada=Gen%C3%A9tica", "replace");

    dobles.subarea.findUnique.mockResolvedValue(null);
    expect((await eliminarSubarea({}, formulario({ id: "4" }))).error).toBe("Esa subárea ya no existe en el catálogo. Recarga la página.");
  });
});
