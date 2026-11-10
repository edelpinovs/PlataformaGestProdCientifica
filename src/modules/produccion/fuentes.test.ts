import { describe, expect, it } from "vitest";
import { FUENTES_ESCANEO, seleccionFuentesEsquema } from "./fuentes";

describe("selección de fuentes (#167)", () => {
  for (let mascara = 1; mascara < 32; mascara++) {
    const elegidas = FUENTES_ESCANEO.filter((_,i) => mascara & (1 << i));
    it(`admite la combinación ${mascara}: ${elegidas.join(", ")}`, () => {
      expect(seleccionFuentesEsquema.parse([...elegidas].reverse())).toEqual(elegidas);
    });
  }
  it("normaliza repetidas y rechaza ausencia, valores desconocidos y envío manipulado en español", () => {
    expect(seleccionFuentesEsquema.parse(["ORCID","ORCID"])).toEqual(["ORCID"]);
    for (const dato of [[],null,"ORCID",["OTRA"],[NaN]]) {
      const resultado=seleccionFuentesEsquema.safeParse(dato); expect(resultado.success).toBe(false);
      if (!resultado.success) expect(resultado.error.issues[0].message).toMatch(/Selecciona/);
    }
  });
});
