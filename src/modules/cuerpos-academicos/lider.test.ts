import { describe, expect, it } from "vitest";
import { designarLider, mensajeTrasDesignar, revisarDesignacionLider } from "./lider";

const ana = { profesorId: 1, nombre: "López Ana (TC01)" };
const luis = { profesorId: 2, nombre: "Pérez Luis (TC02)" };

describe("designarLider (RF-014)", () => {
  it("exige un integrante", () => {
    const resultado = designarLider.safeParse({ cuerpoId: "1", profesorId: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe("Elige un integrante.");
    }
  });

  it("convierte los identificadores a número", () => {
    expect(designarLider.parse({ cuerpoId: "4", profesorId: "12" })).toEqual({ cuerpoId: 4, profesorId: 12 });
  });
});

describe("revisarDesignacionLider (RF-014)", () => {
  it("rechaza si el CA no tiene integrantes", () => {
    expect(revisarDesignacionLider(1, [])).toEqual({
      mensaje: "Primero asigna integrantes. El líder debe ser integrante de este cuerpo académico.",
    });
  });

  it("rechaza si no se eligió a nadie", () => {
    expect(revisarDesignacionLider(undefined, [ana])).toEqual({
      mensaje: "Elige un integrante.",
    });
  });

  it("rechaza a quien no es integrante", () => {
    expect(revisarDesignacionLider(9, [ana, luis])).toEqual({
      mensaje: "Esa persona no es integrante de este cuerpo académico. Elige a alguien de la lista.",
    });
  });

  it("acepta a un integrante aunque ya haya líder (sigue habiendo uno solo)", () => {
    expect(revisarDesignacionLider(2, [ana, luis])).toBeNull();
  });

  it("acepta volver a designar al mismo integrante", () => {
    expect(revisarDesignacionLider(1, [ana])).toBeNull();
  });
});

describe("mensajeTrasDesignar (RF-014)", () => {
  it("confirma el alta del líder", () => {
    expect(mensajeTrasDesignar("López Ana (TC01)", false)).toBe(
      "Se designó a López Ana (TC01) como líder.",
    );
  });

  it("confirma si ya era el líder", () => {
    expect(mensajeTrasDesignar("López Ana (TC01)", true)).toBe(
      "López Ana (TC01) ya es el líder de este cuerpo académico.",
    );
  });
});
