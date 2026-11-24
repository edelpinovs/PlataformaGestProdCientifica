import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  profesorFindUnique: vi.fn(),
  publicacionFindMany: vi.fn(),
  publicacionCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    autoria: { findUnique: dobles.findUnique, update: dobles.update },
    profesor: { findUnique: dobles.profesorFindUnique },
    publicacion: { findMany: dobles.publicacionFindMany, create: dobles.publicacionCreate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); }, RedirectType: { replace: "replace" } }));

import { confirmarAutoria, rechazarHomonimo, registrarPublicacionManual } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  dobles.requireModulo.mockResolvedValue({ rol: "DOCENTE", profesorId: 7 });
  dobles.findUnique.mockResolvedValue({ profesorId: 7, publicacionId: 12, estado: "PENDIENTE" });
  dobles.update.mockResolvedValue({});
  dobles.profesorFindUnique.mockResolvedValue({ id: 7, nombres: "Ana", apellidos: "García", codigo: "123456" });
  dobles.publicacionFindMany.mockResolvedValue([]);
  dobles.publicacionCreate.mockResolvedValue({ id: 99 });
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
