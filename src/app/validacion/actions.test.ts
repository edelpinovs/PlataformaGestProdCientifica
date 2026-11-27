import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  profesorFindUnique: vi.fn(),
  publicacionFindMany: vi.fn(),
  publicacionFindUnique: vi.fn(),
  publicacionCreate: vi.fn(),
  publicacionDelete: vi.fn(),
  auditoriaCreate: vi.fn(),
  $transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    autoria: { findUnique: dobles.findUnique, update: dobles.update },
    profesor: { findUnique: dobles.profesorFindUnique },
    publicacion: {
      findMany: dobles.publicacionFindMany,
      findUnique: dobles.publicacionFindUnique,
      create: dobles.publicacionCreate,
      delete: dobles.publicacionDelete,
    },
    auditoria: { create: dobles.auditoriaCreate },
    $transaction: dobles.$transaction,
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, RedirectType: { replace: "replace" } }));

import { confirmarAutoria, eliminarPublicacionManual, rechazarHomonimo, registrarPublicacionManual } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  dobles.requireModulo.mockResolvedValue({ id: "user-docente-7", correo: "docente@ejemplo.udg.mx", rol: "DOCENTE", profesorId: 7 });
  dobles.findUnique.mockResolvedValue({ profesorId: 7, publicacionId: 12, estado: "PENDIENTE" });
  dobles.update.mockResolvedValue({});
  dobles.profesorFindUnique.mockResolvedValue({ id: 7, nombres: "Ana", apellidos: "García", codigo: "123456" });
  dobles.publicacionFindMany.mockResolvedValue([]);
  dobles.publicacionFindUnique.mockResolvedValue(null);
  dobles.publicacionCreate.mockResolvedValue({ id: 99 });
  dobles.publicacionDelete.mockResolvedValue({});
  dobles.auditoriaCreate.mockReturnValue(Promise.resolve({}));
  dobles.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") return arg(dobles);
    return arg;
  });
});

function formulario(profesor = "7", publicacion = "12") {
  const datos = new FormData();
  datos.set("profesorId", profesor);
  datos.set("publicacionId", publicacion);
  datos.set("retorno", "vista=bandeja&q=agua&fuente=ORCID&estado=PENDIENTE&pagina=3");
  return datos;
}

