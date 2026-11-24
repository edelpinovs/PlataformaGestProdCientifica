import { describe, expect, it } from "vitest";
import { debeEnriquecerAutores, FUENTES_ESCANEO, FUENTES_POR_OMISION, opcionEnriquecerEsquema, seleccionFuentesEsquema } from "./fuentes";

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

describe("fuentes por omisión y completar autores por DOI (#188)", () => {
  it("por omisión marca ORCID, OpenAlex y Scopus; Crossref y Google Scholar quedan opcionales", () => {
    expect(FUENTES_POR_OMISION).toEqual(["ORCID", "OPENALEX", "SCOPUS"]);
    expect(FUENTES_POR_OMISION).not.toContain("CROSSREF");
    expect(FUENTES_POR_OMISION).not.toContain("GOOGLE_SCHOLAR");
  });
  it("la casilla vale «si» marcada y falso si no se envía", () => {
    expect(opcionEnriquecerEsquema.parse("si")).toBe(true);
    expect(opcionEnriquecerEsquema.parse(null)).toBe(false);
    expect(opcionEnriquecerEsquema.parse(undefined)).toBe(false);
  });
  it.each(["on", "true", "", NaN, ["si"]])("rechaza un valor manipulado (%s) con mensaje en español", valor => {
    const resultado = opcionEnriquecerEsquema.safeParse(valor);
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0].message).toBe("La opción para completar autores no es válida.");
  });
  it("completar autores no depende de elegir Crossref como fuente", () => {
    expect(debeEnriquecerAutores({ fuentes: ["SCOPUS"], enriquecerAutores: true })).toBe(true);
    expect(debeEnriquecerAutores({ fuentes: ["SCOPUS", "CROSSREF"], enriquecerAutores: false })).toBe(false);
  });
  it("un trabajo guardado antes del cambio conserva su comportamiento", () => {
    expect(debeEnriquecerAutores({ fuentes: ["ORCID", "CROSSREF"] })).toBe(true);
    expect(debeEnriquecerAutores({ fuentes: ["ORCID"] })).toBe(false);
    expect(debeEnriquecerAutores({})).toBe(false);
  });
});
