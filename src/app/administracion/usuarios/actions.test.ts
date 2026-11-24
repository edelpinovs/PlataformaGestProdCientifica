import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarEstadoUsuario, editarUsuario } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  perfil: { findMany: vi.fn(), update: vi.fn() },
  auditoria: { create: vi.fn() },
  $transaction: vi.fn(),
  profesor: { findFirst: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTRO_ADMIN = "22222222-2222-4222-8222-222222222222";
const DOCENTE = "33333333-3333-4333-8333-333333333333";

const perfiles = [
  { id: ADMIN, correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR", activo: true, profesorId: null },
  { id: OTRO_ADMIN, correo: "admin2@ejemplo.mx", rol: "ADMINISTRADOR", activo: true, profesorId: null },
  { id: DOCENTE, correo: "docente@ejemplo.mx", rol: "DOCENTE", activo: true, profesorId: 5 },
];
const profesorLibre = { id: 9, nombres: "Ana", apellidos: "Ejemplo", codigo: "100" };

function formulario(campos: Record<string, string>) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "prueba" });
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue({ id: ADMIN, correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" });
  dobles.perfil.findMany.mockResolvedValue(perfiles.map((p) => ({ ...p })));
  dobles.perfil.update.mockResolvedValue({});
  dobles.auditoria.create.mockResolvedValue({});
  dobles.$transaction.mockImplementation((operaciones: Promise<unknown>[]) => Promise.all(operaciones));
  dobles.profesor.findFirst.mockResolvedValue(profesorLibre);
});

describe("editar usuario", () => {
  it("exige el permiso del módulo antes de leer o escribir", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(editarUsuario({}, formulario({ id: DOCENTE, rol: "COORDINADOR", profesorId: "" }))).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("administracion");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("cambia el rol, desvincula al profesor y redirige con el resultado", async () => {
    await editarUsuario({}, formulario({ id: DOCENTE, rol: "COORDINADOR", profesorId: "" }));
    expect(dobles.perfil.update).toHaveBeenCalledWith({ where: { id: DOCENTE }, data: { rol: "COORDINADOR", profesorId: null } });
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/administracion/usuarios");
    expect(dobles.redirect).toHaveBeenCalledWith("/administracion/usuarios?editado=docente%40ejemplo.mx", "replace");
  });

  it("deja constancia en la bitácora, en la misma transacción que el cambio", async () => {
    await editarUsuario({}, formulario({ id: DOCENTE, rol: "COORDINADOR", profesorId: "" }));
    expect(dobles.$transaction).toHaveBeenCalledTimes(1);
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        actorCorreo: "admin@ejemplo.mx",
        modulo: "administracion",
        accion: "usuario.editado",
        entidad: "Perfil",
        entidadId: DOCENTE,
        resumen: "Cambió el rol de Docente a Coordinación de Investigación y desvinculó al profesor de docente@ejemplo.mx.",
      },
    });
  });

  it("si la bitácora falla, el cambio no se guarda", async () => {
    dobles.$transaction.mockRejectedValue(new Error("falla de la bitácora"));
    await expect(editarUsuario({}, formulario({ id: DOCENTE, rol: "COORDINADOR", profesorId: "" }))).rejects.toThrow("falla de la bitácora");
    expect(dobles.redirect).not.toHaveBeenCalled();
  });

  it("sin cambios no escribe en el perfil ni en la bitácora", async () => {
    dobles.redirect.mockImplementation(() => {
      throw new Error("redirige");
    });
    dobles.profesor.findFirst.mockResolvedValue({ ...profesorLibre, id: 5 });
    await expect(editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "5" }))).rejects.toThrow("redirige");
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.perfil.update).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("vincula a un profesor que el servidor vuelve a comprobar", async () => {
    await editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "9" }));
    expect(dobles.profesor.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 9 }) }));
    expect(dobles.perfil.update).toHaveBeenCalledWith({ where: { id: DOCENTE }, data: { rol: "DOCENTE", profesorId: 9 } });
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resumen: "Vinculó al profesor con código 100 de docente@ejemplo.mx." }),
    });
  });

  it("rechaza un profesor que ya no está disponible", async () => {
    dobles.profesor.findFirst.mockResolvedValue(null);
    const r = await editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "9" }));
    expect(r.error).toBe("El profesor ya no está disponible para esta operación. Selecciona otro.");
    expect(r.campo).toBe("profesorId");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("rechaza un profesor que ya tiene otro perfil", async () => {
    const r = await editarUsuario({}, formulario({ id: ADMIN, rol: "ADMINISTRADOR", profesorId: "5" }));
    expect(r).toMatchObject({ error: "Ese profesor ya tiene un perfil de acceso.", campo: "profesorId" });
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("el perfil no choca con su propio profesor", async () => {
    dobles.profesor.findFirst.mockResolvedValue({ ...profesorLibre, id: 5 });
    await editarUsuario({}, formulario({ id: DOCENTE, rol: "COORDINADOR", profesorId: "5" }));
    expect(dobles.perfil.update).toHaveBeenCalled();
  });

  it("no deja quitar el rol al único administrador", async () => {
    dobles.perfil.findMany.mockResolvedValue([perfiles[0], perfiles[2]]);
    const r = await editarUsuario({}, formulario({ id: ADMIN, rol: "DOCENTE", profesorId: "" }));
    expect(r.error).toContain("Debe quedar al menos un administrador");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("devuelve mensajes en español ante valores manipulados", async () => {
    expect((await editarUsuario({}, formulario({ id: "no-es-uuid", rol: "DOCENTE", profesorId: "" }))).error).toBe(
      "Ese usuario ya no existe. Recarga la página.",
    );
    expect((await editarUsuario({}, formulario({ id: DOCENTE, rol: "SUPERUSUARIO", profesorId: "" }))).error).toBe("Elige un rol válido.");
    expect((await editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "abc" }))).error).toBe(
      "Elige un profesor de la lista.",
    );
    expect((await editarUsuario({}, formulario({ rol: "DOCENTE" }))).error).toBe("Ese usuario ya no existe. Recarga la página.");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("avisa si el usuario ya no existe", async () => {
    const r = await editarUsuario({}, formulario({ id: "44444444-4444-4444-8444-444444444444", rol: "DOCENTE", profesorId: "" }));
    expect(r.error).toBe("Ese usuario ya no existe. Recarga la página.");
  });

  it("traduce P2002 y P2025 a mensajes propios", async () => {
    dobles.perfil.update.mockRejectedValueOnce(errorPrisma("P2002"));
    expect((await editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "9" }))).error).toBe(
      "Ese profesor ya tiene un perfil de acceso.",
    );
    dobles.perfil.update.mockRejectedValueOnce(errorPrisma("P2025"));
    expect((await editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "" }))).error).toBe(
      "Ese usuario ya no existe. Recarga la página.",
    );
  });

  it("no oculta errores inesperados de la base", async () => {
    dobles.perfil.update.mockRejectedValueOnce(new Error("conexión perdida"));
    await expect(editarUsuario({}, formulario({ id: DOCENTE, rol: "DOCENTE", profesorId: "" }))).rejects.toThrow("conexión perdida");
  });
});