function formularioManual(sobreescrituras: Record<string, string> = {}) {
  const datos = new FormData();
  datos.set("profesorId", "7");
  datos.set("tipo", "ARTICULO");
  datos.set("titulo", "Algoritmos cuánticos distribuidos");
  datos.set("autoresTexto", "García, A.; Pérez, B.");
  datos.set("fechaPublicacion", "2025-06-15");
  datos.set("revistaEditorial", "Revista Mexicana de Computación");
  datos.set("isbnIssn", "1234-5678");
  datos.set("doi", "10.1016/j.artint.2025.01.001");
  datos.set("volumen", "Vol. 10");
  datos.set("paginas", "15-28");
  datos.set("evidenciaUrl", "https://ejemplo.udg.mx/articulos/101");

  for (const [clave, valor] of Object.entries(sobreescrituras)) {
    datos.set(clave, valor);
  }
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

describe("registrarPublicacionManual (RF-023, D-214, D-215)", () => {
  it("permite a un docente registrar una obra a su propio nombre y nace VALIDADA", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });

    const resultado = await registrarPublicacionManual({}, formularioManual());

    expect(resultado.exito).toContain("incorporó al conteo oficial");
    expect(dobles.publicacionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: "Algoritmos cuánticos distribuidos",
          fuente: "MANUAL",
          autorias: {
            create: expect.objectContaining({
              profesorId: 7,
              estado: "VALIDADA",
              revisadaEn: expect.any(Date),
            }),
          },
        }),
      }),
    );
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/validacion");
  });

  it("rechaza si un docente intenta registrar a nombre de otro profesor", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });

    const resultado = await registrarPublicacionManual({}, formularioManual({ profesorId: "8" }));

    expect(resultado).toEqual({
      error: "Como docente solo puedes registrar publicaciones a tu propio nombre.",
      campo: "profesorId",
    });
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("rechaza si el docente no tiene perfil docente asociado", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: null });

    const resultado = await registrarPublicacionManual({}, formularioManual());

    expect(resultado).toEqual({
      error: "Tu cuenta de usuario no está asociada a ningún perfil docente en el sistema.",
      campo: "profesorId",
    });
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("permite a un administrador registrar a nombre de un profesor y la autoría nace PENDIENTE", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR", profesorId: null });
    dobles.profesorFindUnique.mockResolvedValue({ id: 15, nombres: "Carlos", apellidos: "Mendoza", codigo: "987654" });

    const resultado = await registrarPublicacionManual({}, formularioManual({ profesorId: "15" }));

    expect(resultado.exito).toContain("envió a la bandeja del profesor para su confirmación");
    expect(dobles.publicacionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: "Algoritmos cuánticos distribuidos",
          fuente: "MANUAL",
          autorias: {
            create: expect.objectContaining({
              profesorId: 15,
              estado: "PENDIENTE",
              revisadaEn: null,
            }),
          },
        }),
      }),
    );
  });

  it("rechaza si el profesor elegido por el administrador no existe en el directorio", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR", profesorId: null });
    dobles.profesorFindUnique.mockResolvedValue(null);

    const resultado = await registrarPublicacionManual({}, formularioManual({ profesorId: "99" }));

    expect(resultado.campo).toBe("profesorId");
    expect(resultado.error).toContain("El profesor ya no está disponible");
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("devuelve error de validación cuando el título tiene menos de 3 caracteres y conserva los valores", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });

    const resultado = await registrarPublicacionManual({}, formularioManual({ titulo: "ab" }));

    expect(resultado.campo).toBe("titulo");
    expect(resultado.error).toContain("El título debe tener al menos 3 caracteres.");
    expect(resultado.valores?.titulo).toBe("ab");
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("detecta duplicado de DOI y devuelve error en el campo doi", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });
    dobles.publicacionFindMany.mockResolvedValue([
      { id: 50, doi: "10.1016/j.artint.2025.01.001", tituloNormalizado: "otro", autorias: [] },
    ]);

    const resultado = await registrarPublicacionManual({}, formularioManual());

    expect(resultado.campo).toBe("doi");
    expect(resultado.error).toContain("Ya existe una publicación registrada con el DOI");
    expect(dobles.publicacionCreate).not.toHaveBeenCalled();
  });

  it("captura error P2002 de Prisma y devuelve error con campo doi", async () => {
    dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });
    const errorP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.0.0",
    });
    dobles.publicacionCreate.mockRejectedValue(errorP2002);

    const resultado = await registrarPublicacionManual({}, formularioManual());

    expect(resultado.campo).toBe("doi");
    expect(resultado.error).toBe("Ya existe una publicación con el mismo identificador DOI.");
  });
});

