import { describe, expect, it } from "vitest";
import {
  mensajeGuardado,
  mensajeVerificacion,
  validarCambioContrasena,
} from "./contrasena";

const valido = { actual: "ClaveVieja1", nueva: "ClaveNueva2", confirmacion: "ClaveNueva2" };

describe("validarCambioContrasena", () => {
  it("acepta una contraseña nueva distinta de la actual y confirmada", () => {
    const r = validarCambioContrasena(valido);
    expect(r).toEqual({ ok: true, datos: valido });
  });

  it("pide la contraseña actual cuando falta o está vacía", () => {
    for (const actual of [null, undefined, ""]) {
      const r = validarCambioContrasena({ ...valido, actual });
      expect(r).toEqual({ ok: false, campo: "actual", error: "Escribe tu contraseña actual." });
    }
  });

  it("pide la nueva contraseña cuando falta", () => {
    const r = validarCambioContrasena({ ...valido, nueva: null });
    expect(r).toEqual({ ok: false, campo: "nueva", error: "Escribe la nueva contraseña." });
  });

  it("exige al menos 8 caracteres", () => {
    const r = validarCambioContrasena({ ...valido, nueva: "Corta1", confirmacion: "Corta1" });
    expect(r).toEqual({
      ok: false,
      campo: "nueva",
      error: "La nueva contraseña debe tener al menos 8 caracteres.",
    });
  });

  it("no acepta más de 72 caracteres", () => {
    const larga = "a".repeat(73);
    const r = validarCambioContrasena({ ...valido, nueva: larga, confirmacion: larga });
    expect(r).toEqual({
      ok: false,
      campo: "nueva",
      error: "La contraseña no puede tener más de 72 caracteres.",
    });
  });

  it("rechaza una contraseña nueva igual a la actual", () => {
    const r = validarCambioContrasena({ actual: "MismaClave1", nueva: "MismaClave1", confirmacion: "MismaClave1" });
    expect(r).toEqual({
      ok: false,
      campo: "nueva",
      error: "La nueva contraseña debe ser distinta de la actual.",
    });
  });

  it("rechaza una confirmación que no coincide", () => {
    const r = validarCambioContrasena({ ...valido, confirmacion: "OtraClave3" });
    expect(r).toEqual({ ok: false, campo: "confirmacion", error: "Las contraseñas no coinciden." });
  });

  it("pide la confirmación cuando falta", () => {
    const r = validarCambioContrasena({ ...valido, confirmacion: undefined });
    expect(r).toEqual({ ok: false, campo: "confirmacion", error: "Repite la nueva contraseña." });
  });

  it("ante valores que no son texto (envío manipulado) responde en español", () => {
    const r = validarCambioContrasena({ actual: 123, nueva: { a: 1 }, confirmacion: NaN });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toMatch(/invalid|expected|received/i);
  });

  it("ningún mensaje de validación llega en inglés", () => {
    const entradas = [
      {},
      { actual: "x" },
      { actual: "x", nueva: "y" },
      { actual: 1, nueva: 2, confirmacion: 3 },
      { actual: "x", nueva: "y".repeat(8), confirmacion: ["z"] },
    ];
    for (const entrada of entradas) {
      const r = validarCambioContrasena(entrada);
      if (!r.ok) expect(r.error).not.toMatch(/invalid|expected|received|required|string/i);
    }
  });
});

describe("mensajeVerificacion", () => {
  it("dice que la contraseña actual no es correcta solo con credenciales inválidas", () => {
    expect(mensajeVerificacion("invalid_credentials")).toEqual({
      campo: "actual",
      error: "La contraseña actual no es correcta.",
    });
  });

  it("ante cualquier otro código no culpa a la persona", () => {
    for (const codigo of ["over_request_rate_limit", "unexpected_failure", undefined]) {
      const r = mensajeVerificacion(codigo);
      expect(r.campo).toBeUndefined();
      expect(r.error).toBe("No se pudo comprobar tu contraseña actual. Inténtalo de nuevo en unos minutos.");
    }
  });
});

describe("mensajeGuardado", () => {
  it("traduce una contraseña débil", () => {
    expect(mensajeGuardado("weak_password")).toEqual({
      campo: "nueva",
      error: "La contraseña es demasiado débil. Usa una más larga o variada.",
    });
  });

  it("traduce una contraseña igual a la anterior", () => {
    expect(mensajeGuardado("same_password")).toEqual({
      campo: "nueva",
      error: "La nueva contraseña debe ser distinta de la actual.",
    });
  });

  it("ante otro error responde con un mensaje propio", () => {
    expect(mensajeGuardado("unexpected_failure")).toEqual({
      error: "No se pudo guardar la contraseña. Inténtalo de nuevo en unos minutos.",
    });
    expect(mensajeGuardado(undefined).error).toMatch(/^No se pudo guardar/);
  });
});
