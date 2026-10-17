import { describe, expect, it } from "vitest";
import { buscarDuplicado, gradoCientifico, motivoNoEliminable } from "./grados";

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

  it("acepta nombres con acentos y puntos", () => {
    expect(gradoCientifico.safeParse({ nombre: "Maestría en C. Sociales", nomenclatura: "MCS" }).success).toBe(true);
  });

  it("rechaza nombres con números, símbolos o muy cortos", () => {
    for (const nombre of ["Nombre 1", "123", "-- Doctorado", "Dr"]) {
      const resultado = gradoCientifico.safeParse({ nombre, nomenclatura: "DR" });
      expect(resultado.success, nombre).toBe(false);
    }
  });

  it("guarda la nomenclatura en mayúsculas", () => {
    expect(gradoCientifico.parse({ nombre: "Especialidad", nomenclatura: "esp" }).nomenclatura).toBe("ESP");
  });

  it("rechaza nomenclaturas de una letra, con números, espacios o puntos", () => {
    for (const nomenclatura of ["d", "D1", "M C", "M.C.", "ABCDEFGHIJK"]) {
      const resultado = gradoCientifico.safeParse({ nombre: "Especialidad", nomenclatura });
      expect(resultado.success, nomenclatura).toBe(false);
    }
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

describe("buscarDuplicado al editar (#55)", () => {
  const conId = [
    { id: 1, nombre: "Maestría", nomenclatura: "MTRO" },
    { id: 2, nombre: "Doctorado", nomenclatura: "DR" },
  ];

  it("un grado puede conservar su propio nombre y nomenclatura", () => {
    expect(buscarDuplicado({ nombre: "Maestría", nomenclatura: "MTRO" }, conId, 1)).toBeNull();
  });

  it("un grado puede cambiar mayúsculas o acentos de su propio nombre", () => {
    expect(buscarDuplicado({ nombre: "Maestria", nomenclatura: "MTRO" }, conId, 1)).toBeNull();
  });

  it("no puede tomar el nombre de otro grado", () => {
    expect(buscarDuplicado({ nombre: "doctorado", nomenclatura: "MTRO" }, conId, 1)).toEqual({
      campo: "nombre",
      mensaje: "Ya existe un grado científico con el nombre «Doctorado».",
    });
  });

  it("no puede tomar la nomenclatura de otro grado", () => {
    expect(buscarDuplicado({ nombre: "Maestría", nomenclatura: "DR" }, conId, 1)).toEqual({
      campo: "nomenclatura",
      mensaje: "Ya existe un grado científico con la nomenclatura «DR».",
    });
  });
});

describe("motivoNoEliminable (#55)", () => {
  it("permite eliminar un grado sin profesores", () => {
    expect(motivoNoEliminable("Especialidad", 0)).toBeNull();
  });

  it("explica por qué no se elimina un grado asignado a un profesor", () => {
    expect(motivoNoEliminable("Doctorado", 1)).toBe(
      "No se puede eliminar «Doctorado»: está asignado a 1 profesor. Cambia su grado antes de eliminarlo.",
    );
  });

  it("usa el plural con varios profesores", () => {
    expect(motivoNoEliminable("Maestría", 12)).toBe(
      "No se puede eliminar «Maestría»: está asignado a 12 profesores. Cambia su grado antes de eliminarlo.",
    );
  });
});
