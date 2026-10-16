import { describe, expect, it } from "vitest";
import { buscarClaveDuplicada, division } from "./divisiones";

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

describe("buscarClaveDuplicada (RF-002)", () => {
  it("acepta una clave nueva", () => {
    expect(buscarClaveDuplicada({ nombre: "División B", clave: "DIV-B" }, existentes)).toBeNull();
  });

  it("rechaza una clave existente sin importar mayúsculas", () => {
    expect(buscarClaveDuplicada({ nombre: "Otra", clave: "div-a" }, existentes)).toBe(
      "Ya existe una división con la clave «DIV-A» (División de Ejemplo A).",
    );
  });
});