describe("desactivar y reactivar usuario", () => {
  it("exige el permiso del módulo antes de leer o escribir", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(cambiarEstadoUsuario({}, formulario({ id: DOCENTE, accion: "desactivar" }))).rejects.toThrow("sin permiso");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("desactiva y redirige con el resultado", async () => {
    await cambiarEstadoUsuario({}, formulario({ id: DOCENTE, accion: "desactivar" }));
    expect(dobles.perfil.update).toHaveBeenCalledWith({ where: { id: DOCENTE }, data: { activo: false } });
    expect(dobles.redirect).toHaveBeenCalledWith("/administracion/usuarios?desactivado=docente%40ejemplo.mx", "replace");
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accion: "usuario.desactivado", entidadId: DOCENTE, resumen: "Desactivó el acceso de docente@ejemplo.mx." }),
    });
  });

  it("reactiva", async () => {
    dobles.perfil.findMany.mockResolvedValue([perfiles[0], { ...perfiles[2], activo: false }]);
    await cambiarEstadoUsuario({}, formulario({ id: DOCENTE, accion: "reactivar" }));
    expect(dobles.perfil.update).toHaveBeenCalledWith({ where: { id: DOCENTE }, data: { activo: true } });
    expect(dobles.redirect).toHaveBeenCalledWith("/administracion/usuarios?reactivado=docente%40ejemplo.mx", "replace");
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accion: "usuario.reactivado", resumen: "Reactivó el acceso de docente@ejemplo.mx." }),
    });
  });

  it("nadie desactiva su propio acceso", async () => {
    const r = await cambiarEstadoUsuario({}, formulario({ id: ADMIN, accion: "desactivar" }));
    expect(r.error).toBe("No puedes desactivar tu propio acceso. Pídeselo a otro administrador.");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("no deja desactivar al único administrador", async () => {
    dobles.requireModulo.mockResolvedValue({ id: DOCENTE, rol: "ADMINISTRADOR" });
    dobles.perfil.findMany.mockResolvedValue([perfiles[0], perfiles[2]]);
    const r = await cambiarEstadoUsuario({}, formulario({ id: ADMIN, accion: "desactivar" }));
    expect(r.error).toBe("No se puede desactivar al único administrador. Asigna ese rol a otra persona primero.");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });

  it("rechaza una acción o un identificador manipulados con mensajes en español", async () => {
    expect((await cambiarEstadoUsuario({}, formulario({ id: DOCENTE, accion: "eliminar" }))).error).toBe("La acción solicitada no es válida.");
    expect((await cambiarEstadoUsuario({}, formulario({ id: "1", accion: "desactivar" }))).error).toBe("Ese usuario ya no existe. Recarga la página.");
    expect(dobles.perfil.update).not.toHaveBeenCalled();
  });
});
