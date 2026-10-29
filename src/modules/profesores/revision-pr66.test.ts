// Pruebas de la revisión del PR #66 (issue #9 / docs del PR #67).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client";
import { buscarDuplicadoProfesor, registrarProfesor } from "./profesores";

const prismaFalso = vi.hoisted(() => ({
  profesor: { findMany: vi.fn(), create: vi.fn() },
}));
const sesionFalsa = vi.hoisted(() => ({
  requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })),
}));

vi.mock("../../lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("../../lib/auth/session", () => sesionFalsa);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => sesionFalsa);

const valido = {
  codigo: "PRUEBA01",
  nombres: "Ana María",
  apellidos: "Pérez Ruiz",
  correo: "ana.perez@academicos.udg.mx",
  genero: "F",
  tipoContratacion: "TIEMPO_COMPLETO",
  estatusLaboral: "ACTIVO",
  departamentoId: "",
  gradoId: "",
  cvu: "",
  orcid: "",
  scholarId: "",
  scopusId: "",
};

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "7.10.0" });
}

describe("Validación del formulario (registrarProfesor)", () => {
  it("V1. rechaza nombres y apellidos con números", () => {
    expect(registrarProfesor.safeParse({ ...valido, nombres: "Ana123" }).success).toBe(false);
    expect(registrarProfesor.safeParse({ ...valido, apellidos: "12345" }).success).toBe(false);
  });

  it("V2. un departamento inválido da un mensaje en español", () => {
    const r = registrarProfesor.safeParse({ ...valido, departamentoId: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).not.toMatch(/Invalid|expected/i);
  });

  it("V3. acepta el ORCID con x minúscula y lo guarda con X mayúscula", () => {
    const r = registrarProfesor.safeParse({ ...valido, orcid: "0000-0001-2345-678x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.orcid).toBe("0000-0001-2345-678X");
  });

  it("control: datos válidos con identificadores vacíos pasan", () => {
    const r = registrarProfesor.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.orcid).toBeUndefined();
  });
});

describe("Duplicados (buscarDuplicadoProfesor)", () => {
  const existente = [{ codigo: "PRUEBA01", correo: "otro@academicos.udg.mx", orcid: "0000-0001-2345-678X" }];

  it("D1. detecta el mismo ORCID escrito con x minúscula", () => {
    const r = registrarProfesor.safeParse({ ...valido, codigo: "NUEVO02", orcid: "0000-0001-2345-678x" });
    if (r.success) expect(buscarDuplicadoProfesor(r.data, existente)?.campo).toBe("orcid");
    else expect(r.success).toBe(false);
  });

  it("control: detecta código repetido", () => {
    const r = registrarProfesor.safeParse(valido);
    expect(r.success && buscarDuplicadoProfesor(r.data, existente)?.campo).toBe("codigo");
  });
});

describe("Server Action crearProfesor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.profesor.findMany.mockResolvedValue([]);
    prismaFalso.profesor.create.mockResolvedValue({ id: 1 });
  });

  it("control: exige el permiso del módulo antes de todo", async () => {
    const { crearProfesor } = await import("../../app/profesores/actions");
    await crearProfesor({}, formulario(valido));
    expect(sesionFalsa.requireModulo).toHaveBeenCalledWith("profesores");
  });

  it("control: registra un profesor válido", async () => {
    const { crearProfesor } = await import("../../app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.registrado).toBe("Ana María Pérez Ruiz");
    expect(prismaFalso.profesor.create).toHaveBeenCalledOnce();
  });

  it("control: un código repetido no llega a la base", async () => {
    prismaFalso.profesor.findMany.mockResolvedValue([{ codigo: "PRUEBA01", correo: "x@udg.mx" }]);
    const { crearProfesor } = await import("../../app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.campo).toBe("codigo");
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
  });

  it("control: P2002 (otro registro al mismo tiempo) da un mensaje legible", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2002"));
    const { crearProfesor } = await import("../../app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.error).toBeDefined();
  });

  it("A1. P2003 (departamento o grado borrado mientras se llenaba) da un mensaje legible y no lanza", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2003"));
    const { crearProfesor } = await import("../../app/profesores/actions");
    const r = await crearProfesor({}, formulario({ ...valido, departamentoId: "99" })).catch((e) => ({ lanzo: e }));
    expect(r).not.toHaveProperty("lanzo");
    expect(r).toHaveProperty("error");
  });
});
