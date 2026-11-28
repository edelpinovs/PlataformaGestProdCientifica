import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearProfesor, crearProfesorEnModal, eliminarProfesor, leerDetalleProfesor } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  profesor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  auditoria: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect, RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    codigo: "DEMO0001", nombres: "Persona", apellidos: "Ficticia", correo: "persona@demo.invalid",
    genero: "F", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO", ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

describe("alta de profesor en modal (D-214, piloto D-216)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findMany.mockResolvedValue([]);
    dobles.profesor.create.mockResolvedValue({ id: 1 });
  });

  it("exige el permiso del módulo antes de leer o escribir datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(crearProfesorEnModal({}, formulario())).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("profesores");
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
    expect(dobles.profesor.create).not.toHaveBeenCalled();
  });

  it("un alta correcta devuelve un éxito confirmado y actualiza el listado", async () => {
    const resultado = await crearProfesorEnModal({}, formulario());
    expect(resultado).toEqual({ exito: "Se registró a Persona Ficticia correctamente." });
    expect(dobles.profesor.create).toHaveBeenCalledOnce();
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/profesores");
  });

  it("un dato inválido devuelve el error en español con su campo y los valores, sin crear", async () => {
    const resultado = await crearProfesorEnModal({}, formulario({ correo: "no-es-correo" }));
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBe("El correo no tiene un formato válido.");
    expect(resultado.campo).toBe("correo");
    expect(resultado.valores).toMatchObject({ nombres: "Persona", correo: "no-es-correo" });
    expect(dobles.profesor.create).not.toHaveBeenCalled();
  });

  it("un género ausente o manipulado no se acepta y el mensaje es el propio", async () => {
    const datos = formulario();
    datos.delete("genero");
    const ausente = await crearProfesorEnModal({}, datos);
    expect(ausente.error).toBe("Selecciona un género.");
    expect(ausente.campo).toBe("genero");
    const manipulado = await crearProfesorEnModal({}, formulario({ genero: "X" }));
    expect(manipulado.error).toBe("Selecciona un género.");
  });

  it("un código o correo ya registrado se rechaza con el campo marcado", async () => {
    dobles.profesor.findMany.mockResolvedValue([
      { id: 9, codigo: "DEMO0001", correo: "otra@demo.invalid", orcid: null, scholarId: null, scopusId: null, cvu: null },
    ]);
    const resultado = await crearProfesorEnModal({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.campo).toBe("codigo");
    expect(resultado.error).toBeTruthy();
    expect(dobles.profesor.create).not.toHaveBeenCalled();
  });

  it("una carrera de unicidad (P2002) conserva los valores y no revienta", async () => {
    dobles.profesor.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "7", meta: { target: ["correo"] } }),
    );
    const resultado = await crearProfesorEnModal({}, formulario());
    expect(resultado.exito).toBeUndefined();
    expect(resultado.error).toBeTruthy();
    expect(resultado.valores).toMatchObject({ codigo: "DEMO0001" });
  });

  it("el formulario de página sigue funcionando con las mismas reglas", async () => {
    const resultado = await crearProfesor({}, formulario());
    expect(resultado).toEqual({ registrado: "Persona Ficticia" });
    const invalido = await crearProfesor({}, formulario({ nombres: "" }));
    expect(invalido.error).toBe("El nombre es obligatorio.");
    expect(invalido.campo).toBe("nombres");
  });
});

describe("detalle de profesor (issue 341)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findUnique.mockResolvedValue(null);
  });

  it("exige el permiso del módulo antes de leer el registro", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(leerDetalleProfesor(4)).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("profesores");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve null si ese profesor ya no existe", async () => {
    await expect(leerDetalleProfesor(4)).resolves.toBeNull();
    expect(dobles.profesor.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 } }));
  });
});

const ACTOR = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" as const };

function profesorSinUso() {
  return {
    codigo: "DEMO001",
    nombres: "Persona",
    apellidos: "Ficticia",
    correo: "persona@demo.invalid",
    perfil: null,
    _count: {
      reconocimientosSnii: 0,
      reconocimientosProdep: 0,
      cuerposAcademicos: 0,
      cuerposLiderados: 0,
      lgacs: 0,
      participaciones: 0,
      autorias: 0,
      cortesEscaneo: 0,
      programas: 0,
    },
  };
}

function formularioBorrado(id = "4") {
  const datos = new FormData();
  datos.set("id", id);
  return datos;
}

describe("borrado de profesor en la bitácora", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue(ACTOR);
    dobles.$transaction.mockImplementation(async (operacion: (tx: typeof dobles) => Promise<number>) => operacion(dobles));
    dobles.profesor.deleteMany.mockResolvedValue({ count: 1 });
    dobles.auditoria.create.mockResolvedValue({});
    dobles.profesor.findUnique.mockResolvedValue(profesorSinUso());
  });

  it("exige el permiso del módulo antes de leer o borrar", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(eliminarProfesor({}, formularioBorrado())).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("profesores");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("guarda el borrado y su constancia en la misma transacción, con el código y sin datos personales", async () => {
    await eliminarProfesor({}, formularioBorrado());
    expect(dobles.$transaction).toHaveBeenCalledTimes(1);
    expect(dobles.profesor.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 4 }) }),
    );
    expect(dobles.auditoria.create).toHaveBeenCalledWith({
      data: {
        actorId: ACTOR.id,
        actorCorreo: ACTOR.correo,
        modulo: "profesores",
        accion: "registro.eliminado",
        entidad: "Profesor",
        entidadId: "4",
        resumen: "Eliminó el profesor DEMO001.",
      },
    });
    const resumen = String(dobles.auditoria.create.mock.calls[0][0].data.resumen);
    expect(resumen).not.toContain("Persona");
    expect(resumen).not.toContain("Ficticia");
    expect(resumen).not.toContain("persona@demo.invalid");
    expect(dobles.redirect).toHaveBeenCalledWith("/profesores?eliminado=Persona%20Ficticia", "replace");
  });

  it("no escribe la bitácora cuando el borrado se rechaza por tener registros relacionados", async () => {
    dobles.profesor.findUnique.mockResolvedValue({ ...profesorSinUso(), perfil: { id: "perfil" } });
    const resultado = await eliminarProfesor({}, formularioBorrado());
    expect(resultado.error).toContain("perfil de acceso");
    expect(dobles.$transaction).not.toHaveBeenCalled();
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("no escribe la bitácora si el borrado no quitó ninguna fila", async () => {
    dobles.profesor.deleteMany.mockResolvedValue({ count: 0 });
    dobles.profesor.findUnique
      .mockResolvedValueOnce(profesorSinUso())
      .mockResolvedValueOnce({ ...profesorSinUso(), perfil: { id: "perfil" } });
    const resultado = await eliminarProfesor({}, formularioBorrado());
    expect(resultado.error).toContain("perfil de acceso");
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("si la constancia falla, no confirma el borrado", async () => {
    dobles.auditoria.create.mockRejectedValue(new Error("bitácora"));
    await expect(eliminarProfesor({}, formularioBorrado())).rejects.toThrow("bitácora");
    expect(dobles.profesor.deleteMany).toHaveBeenCalledOnce();
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
});
