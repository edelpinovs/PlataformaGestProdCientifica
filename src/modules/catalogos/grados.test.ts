import { describe, expect, it } from "vitest";
import { buscarDuplicado, gradoCientifico } from "./grados";

const existentes = [
  { nombre: "Maestría", nomenclatura: "MTRO" },
  { nombre: "Doctorado", nomenclatura: "DR" },
];

describe("gradoCientifico (RF-001)", () => {
  it("exige nombre y nomenclatura", () => {
    const resultado = gradoCientifico.safeParse({ nombre: "  ", nomenclatura: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(expect.arrayContaining(["nombre", "nomenclatura"]));
    }
  });

  it("limpia espacios sobrantes", () => {
    const resultado = gradoCientifico.parse({ nombre: "  Doctorado   en  Ciencias ", nomenclatura: " DC " });
    expect(resultado).toEqual({ nombre: "Doctorado en Ciencias", nomenclatura: "DC" });
  });
});

describe("buscarDuplicado (RF-001)", () => {
  it("acepta un grado nuevo", () => {
    expect(buscarDuplicado({ nombre: "Licenciatura", nomenclatura: "LIC" }, existentes)).toBeNull();
  });

  it("rechaza un nombre existente sin importar mayúsculas ni acentos", () => {
    expect(buscarDuplicado({ nombre: "maestria", nomenclatura: "M" }, existentes)).toEqual({
      campo: "nombre",
      mensaje: "Ya existe un grado científico con el nombre «Maestría».",
    });
  });

  it("rechaza una nomenclatura existente sin importar mayúsculas", () => {
    expect(buscarDuplicado({ nombre: "Doctor", nomenclatura: "dr" }, existentes)).toEqual({
      campo: "nomenclatura",
      mensaje: "Ya existe un grado científico con la nomenclatura «DR».",
    });
  });
});
