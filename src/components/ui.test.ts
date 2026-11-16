import { describe, expect, it } from "vitest";
import { inicialesDe } from "./ui";

describe("inicialesDe", () => {
  it("toma la inicial de las dos primeras palabras, en mayúscula", () => {
    expect(inicialesDe("Teresa Alarcón Martínez")).toBe("TA");
    expect(inicialesDe("ángel peña")).toBe("ÁP");
  });

  it("con una sola palabra devuelve una inicial y sin letras devuelve «?»", () => {
    expect(inicialesDe("Teresa")).toBe("T");
    expect(inicialesDe("  123 ")).toBe("?");
    expect(inicialesDe("")).toBe("?");
  });

  it("ignora comas y números sueltos", () => {
    expect(inicialesDe("Apellido 01, Nombre 02")).toBe("AN");
  });
});
