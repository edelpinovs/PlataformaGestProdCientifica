import { Prisma } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearProfesor, crearProfesorEnModal } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  revalidatePath: vi.fn(),
  profesor: { findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

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