describe("bitácora de auditoría en Validación (RF-024, #381, D-294)", () => {
  const actorDocente = { id: "user-docente-7", correo: "docente@ejemplo.udg.mx", rol: "DOCENTE", profesorId: 7 };

  beforeEach(() => {
    dobles.requireModulo.mockResolvedValue(actorDocente);
    dobles.findUnique.mockResolvedValue({ profesorId: 7, publicacionId: 12, estado: "PENDIENTE" });
  });

  it("al confirmar autoría registra validacion.dictaminada en la misma transacción sin datos personales", async () => {
    await expect(confirmarAutoria(formulario("7", "12"))).rejects.toThrow("accion=confirmada");
    expect(dobles.$transaction).toHaveBeenCalledTimes(1);
    expect(dobles.auditoriaCreate).toHaveBeenCalledWith({
      data: {
        actorId: actorDocente.id,
        actorCorreo: actorDocente.correo,
        modulo: "validacion",
        accion: "validacion.dictaminada",
        entidad: "Publicacion",
        entidadId: "12",
        resumen: "Dictaminó la publicación 12: confirmada.",
      },
    });
    expect(JSON.stringify(dobles.auditoriaCreate.mock.calls)).not.toMatch(/García|Ana|123456/);
  });

  it("al rechazar por homónimo registra validacion.dictaminada en la misma transacción sin datos personales", async () => {
    await expect(rechazarHomonimo(formulario("7", "12"))).rejects.toThrow("accion=rechazada");
    expect(dobles.$transaction).toHaveBeenCalledTimes(1);
    expect(dobles.auditoriaCreate).toHaveBeenCalledWith({
      data: {
        actorId: actorDocente.id,
        actorCorreo: actorDocente.correo,
        modulo: "validacion",
        accion: "validacion.dictaminada",
        entidad: "Publicacion",
        entidadId: "12",
        resumen: "Dictaminó la publicación 12: rechazada.",
      },
    });
    expect(JSON.stringify(dobles.auditoriaCreate.mock.calls)).not.toMatch(/García|Ana|123456/);
  });

  it("si el dictamen falla o no tiene permiso, no escribe en la bitácora de auditoría", async () => {
    await expect(confirmarAutoria(formulario("8", "12"))).rejects.toThrow("error=sin-permiso");
    expect(dobles.auditoriaCreate).not.toHaveBeenCalled();
    expect(dobles.$transaction).not.toHaveBeenCalled();
  });

  it("si la auditoría falla en confirmar autoría, el cambio no se aplica y la acción lanza", async () => {
    dobles.$transaction.mockRejectedValue(new Error("error en bitácora"));
    await expect(confirmarAutoria(formulario("7", "12"))).rejects.toThrow("error en bitácora");
  });

  describe("eliminarPublicacionManual", () => {
    const publicacionManual = {
      id: 25,
      titulo: "Publicación a borrar",
      fuente: "MANUAL",
      autorias: [{ profesorId: 7 }],
    };

    function formularioEliminar(id = "25") {
      const d = new FormData();
      d.set("id", id);
      return d;
    }

    it("al eliminar una publicación manual guarda registro.eliminado en la misma transacción sin datos personales", async () => {
      dobles.publicacionFindUnique.mockResolvedValue(publicacionManual);
      dobles.publicacionDelete.mockResolvedValue(publicacionManual);

      await expect(eliminarPublicacionManual("vista=manuales", {}, formularioEliminar("25"))).rejects.toThrow("accion=eliminado");

      expect(dobles.$transaction).toHaveBeenCalledTimes(1);
      expect(dobles.publicacionDelete).toHaveBeenCalledWith({ where: { id: 25 } });
      expect(dobles.auditoriaCreate).toHaveBeenCalledWith({
        data: {
          actorId: actorDocente.id,
          actorCorreo: actorDocente.correo,
          modulo: "validacion",
          accion: "registro.eliminado",
          entidad: "Publicacion",
          entidadId: "25",
          resumen: "Eliminó la publicación manual 25.",
        },
      });
      expect(JSON.stringify(dobles.auditoriaCreate.mock.calls)).not.toMatch(/García|Ana|123456/);
    });

    it("no escribe en la bitácora si la publicación no existe o no se puede eliminar", async () => {
      dobles.publicacionFindUnique.mockResolvedValue(null);
      const res = await eliminarPublicacionManual("vista=manuales", {}, formularioEliminar("99"));
      expect(res.error).toBeDefined();
      expect(dobles.$transaction).not.toHaveBeenCalled();
      expect(dobles.auditoriaCreate).not.toHaveBeenCalled();
    });

    it("no escribe en la bitácora si no tiene permiso para eliminar la publicación", async () => {
      dobles.publicacionFindUnique.mockResolvedValue({
        ...publicacionManual,
        autorias: [{ profesorId: 99 }],
      });
      const res = await eliminarPublicacionManual("vista=manuales", {}, formularioEliminar("25"));
      expect(res.error).toContain("No tienes permiso");
      expect(dobles.$transaction).not.toHaveBeenCalled();
      expect(dobles.auditoriaCreate).not.toHaveBeenCalled();
    });

    it("si la auditoría falla al eliminar, la publicación no se borra y lanza el error", async () => {
      dobles.publicacionFindUnique.mockResolvedValue(publicacionManual);
      dobles.$transaction.mockRejectedValue(new Error("falla transacción"));

      await expect(eliminarPublicacionManual("vista=manuales", {}, formularioEliminar("25"))).rejects.toThrow("falla transacción");
    });
  });
});
