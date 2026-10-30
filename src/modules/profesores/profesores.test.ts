import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client";
import {
  asignacionLaboral,
  buscarDuplicadoProfesor,
  ESTATUS_LABORALES,
  filtroCandidatosDuplicado,
  generarNombreNormalizado,
  mensajeUnicidadPrisma,
  motivoProfesorNoEliminable,
  registrarProfesor,
} from "./profesores";

const prismaFalso = vi.hoisted(() => ({
  profesor: { findMany: vi.fn(), create: vi.fn() },
}));
const sesionFalsa = vi.hoisted(() => ({
  requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => sesionFalsa);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

const datosValidos = {
  codigo: "ABC123",
  nombres: "Juan",
  apellidos: "García López",
  correo: "juan.garcia@cuvalles.udg.mx",
  genero: "M" as const,
  tipoContratacion: "TIEMPO_COMPLETO" as const,
  estatusLaboral: "ACTIVO" as const,
};

const existentes = [
  {
    id: 1,
    codigo: "EXI001",
    correo: "existente@cuvalles.udg.mx",
    orcid: "0000-0001-2345-6789",
    scholarId: "scholar123",
    scopusId: "57204190023",
    cvu: "cvu789",
  },
];

const usoVacio = {
  perfil: 0,
  reconocimientos: 0,
  cuerpos: 0,
  liderazgos: 0,
  lgacs: 0,
  participaciones: 0,
  autorias: 0,
  cortes: 0,
  programas: 0,
};

describe("registrarProfesor (RF-004)", () => {
  it("acepta datos mínimos válidos", () => {
    expect(registrarProfesor.safeParse(datosValidos).success).toBe(true);
  });

  it("exige código, nombres, apellidos, correo, género y tipo de contratación", () => {
    const resultado = registrarProfesor.safeParse({
      codigo: "",
      nombres: "",
      apellidos: "",
      correo: "",
      genero: "",
      tipoContratacion: "",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(
        expect.arrayContaining(["codigo", "nombres", "apellidos", "correo", "genero", "tipoContratacion"]),
      );
    }
  });

  it("transforma el código a mayúsculas y elimina espacios", () => {
    const resultado = registrarProfesor.parse({ ...datosValidos, codigo: "  abc123  " });
    expect(resultado.codigo).toBe("ABC123");
  });

  it("rechaza código con espacios internos", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, codigo: "ABC 123" }).success).toBe(false);
  });

  it("limpia espacios y pone mayúscula inicial en nombres y apellidos", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      nombres: "  maría  josé ",
      apellidos: "  garcía  lópez ",
    });
    expect(resultado.nombres).toBe("María josé");
    expect(resultado.apellidos).toBe("García lópez");
  });

  it("rechaza nombres o apellidos con números", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, nombres: "Ana123" }).success).toBe(false);
    expect(registrarProfesor.safeParse({ ...datosValidos, apellidos: "López2" }).success).toBe(false);
  });

  it("acepta apellidos con acentos, apóstrofos y guiones", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, apellidos: "O'Connor-Pérez" }).success).toBe(true);
  });

  it("transforma el correo a minúsculas", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      correo: "Juan.GARCIA@CUValles.UDG.MX",
    });
    expect(resultado.correo).toBe("juan.garcia@cuvalles.udg.mx");
  });

  it("rechaza un correo sin formato válido", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, correo: "no-es-correo" }).success).toBe(false);
  });

  it("rechaza género distinto de M o F", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, genero: "X" }).success).toBe(false);
  });

  it("acepta un departamento o grado elegido en el formulario", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      departamentoId: "4",
      gradoId: "2",
    });
    expect(resultado.departamentoId).toBe(4);
    expect(resultado.gradoId).toBe(2);
  });

  it("deja el departamento y el grado ausentes si no se eligen", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      departamentoId: "",
      gradoId: "",
    });
    expect(resultado.departamentoId).toBeUndefined();
    expect(resultado.gradoId).toBeUndefined();
  });

  it("rechaza un identificador de departamento o grado que no es un número, en español", () => {
    const departamento = registrarProfesor.safeParse({ ...datosValidos, departamentoId: "abc" });
    expect(departamento.success).toBe(false);
    if (!departamento.success) {
      expect(departamento.error.issues[0].message).toBe("Elige una opción de la lista o recarga la página.");
    }

    const grado = registrarProfesor.safeParse({ ...datosValidos, gradoId: "no-id" });
    expect(grado.success).toBe(false);
    if (!grado.success) {
      expect(grado.error.issues[0].message).toBe("Elige una opción de la lista o recarga la página.");
    }
  });

  it("acepta ORCID con x minúscula y lo guarda en mayúscula", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      orcid: "0000-0001-2345-678x",
    });
    expect(resultado.orcid).toBe("0000-0001-2345-678X");
  });

  it("acepta ORCID con formato correcto", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, orcid: "0000-0001-2345-678X" }).success).toBe(true);
  });

  it("rechaza ORCID con formato incorrecto", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, orcid: "0000-0001-2345" }).success).toBe(false);
  });

  it("acepta un Scopus ID de dígitos y rechaza letras", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, scopusId: "57204190023" }).success).toBe(true);
    expect(registrarProfesor.safeParse({ ...datosValidos, scopusId: "scopus456" }).success).toBe(false);
  });

  it("acepta un Scholar ID con letras y números y rechaza uno muy corto", () => {
    expect(registrarProfesor.safeParse({ ...datosValidos, scholarId: "abc123def" }).success).toBe(true);
    expect(registrarProfesor.safeParse({ ...datosValidos, scholarId: "ab" }).success).toBe(false);
  });
});

