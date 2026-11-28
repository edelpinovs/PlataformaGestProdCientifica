import { beforeEach, describe, expect, it, vi } from "vitest";
import { eliminarCuerpo } from "./actions";
import { eliminarLgac, quitarIntegrante } from "./[id]/actions";

// #379 (sub-issue de #277): eliminar un CA, una LGAC o quitar a un integrante deja su constancia en la
// bitácora, dentro de la misma transacción que el cambio. Datos ficticios.

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  $transaction: vi.fn(),
  auditoria: { create: vi.fn() },
  cuerpoAcademico: { findUnique: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  integranteCa: { findMany: vi.fn(), deleteMany: vi.fn() },
  lgac: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
  profesor: { findUnique: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

const actor = { id: "11111111-1111-4111-8111-111111111111", correo: "coordinacion@ejemplo.mx", rol: "COORDINADOR" };

function formulario(campos: Record<string, string>) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

const profesorFicticio = (id: number, codigo: string) => ({
  profesorId: id,
  profesor: {
    id, nombres: "Ana", apellidos: "Prueba Ficticia", codigo,
    tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO", reconocimientosProdep: [],
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(actor);
  dobles.$transaction.mockImplementation(async (cb: (tx: typeof dobles) => unknown) => cb(dobles));
  dobles.auditoria.create.mockReturnValue(Promise.resolve({}));
});

function esperarEvento(entidad: string, entidadId: string, resumen: string) {
  expect(dobles.$transaction).toHaveBeenCalledTimes(1);
  expect(dobles.auditoria.create).toHaveBeenCalledTimes(1);
  expect(dobles.auditoria.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      actorId: actor.id, actorCorreo: actor.correo, modulo: "cuerpos-academicos", accion: "registro.eliminado",
      entidad, entidadId, resumen,
    }),
  });
}

describe("eliminar un cuerpo académico y su bitácora (#379)", () => {
  beforeEach(() => {
    dobles.cuerpoAcademico.findUnique.mockResolvedValue({
      clave: "CA-PRUEBA-01", nombre: "Cuerpo ficticio", _count: { integrantes: 0, lgacs: 0 },
    });
  });

  it("guarda el registro con la clave y el id del CA, sin su nombre", async () => {
    dobles.cuerpoAcademico.deleteMany.mockResolvedValue({ count: 1 });
    await eliminarCuerpo({}, formulario({ id: "7" }));
    esperarEvento("CuerpoAcademico", "7", "Eliminó el cuerpo académico CA-PRUEBA-01 (id 7).");
  });

  it("si se rechaza porque tiene integrantes, no escribe nada", async () => {
    dobles.cuerpoAcademico.findUnique.mockResolvedValue({
      clave: "CA-PRUEBA-01", nombre: "Cuerpo ficticio", _count: { integrantes: 2, lgacs: 0 },
    });
    const resultado = await eliminarCuerpo({}, formulario({ id: "7" }));
    expect(resultado.error).toBeTruthy();
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si no se borró nada (alguien le agregó integrantes) no deja registro", async () => {
    dobles.cuerpoAcademico.deleteMany.mockResolvedValue({ count: 0 });
    await eliminarCuerpo({}, formulario({ id: "7" }));
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si la bitácora falla, el error sube y el borrado se revierte con la transacción", async () => {
    dobles.cuerpoAcademico.deleteMany.mockResolvedValue({ count: 1 });
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la base"));
    await expect(eliminarCuerpo({}, formulario({ id: "7" }))).rejects.toThrow("falla de la base");
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
});

describe("eliminar una LGAC y su bitácora (#379)", () => {
  beforeEach(() => {
    dobles.lgac.findFirst.mockResolvedValue({ nombre: "Línea ficticia", cuerpo: { clave: "CA-PRUEBA-01" } });
  });

  it("guarda el registro con el id de la LGAC y la clave del CA", async () => {
    dobles.lgac.deleteMany.mockResolvedValue({ count: 1 });
    await eliminarLgac({}, formulario({ id: "12", cuerpoId: "7" }));
    esperarEvento("Lgac", "12", "Eliminó la LGAC id 12 del cuerpo académico CA-PRUEBA-01.");
  });

  it("una LGAC que ya no existe no toca la bitácora", async () => {
    dobles.lgac.findFirst.mockResolvedValue(null);
    const resultado = await eliminarLgac({}, formulario({ id: "12", cuerpoId: "7" }));
    expect(resultado.error).toBeTruthy();
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si no se borró nada no deja registro", async () => {
    dobles.lgac.deleteMany.mockResolvedValue({ count: 0 });
    const resultado = await eliminarLgac({}, formulario({ id: "12", cuerpoId: "7" }));
    expect(resultado.error).toBeTruthy();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si la bitácora falla, el error sube y el borrado se revierte", async () => {
    dobles.lgac.deleteMany.mockResolvedValue({ count: 1 });
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la base"));
    await expect(eliminarLgac({}, formulario({ id: "12", cuerpoId: "7" }))).rejects.toThrow("falla de la base");
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
});

describe("quitar a un integrante y su bitácora (#379)", () => {
  beforeEach(() => {
    dobles.integranteCa.findMany.mockResolvedValue([profesorFicticio(3, "P-0003"), profesorFicticio(4, "P-0004")]);
    dobles.cuerpoAcademico.findUnique.mockResolvedValue({ clave: "CA-PRUEBA-01", liderId: null });
    dobles.profesor.findUnique.mockResolvedValue({ codigo: "P-0003" });
    dobles.cuerpoAcademico.updateMany.mockResolvedValue({ count: 0 });
    dobles.lgac.findMany.mockResolvedValue([]);
  });

  it("guarda el registro con el código del profesor, nunca su nombre", async () => {
    dobles.integranteCa.deleteMany.mockResolvedValue({ count: 1 });
    await quitarIntegrante({}, formulario({ cuerpoId: "7", id: "3" }));
    esperarEvento("IntegranteCa", "7:3", "Eliminó al integrante con código P-0003 del cuerpo académico CA-PRUEBA-01.");
    const { resumen } = dobles.auditoria.create.mock.calls[0][0].data;
    expect(resumen).not.toMatch(/Ana|Prueba Ficticia/);
  });

  it("si la persona ya no era integrante, no deja registro", async () => {
    dobles.integranteCa.deleteMany.mockResolvedValue({ count: 0 });
    const resultado = await quitarIntegrante({}, formulario({ cuerpoId: "7", id: "3" }));
    expect(resultado.error).toBeTruthy();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si se rechaza porque el CA se quedaría sin PRODEP, no escribe nada", async () => {
    const conProdep = profesorFicticio(3, "P-0003");
    conProdep.profesor.reconocimientosProdep = [
      { resultado: "APROBADO", inicio: new Date("2020-01-01"), fin: new Date("2999-12-31") },
    ] as never;
    dobles.integranteCa.findMany.mockResolvedValue([conProdep, profesorFicticio(4, "P-0004")]);
    const resultado = await quitarIntegrante({}, formulario({ cuerpoId: "7", id: "3" }));
    expect(resultado.error).toMatch(/PRODEP/);
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si la bitácora falla, el error sube y el cambio se revierte con la transacción", async () => {
    dobles.integranteCa.deleteMany.mockResolvedValue({ count: 1 });
    dobles.auditoria.create.mockRejectedValue(new Error("falla de la base"));
    await expect(quitarIntegrante({}, formulario({ cuerpoId: "7", id: "3" }))).rejects.toThrow("falla de la base");
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
});
