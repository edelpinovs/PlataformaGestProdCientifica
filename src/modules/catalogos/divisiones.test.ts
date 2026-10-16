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