describe("asignacionLaboral (RF-006)", () => {
  it("acepta tiempo completo o asignatura con cada estatus", () => {
    for (const tipoContratacion of ["TIEMPO_COMPLETO", "ASIGNATURA"] as const) {
      for (const estatusLaboral of ESTATUS_LABORALES) {
        expect(asignacionLaboral.safeParse({ tipoContratacion, estatusLaboral }).success).toBe(true);
      }
    }
  });

  it("exige tipo de contratación y estatus laboral", () => {
    const resultado = asignacionLaboral.safeParse({ tipoContratacion: "", estatusLaboral: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const mensajes = resultado.error.issues.map((i) => i.message);
      expect(mensajes).toContain("Selecciona el tipo de contratación.");
      expect(mensajes).toContain("Selecciona el estatus laboral.");
    }
  });

  it("rechaza un tipo o un estatus que no están en el catálogo", () => {
    expect(asignacionLaboral.safeParse({ tipoContratacion: "HONORARIOS", estatusLaboral: "ACTIVO" }).success).toBe(false);
    expect(asignacionLaboral.safeParse({ tipoContratacion: "ASIGNATURA", estatusLaboral: "JUBILADO" }).success).toBe(false);
  });

  it("el alta del profesor conserva la contratación y el estatus elegidos", () => {
    const resultado = registrarProfesor.parse({
      ...datosValidos,
      tipoContratacion: "ASIGNATURA",
      estatusLaboral: "LICENCIA",
    });
    expect(resultado.tipoContratacion).toBe("ASIGNATURA");
    expect(resultado.estatusLaboral).toBe("LICENCIA");
  });
});

describe("buscarDuplicadoProfesor (RF-005)", () => {
  it("acepta un profesor completamente nuevo", () => {
    expect(buscarDuplicadoProfesor({ ...registrarProfesor.parse(datosValidos) }, existentes)).toBeNull();
  });

  it("detecta código duplicado", () => {
    const resultado = buscarDuplicadoProfesor(registrarProfesor.parse({ ...datosValidos, codigo: "EXI001" }), existentes);
    expect(resultado?.campo).toBe("codigo");
  });

  it("detecta correo duplicado sin importar mayúsculas ni acentos", () => {
    const resultado = buscarDuplicadoProfesor(
      registrarProfesor.parse({ ...datosValidos, correo: "EXISTENTE@cuvalles.udg.mx" }),
      existentes,
    );
    expect(resultado?.campo).toBe("correo");
  });

  it("detecta ORCID duplicado aunque llegue en minúsculas", () => {
    const resultado = buscarDuplicadoProfesor(
      registrarProfesor.parse({ ...datosValidos, orcid: "0000-0001-2345-6789" }),
      existentes,
    );
    expect(resultado?.campo).toBe("orcid");
  });

  it("detecta Scholar ID duplicado sin importar mayúsculas", () => {
    const resultado = buscarDuplicadoProfesor(
      registrarProfesor.parse({ ...datosValidos, scholarId: "SCHOLAR123" }),
      existentes,
    );
    expect(resultado?.campo).toBe("scholarId");
  });

  it("detecta Scopus ID duplicado", () => {
    const resultado = buscarDuplicadoProfesor(
      registrarProfesor.parse({ ...datosValidos, scopusId: "57204190023" }),
      existentes,
    );
    expect(resultado?.campo).toBe("scopusId");
  });

  it("identificadores vacíos no chocan entre sí", () => {
    expect(buscarDuplicadoProfesor(registrarProfesor.parse(datosValidos), existentes)).toBeNull();
  });
});

describe("mensajeUnicidadPrisma (RF-005)", () => {
  it("traduce el campo único de Prisma a un mensaje en español", () => {
    expect(mensajeUnicidadPrisma(["correo"])).toEqual({
      campo: "correo",
      mensaje: "Ese correo institucional ya está registrado.",
    });
  });

  it("da un mensaje genérico si no reconoce el campo", () => {
    expect(mensajeUnicidadPrisma(["otro"])).toEqual({
      campo: "codigo",
      mensaje: "Algunos de los identificadores ingresados ya están registrados.",
    });
  });

  it("R1: lee el índice del adaptador pg cuando no llega target", () => {
    expect(
      mensajeUnicidadPrisma({
        driverAdapterError: {
          cause: { constraint: { index: "Profesor_orcid_key" } },
        },
        table: "Profesor",
      }),
    ).toEqual({ campo: "orcid", mensaje: "Ese ORCID ya está registrado." });
  });

  it("acepta target cuando el motor lo envía", () => {
    expect(mensajeUnicidadPrisma({ target: ["scopusId"] }).campo).toBe("scopusId");
  });
});

describe("filtroCandidatosDuplicado (RF-005)", () => {
  it("siempre busca por código y correo, y solo añade identificadores presentes", () => {
    const minimo = filtroCandidatosDuplicado(registrarProfesor.parse(datosValidos));
    expect(minimo).toEqual([{ codigo: "ABC123" }, { correo: "juan.garcia@cuvalles.udg.mx" }]);

    const conIds = filtroCandidatosDuplicado(
      registrarProfesor.parse({ ...datosValidos, orcid: "0000-0001-2345-678X", scopusId: "57204190023" }),
    );
    expect(conIds).toEqual([
      { codigo: "ABC123" },
      { correo: "juan.garcia@cuvalles.udg.mx" },
      { orcid: "0000-0001-2345-678X" },
      { scopusId: "57204190023" },
    ]);
  });
});

describe("buscarDuplicadoProfesor al editar (#59)", () => {
  it("un profesor puede conservar su propio código y correo", () => {
    expect(
      buscarDuplicadoProfesor(
        registrarProfesor.parse({ ...datosValidos, codigo: "EXI001", correo: "existente@cuvalles.udg.mx" }),
        existentes,
        1,
      ),
    ).toBeNull();
  });

  it("no puede tomar el código de otro profesor", () => {
    expect(
      buscarDuplicadoProfesor(registrarProfesor.parse({ ...datosValidos, codigo: "EXI001" }), existentes, 2),
    ).toEqual({
      campo: "codigo",
      mensaje: "Ya existe un profesor con el código «EXI001».",
    });
  });
});

describe("generarNombreNormalizado", () => {
  it("convierte a minúsculas sin acentos y combina apellidos y nombres", () => {
    expect(generarNombreNormalizado("María José", "García López")).toBe("garcia lopez maria jose");
  });
});

describe("motivoProfesorNoEliminable (#59)", () => {
  it("permite eliminar un profesor sin relaciones", () => {
    expect(motivoProfesorNoEliminable("Juan García", usoVacio)).toBeNull();
  });

  it("explica por qué no se elimina un profesor con reconocimientos", () => {
    expect(motivoProfesorNoEliminable("Juan García", { ...usoVacio, reconocimientos: 2 })).toBe(
      "No se puede eliminar a «Juan García»: tiene 2 reconocimientos. Quita esas relaciones antes de eliminarlo.",
    );
  });

  it("enumera varias relaciones", () => {
    expect(motivoProfesorNoEliminable("Ana Pérez", { ...usoVacio, perfil: 1, autorias: 3 })).toBe(
      "No se puede eliminar a «Ana Pérez»: tiene un perfil de acceso y 3 autorías. Quita esas relaciones antes de eliminarlo.",
    );
  });
});

const altaValida = {
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
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

function errorPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "7.10.0", meta });
}

