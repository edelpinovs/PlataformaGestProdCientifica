import { describe, expect, it } from "vitest";
import { buscarDuplicadoProfesor, generarNombreNormalizado, registrarProfesor } from "./profesores";

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
    codigo: "EXI001",
    correo: "existente@cuvalles.udg.mx",
    orcid: "0000-0001-2345-6789",
    scholarId: "scholar123",
    scopusId: "scopus456",
    cvu: "cvu789",
  },
];

// ─── Validación de schema (RF-004) ────────────────────────────────────────────

describe("registrarProfesor (RF-004)", () => {
  it("acepta datos mínimos válidos", () => {
    const resultado = registrarProfesor.safeParse(datosValidos);
    expect(resultado.success).toBe(true);
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
    const resultado = registrarProfesor.safeParse({ ...datosValidos, codigo: "  abc123  " });
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.codigo).toBe("ABC123");
  });

  it("rechaza código con espacios internos", () => {
    const resultado = registrarProfesor.safeParse({ ...datosValidos, codigo: "ABC 123" });
    expect(resultado.success).toBe(false);
  });

  it("transforma el correo a minúsculas", () => {
    const resultado = registrarProfesor.safeParse({
      ...datosValidos,
      correo: "Juan.GARCIA@CUValles.UDG.MX",
    });
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data.correo).toBe("juan.garcia@cuvalles.udg.mx");
  });

  it("rechaza un correo sin formato válido", () => {
    const resultado = registrarProfesor.safeParse({ ...datosValidos, correo: "no-es-correo" });
    expect(resultado.success).toBe(false);
  });

  it("rechaza género distinto de M o F", () => {
    const resultado = registrarProfesor.safeParse({ ...datosValidos, genero: "X" });
    expect(resultado.success).toBe(false);
  });

  it("acepta ORCID con formato correcto", () => {
    const resultado = registrarProfesor.safeParse({
      ...datosValidos,
      orcid: "0000-0001-2345-678X",
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza ORCID con formato incorrecto", () => {
    const resultado = registrarProfesor.safeParse({ ...datosValidos, orcid: "0000-0001-2345" });
    expect(resultado.success).toBe(false);
  });
});

// ─── Reglas de negocio de unicidad ────────────────────────────────────────────

describe("buscarDuplicadoProfesor (RF-004)", () => {
  it("acepta un profesor completamente nuevo", () => {
    expect(buscarDuplicadoProfesor(datosValidos, existentes)).toBeNull();
  });

  it("detecta código duplicado", () => {
    const resultado = buscarDuplicadoProfesor({ ...datosValidos, codigo: "EXI001" }, existentes);
    expect(resultado?.campo).toBe("codigo");
  });

  it("detecta correo duplicado sin importar mayúsculas ni acentos", () => {
    const resultado = buscarDuplicadoProfesor(
      { ...datosValidos, correo: "EXISTENTE@cuvalles.udg.mx" },
      existentes,
    );
    expect(resultado?.campo).toBe("correo");
  });

  it("detecta ORCID duplicado", () => {
    const resultado = buscarDuplicadoProfesor(
      { ...datosValidos, orcid: "0000-0001-2345-6789" },
      existentes,
    );
    expect(resultado?.campo).toBe("orcid");
  });

  it("detecta Scholar ID duplicado", () => {
    const resultado = buscarDuplicadoProfesor(
      { ...datosValidos, scholarId: "scholar123" },
      existentes,
    );
    expect(resultado?.campo).toBe("scholarId");
  });
});

// ─── Nombre normalizado ───────────────────────────────────────────────────────

describe("generarNombreNormalizado", () => {
  it("convierte a minúsculas sin acentos y combina apellidos y nombres", () => {
    expect(generarNombreNormalizado("María José", "García López")).toBe("garcia lopez maria jose");
  });
});
