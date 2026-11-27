import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarInvitacion, invitarUsuario } from "./actions";

// #275 · D-301: el panel deja la invitación pendiente; nunca crea la cuenta en Supabase Auth.

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  perfil: { findMany: vi.fn() },
  invitacionPendiente: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  auditoria: { create: vi.fn() },
  profesor: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const actor = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };
const profesorLibre = { id: 9, nombres: "Ana", apellidos: "Ejemplo", codigo: "100" };

function formulario(campos: Record<string, string>) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(actor);
  dobles.perfil.findMany.mockResolvedValue([
    { id: actor.id, correo: actor.correo, rol: "ADMINISTRADOR", activo: true, profesorId: null },
    { id: "33333333-3333-4333-8333-333333333333", correo: "docente@ejemplo.mx", rol: "DOCENTE", activo: true, profesorId: 5 },
  ]);
  dobles.invitacionPendiente.findMany.mockResolvedValue([{ correo: "pendiente@ejemplo.mx", profesorId: 7 }]);
  dobles.invitacionPendiente.create.mockResolvedValue({ id: 3 });
  dobles.auditoria.create.mockResolvedValue({});
  dobles.profesor.findFirst.mockResolvedValue(profesorLibre);
  dobles.$transaction.mockImplementation(async (cb: (tx: typeof dobles) => unknown) => cb(dobles));
  dobles.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("invitar usuario", () => {
  it("exige el permiso del módulo antes de leer o escribir", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(invitarUsuario({}, formulario({ correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "" }))).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("administracion");
    expect(dobles.invitacionPendiente.create).not.toHaveBeenCalled();
  });

  it("deja la invitación pendiente con la bitácora en la misma transacción y sin nombre del profesor", async () => {
    const r = await invitarUsuario({}, formulario({ correo: " Nuevo@Ejemplo.MX ", rol: "COORDINADOR", profesorId: "9" }));
    expect(r.exito).toContain("nuevo@ejemplo.mx");
    expect(dobles.invitacionPendiente.create).toHaveBeenCalledWith({
      data: { correo: "nuevo@ejemplo.mx", rol: "COORDINADOR", profesorId: 9, creadaPor: actor.correo },
      select: { id: true },
    });
    const evento = dobles.auditoria.create.mock.calls[0][0].data;
    expect(evento).toMatchObject({ modulo: "administracion", accion: "usuario.invitado", entidad: "InvitacionPendiente", entidadId: "3" });
    expect(evento.resumen).toContain("código 100");
    expect(evento.resumen).not.toContain("Ana");
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/administracion/usuarios");
  });

  it("sin profesor también se puede invitar", async () => {
    const r = await invitarUsuario({}, formulario({ correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "" }));
    expect(r.exito).toBeTruthy();
    expect(dobles.profesor.findFirst).not.toHaveBeenCalled();
    expect(dobles.invitacionPendiente.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ profesorId: null }) }));
  });

  it.each([
    ["un correo que ya tiene acceso", { correo: "DOCENTE@ejemplo.mx", rol: "DOCENTE", profesorId: "" }, "Ese correo ya tiene acceso.", "correo"],
    ["un correo con invitación pendiente", { correo: "pendiente@ejemplo.mx", rol: "DOCENTE", profesorId: "" }, "Ese correo ya tiene una invitación pendiente.", "correo"],
    ["un profesor que ya tiene perfil", { correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "5" }, "Ese profesor ya tiene un perfil de acceso.", "profesorId"],
    ["un profesor con invitación pendiente", { correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "7" }, "Ese profesor ya tiene una invitación pendiente.", "profesorId"],
  ])("rechaza %s, en español y conservando los valores", async (_, campos, mensaje, campo) => {
    const r = await invitarUsuario({}, formulario(campos));
    expect(r).toMatchObject({ error: mensaje, campo, valores: campos });
    expect(dobles.invitacionPendiente.create).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ correo: "", rol: "DOCENTE", profesorId: "" }, "correo"],
    [{ correo: "sin-arroba", rol: "DOCENTE", profesorId: "" }, "correo"],
    [{ correo: "a@ejemplo.mx", rol: "SUPERUSUARIO", profesorId: "" }, "rol"],
    [{ correo: "a@ejemplo.mx", rol: "DOCENTE", profesorId: "abc" }, "profesorId"],
  ])("un envío atípico devuelve un mensaje en español (%j)", async (campos, campo) => {
    const r = await invitarUsuario({}, formulario(campos));
    expect(r.campo).toBe(campo);
    expect(r.error).toBeTruthy();
    expect(r.error).not.toMatch(/Invalid|expected|received/i);
    expect(dobles.invitacionPendiente.create).not.toHaveBeenCalled();
  });

  it("si el servidor no encuentra al profesor elegible, lo dice y no guarda nada", async () => {
    dobles.profesor.findFirst.mockResolvedValue(null);
    const r = await invitarUsuario({}, formulario({ correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "9" }));
    expect(r).toMatchObject({ campo: "profesorId", error: "El profesor ya no está disponible para esta operación. Selecciona otro." });
    expect(dobles.invitacionPendiente.create).not.toHaveBeenCalled();
  });

  it("una carrera entre dos administradores (P2002) devuelve un mensaje, no una excepción", async () => {
    dobles.invitacionPendiente.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "prueba" }));
    const r = await invitarUsuario({}, formulario({ correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "" }));
    expect(r.error).toBe("Ese correo o ese profesor ya tiene una invitación pendiente.");
  });

  it("si la bitácora falla el error sube y no se confirma nada", async () => {
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la bitácora"));
    await expect(invitarUsuario({}, formulario({ correo: "nuevo@ejemplo.mx", rol: "DOCENTE", profesorId: "" }))).rejects.toThrow("falla de la bitácora");
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("cancelar invitación", () => {
  it("exige el permiso del módulo", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(cancelarInvitacion(formulario({ id: "3" }))).rejects.toThrow("sin permiso");
    expect(dobles.invitacionPendiente.deleteMany).not.toHaveBeenCalled();
  });

  it("borra la invitación y deja constancia en la misma transacción", async () => {
    dobles.invitacionPendiente.findUnique.mockResolvedValue({ correo: "pendiente@ejemplo.mx" });
    dobles.invitacionPendiente.deleteMany.mockResolvedValue({ count: 1 });
    await expect(cancelarInvitacion(formulario({ id: "3" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.invitacionPendiente.deleteMany).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(dobles.auditoria.create.mock.calls[0][0].data).toMatchObject({ accion: "usuario.invitacion_cancelada", entidadId: "3" });
    expect(dobles.redirect).toHaveBeenCalledWith("/administracion/usuarios?cancelada=pendiente%40ejemplo.mx", "replace");
  });

  it("si ya se ejecutó o se canceló, avisa sin tocar la bitácora", async () => {
    dobles.invitacionPendiente.findUnique.mockResolvedValue(null);
    await expect(cancelarInvitacion(formulario({ id: "3" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.redirect).toHaveBeenCalledWith("/administracion/usuarios?error=invitacion", "replace");
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it.each(["", "abc", "-1", "0", "99999999999", "1.5"])("un identificador atípico (%j) no consulta la base", async (id) => {
    await expect(cancelarInvitacion(formulario({ id }))).rejects.toThrow("NEXT_REDIRECT");
    expect(dobles.invitacionPendiente.findUnique).not.toHaveBeenCalled();
  });
});
