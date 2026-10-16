import { describe, expect, it } from "vitest";
import { clasificarTipoUsuario, clasificarValidacion, decisionSiConexionFalla } from "./siiau";

describe("clasificarTipoUsuario", () => {
  it("marca como no UDG la respuesta 401 de SIIAU", () => {
    expect(clasificarTipoUsuario({ respuesta: "401 Unauthorized" })).toBe("no-udg");
  });

  it("marca como no UDG el error de código incorrecto", () => {
    expect(clasificarTipoUsuario({ error: "Codigo incorrecto" })).toBe("no-udg");
  });

  it("reconoce cualquier otra respuesta para intentar validarla", () => {
    expect(clasificarTipoUsuario({ tipo: "Profesor" })).toBe("reconocido");
    expect(clasificarTipoUsuario({ respuesta: "200 OK" })).toBe("reconocido");
  });

  it("reconoce también respuestas que no son objeto, y la validación decide", () => {
    expect(clasificarTipoUsuario(null)).toBe("reconocido");
    expect(clasificarTipoUsuario("texto")).toBe("reconocido");
  });
});

describe("clasificarValidacion", () => {
  it("acepta cuando SIIAU devuelve un nombre", () => {
    expect(clasificarValidacion({ nombre: "Ana López" })).toBe("aceptada");
  });

  it("rechaza con respuesta false, aunque venga un nombre", () => {
    expect(clasificarValidacion({ respuesta: false })).toBe("rechazada");
    expect(clasificarValidacion({ respuesta: false, nombre: "Ana López" })).toBe("rechazada");
  });

  it("trata como inesperado un nombre vacío o ausente", () => {
    expect(clasificarValidacion({ nombre: "" })).toBe("inesperada");
    expect(clasificarValidacion({})).toBe("inesperada");
    expect(clasificarValidacion({ respuesta: true })).toBe("inesperada");
  });

  it("trata como inesperado lo que no es objeto", () => {
    expect(clasificarValidacion(null)).toBe("inesperada");
    expect(clasificarValidacion(undefined)).toBe("inesperada");
    expect(clasificarValidacion("ok")).toBe("inesperada");
  });
});

describe("decisionSiConexionFalla", () => {
  it("usa la copia local si existe", () => {
    expect(decisionSiConexionFalla(true)).toBe("usar-copia-local");
  });

  it("no deja entrar si es la primera vez", () => {
    expect(decisionSiConexionFalla(false)).toBe("sin-copia");
  });
});
