import { describe, expect, it } from "vitest";
import { buscarDuplicada, division } from "./divisiones";

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
