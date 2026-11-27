import { beforeEach, describe, expect, it, vi } from "vitest";
import { eliminarArea } from "./areas/actions";
import { eliminarDepartamento } from "./departamentos/actions";
import { eliminarDivision } from "./divisiones/actions";
import { eliminarGrado } from "./grados/actions";
import { eliminarSubarea } from "./subareas/actions";

// #277: eliminar un registro de Catálogos deja su constancia en la bitácora, dentro de la misma transacción.

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  $transaction: vi.fn(),
  auditoria: { create: vi.fn() },
  gradoCientifico: { findUnique: vi.fn(), deleteMany: vi.fn() },
  division: { findUnique: vi.fn(), deleteMany: vi.fn() },
  departamento: { findUnique: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  area: { findUnique: vi.fn(), deleteMany: vi.fn() },
  subarea: { findUnique: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
  profesor: { count: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const actor = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };
const formulario = (id = "7") => {
  const datos = new FormData();
  datos.set("id", id);
  return datos;
};

const casos = [
  { nombre: "grado científico", accion: eliminarGrado, modelo: dobles.gradoCientifico, tipo: "GradoCientifico",
    existente: { nombre: "Doctorado", _count: { profesores: 0 } }, resumen: "Eliminó el grado científico «Doctorado» (id 7)." },
  { nombre: "división", accion: eliminarDivision, modelo: dobles.division, tipo: "Division",
    existente: { nombre: "Ciencias", _count: { departamentos: 0 } }, resumen: "Eliminó la división «Ciencias» (id 7)." },
  { nombre: "departamento", accion: eliminarDepartamento, modelo: dobles.departamento, tipo: "Departamento",
    existente: { nombre: "Física", _count: { profesores: 0, programas: 0, cuerposAcademicos: 0 } }, resumen: "Eliminó el departamento «Física» (id 7)." },
  { nombre: "área", accion: eliminarArea, modelo: dobles.area, tipo: "Area",
    existente: { nombre: "Biología", _count: { subareas: 0 } }, resumen: "Eliminó el área «Biología» (id 7)." },
  { nombre: "subárea", accion: eliminarSubarea, modelo: dobles.subarea, tipo: "Subarea",
    existente: { nombre: "Genética" }, resumen: "Eliminó la subárea «Genética» (id 7)." },
];

describe.each(casos)("eliminar $nombre y su bitácora (#277)", ({ accion, modelo, tipo, existente, resumen }) => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue(actor);
    dobles.$transaction.mockImplementation(async (cb: (tx: typeof dobles) => unknown) => cb(dobles));
    dobles.auditoria.create.mockReturnValue(Promise.resolve({}));
    modelo.findUnique.mockResolvedValue(existente);
  });

  it("al borrar guarda el registro en la misma transacción, con id y nombre del catálogo y sin datos personales", async () => {
    modelo.deleteMany.mockResolvedValue({ count: 1 });
    await accion({}, formulario());
    expect(dobles.$transaction).toHaveBeenCalledTimes(1);
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: actor.id, actorCorreo: actor.correo, modulo: "catalogos", accion: "registro.eliminado",
        entidad: tipo, entidadId: "7", resumen,
      }),
    });
  });

  it("si no se borró nada (alguien lo empezó a usar) no deja registro", async () => {
    modelo.deleteMany.mockResolvedValue({ count: 0 });
    dobles.profesor.count.mockResolvedValue(1);
    dobles.departamento.count.mockResolvedValue(1);
    modelo.findUnique.mockResolvedValueOnce(existente).mockResolvedValue({ _count: { profesores: 1, programas: 0, cuerposAcademicos: 0 } });
    await accion({}, formulario());
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si no se puede escribir la bitácora, el error sube y el borrado se revierte con la transacción", async () => {
    modelo.deleteMany.mockResolvedValue({ count: 1 });
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la base"));
    await expect(accion({}, formulario())).rejects.toThrow("falla de la base");
    expect(dobles.redirect).not.toHaveBeenCalled();
  });

  it("un registro que no existe no toca la bitácora", async () => {
    modelo.findUnique.mockResolvedValue(null);
    const resultado = await accion({}, formulario());
    expect(resultado.error).toBeTruthy();
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });
});
