import { describe, expect, it } from "vitest";
import { texto } from "./comun";

describe("texto", () => {
  const disciplina = texto("La disciplina", 20);

  it("limpia espacios sobrantes", () => {
    expect(disciplina.parse("  Física   teórica ")).toBe("Física teórica");
  });

  it("exige un valor", () => {
    const resultado = disciplina.safeParse("   ");
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0].message).toBe("La disciplina es obligatorio.");
  });

  it("respeta el tope de longitud", () => {
    const resultado = disciplina.safeParse("Astrofísica estelar de alta energía");
    expect(resultado.success).toBe(false);
    if (!resultado.success)
      expect(resultado.error.issues[0].message).toBe("La disciplina admite como máximo 20 caracteres.");
  });
});