function metaAdaptador(indice: string) {
  return {
    driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { index: indice } } },
    table: "Profesor",
  };
}

describe("crearProfesor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.profesor.findMany.mockResolvedValue([]);
    prismaFalso.profesor.create.mockResolvedValue({ id: 1 });
  });

  it("exige el permiso del módulo antes de todo", async () => {
    const { crearProfesor } = await import("../../app/profesores/actions");
    await crearProfesor({}, formulario(altaValida));
    expect(sesionFalsa.requireModulo).toHaveBeenCalledWith("profesores");
  });

  it("registra un profesor válido", async () => {
    const { crearProfesor } = await import("../../app/profesores/actions");
    const resultado = await crearProfesor({}, formulario(altaValida));
    expect(resultado.registrado).toBe("Ana María Pérez Ruiz");
    expect(prismaFalso.profesor.create).toHaveBeenCalledOnce();
  });

  it("un código repetido no llega a la base", async () => {
    prismaFalso.profesor.findMany.mockResolvedValue([{ codigo: "PRUEBA01", correo: "x@udg.mx" }]);
    const { crearProfesor } = await import("../../app/profesores/actions");
    const resultado = await crearProfesor({}, formulario(altaValida));
    expect(resultado.campo).toBe("codigo");
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
  });

  it("R1: un ORCID duplicado en carrera señala el ORCID", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2002", metaAdaptador("Profesor_orcid_key")));
    const { crearProfesor } = await import("../../app/profesores/actions");
    const resultado = await crearProfesor({}, formulario({ ...altaValida, orcid: "0000-0001-2345-678X" }));
    expect(resultado).toMatchObject({ campo: "orcid", error: "Ese ORCID ya está registrado." });
  });

  it("P2002 con target señala el campo que manda el motor", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2002", { target: ["correo"] }));
    const { crearProfesor } = await import("../../app/profesores/actions");
    const resultado = await crearProfesor({}, formulario(altaValida));
    expect(resultado).toMatchObject({ campo: "correo", error: "Ese correo institucional ya está registrado." });
  });

  it("A1: P2003 da un mensaje legible y no lanza", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2003"));
    const { crearProfesor } = await import("../../app/profesores/actions");
    const resultado = await crearProfesor({}, formulario({ ...altaValida, departamentoId: "99" })).catch((e) => ({
      lanzo: e,
    }));
    expect(resultado).not.toHaveProperty("lanzo");
    expect(resultado).toMatchObject({
      error: "El departamento o el grado elegido ya no existe. Recarga la página.",
    });
  });
});
