import { describe, expect, it } from "vitest";
import { buscarDuplicada, division, motivoDivisionNoEliminable } from "./divisiones";

const existentes = [{ nombre: "División de Ejemplo A", clave: "DIV-A" }];

describe("division (RF-002)", () => {
  it("exige nombre y clave institucional", () => {
    const resultado = division.safeParse({ nombre: "", clave: "   " });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(expect.arrayContaining(["nombre", "clave"]));
    }
  });

  it("limpia espacios sobrantes", () => {
    expect(division.parse({ nombre: " División  de Ingenierías ", clave: " DI " })).toEqual({
      nombre: "División de Ingenierías",
      clave: "DI",
    });
  });

  it("rechaza nombres con números, símbolos o muy cortos", () => {
    for (const nombre of ["División 1", "123", "-- División", "Di"]) {
      expect(division.safeParse({ nombre, clave: "DIV-X" }).success, nombre).toBe(false);
    }
  });

  it("guarda la primera letra del nombre en mayúscula", () => {
    expect(division.parse({ nombre: "de Ejemplo C", clave: "DIV-X" }).nombre).toBe("De Ejemplo C");
    expect(division.parse({ nombre: "ébano", clave: "DIV-X" }).nombre).toBe("Ébano");
  });

  it("guarda la clave en mayúsculas y admite números y guiones", () => {
    expect(division.parse({ nombre: "División de Prueba", clave: "div-p2" }).clave).toBe("DIV-P2");
  });

  it("rechaza claves de una letra, que empiezan con número o con espacios y símbolos", () => {
    for (const clave of ["d", "1DIV", "DIV A", "DIV.A", "DIV_A", "A".repeat(21)]) {
      expect(division.safeParse({ nombre: "División de Prueba", clave }).success, clave).toBe(false);
    }
  });
});

describe("buscarDuplicada (RF-002)", () => {
  it("acepta una división nueva", () => {
    expect(buscarDuplicada({ nombre: "División B", clave: "DIV-B" }, existentes)).toBeNull();
  });

  it("rechaza una clave existente sin importar mayúsculas", () => {
    expect(buscarDuplicada({ nombre: "Otra", clave: "div-a" }, existentes)).toEqual({
      campo: "clave",
      mensaje: "Ya existe una división con la clave «DIV-A» (División de Ejemplo A).",
    });
  });

  it("rechaza un nombre existente sin importar mayúsculas ni acentos", () => {
    expect(buscarDuplicada({ nombre: "division de ejemplo a", clave: "DIV-Z" }, existentes)).toEqual({
      campo: "nombre",
      mensaje: "Ya existe una división con el nombre «División de Ejemplo A» (clave DIV-A).",
    });
  });
});

describe("buscarDuplicada al editar (#59)", () => {
  const conId = [
    { id: 1, nombre: "División de Ejemplo A", clave: "DIV-A" },
    { id: 2, nombre: "División de Ejemplo B", clave: "DIV-B" },
  ];

  it("una división puede conservar o corregir su propio nombre y clave", () => {
    expect(buscarDuplicada({ nombre: "Division de ejemplo A", clave: "div-a" }, conId, 1)).toBeNull();
  });

  it("no puede tomar la clave de otra división", () => {
    expect(buscarDuplicada({ nombre: "División de Ejemplo A", clave: "DIV-B" }, conId, 1)).toEqual({
      campo: "clave",
      mensaje: "Ya existe una división con la clave «DIV-B» (División de Ejemplo B).",
    });
  });

  it("no puede tomar el nombre de otra división", () => {
    expect(buscarDuplicada({ nombre: "División de Ejemplo B", clave: "DIV-A" }, conId, 1)?.campo).toBe("nombre");
  });
});

describe("motivoDivisionNoEliminable (#59)", () => {
  it("permite eliminar una división sin departamentos", () => {
    expect(motivoDivisionNoEliminable("División de Prueba", 0)).toBeNull();
  });

  it("explica por qué no se elimina una división con departamentos", () => {
    expect(motivoDivisionNoEliminable("División de Ejemplo A", 1)).toBe(
      "No se puede eliminar «División de Ejemplo A»: tiene 1 departamento. Elimínalo o cámbialo de división antes.",
    );
    expect(motivoDivisionNoEliminable("División de Ejemplo A", 2)).toBe(
      "No se puede eliminar «División de Ejemplo A»: tiene 2 departamentos. Elimínalos o cámbialos de división antes.",
    );
  });
});
