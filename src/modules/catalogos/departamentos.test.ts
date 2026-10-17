import { describe, expect, it } from "vitest";
import { departamento, revisarDepartamento } from "./departamentos";

const contexto = {
  divisiones: [
    { id: 1, nombre: "División A" },
    { id: 2, nombre: "División B" },
  ],
  departamentos: [{ nombre: "Departamento de Ciencias", nomenclatura: "DEP-A1", divisionId: 1 }],
};

describe("departamento (RF-003)", () => {
  it("exige nombre, nomenclatura y división", () => {
    const resultado = departamento.safeParse({ nombre: " ", nomenclatura: "", divisionId: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(expect.arrayContaining(["nombre", "nomenclatura", "divisionId"]));
    }
  });

  it("convierte la división elegida en el formulario a número", () => {
    expect(departamento.parse({ nombre: " Física ", nomenclatura: "FIS", divisionId: "2" })).toEqual({
      nombre: "Física",
      nomenclatura: "FIS",
      divisionId: 2,
    });
  });

  it("rechaza una división que no es un identificador válido", () => {
    expect(departamento.safeParse({ nombre: "Física", nomenclatura: "FIS", divisionId: "abc" }).success).toBe(false);
  });
});

describe("formato de departamento (#8)", () => {
  const valido = { nombre: "Departamento de Física", nomenclatura: "FIS", divisionId: "1" };

  it("acepta nombres con comas, guiones y acentos", () => {
    for (const nombre of [
      "Departamento de Humanidades, Artes y Culturas",
      "Departamento de Ciencias Económico-Administrativas",
    ]) {
      expect(departamento.safeParse({ ...valido, nombre }).success, nombre).toBe(true);
    }
  });

  it("rechaza nombres con números, símbolos o muy cortos", () => {
    for (const nombre of ["Departamento 1", "123", "-- Física", "De", "Física @"]) {
      expect(departamento.safeParse({ ...valido, nombre }).success, nombre).toBe(false);
    }
  });

  it("guarda la primera letra del nombre en mayúscula", () => {
    expect(departamento.parse({ ...valido, nombre: "departamento de física" }).nombre).toBe("Departamento de física");
  });

  it("guarda la nomenclatura en mayúsculas y admite números y guiones", () => {
    expect(departamento.parse({ ...valido, nomenclatura: "dep-a3" }).nomenclatura).toBe("DEP-A3");
  });

  it("rechaza nomenclaturas de una letra, que empiezan con número o con espacios y símbolos", () => {
    for (const nomenclatura of ["d", "1DEP", "DEP A", "DEP.A", "DEP_A", "A".repeat(21)]) {
      expect(departamento.safeParse({ ...valido, nomenclatura }).success, nomenclatura).toBe(false);
    }
  });
});

describe("revisarDepartamento (RF-003)", () => {
  it("acepta un departamento nuevo en una división existente", () => {
    expect(revisarDepartamento({ nombre: "Física", nomenclatura: "FIS", divisionId: 2 }, contexto)).toBeNull();
  });

  it("rechaza una división que no existe", () => {
    expect(revisarDepartamento({ nombre: "Física", nomenclatura: "FIS", divisionId: 9 }, contexto)).toEqual({
      campo: "divisionId",
      mensaje: "La división elegida no existe. Recarga la página y elige otra.",
    });
  });

  it("rechaza una nomenclatura existente aunque sea de otra división", () => {
    expect(revisarDepartamento({ nombre: "Otro", nomenclatura: "dep-a1", divisionId: 2 }, contexto)).toEqual({
      campo: "nomenclatura",
      mensaje: "Ya existe un departamento con la nomenclatura «DEP-A1» (Departamento de Ciencias).",
    });
  });

  it("rechaza un nombre repetido en la misma división", () => {
    expect(
      revisarDepartamento({ nombre: "departamento de ciencias", nomenclatura: "X", divisionId: 1 }, contexto),
    ).toEqual({
      campo: "nombre",
      mensaje: "La división «División A» ya tiene un departamento llamado «Departamento de Ciencias».",
    });
  });

  it("permite el mismo nombre en otra división", () => {
    expect(
      revisarDepartamento({ nombre: "Departamento de Ciencias", nomenclatura: "X", divisionId: 2 }, contexto),
    ).toBeNull();
  });
});
