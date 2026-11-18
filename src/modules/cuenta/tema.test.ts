import { describe, expect, it } from "vitest";
import { cookieTema, ETIQUETA_TEMA, esTema, TEMAS, temaDe } from "./tema";

describe("tema", () => {
  it("solo hay claro y oscuro (no se sigue el tema del sistema operativo)", () => {
    expect(TEMAS).toEqual(["claro", "oscuro"]);
  });

  it("esTema reconoce solo los valores válidos", () => {
    expect(esTema("claro")).toBe(true);
    expect(esTema("oscuro")).toBe(true);
    for (const valor of ["sistema", "Oscuro", "", null, undefined, 1, {}]) {
      expect(esTema(valor)).toBe(false);
    }
  });

  it("temaDe usa claro cuando el valor no es válido o falta", () => {
    expect(temaDe("oscuro")).toBe("oscuro");
    expect(temaDe("claro")).toBe("claro");
    expect(temaDe("sistema")).toBe("claro");
    expect(temaDe(null)).toBe("claro");
    expect(temaDe(undefined)).toBe("claro");
  });

  it("cookieTema escribe la misma cookie que lee el script de layout.tsx", () => {
    const cookie = cookieTema("oscuro");
    expect(cookie).toBe("tema=oscuro; path=/; max-age=31536000; SameSite=Lax");
    // El script de src/app/layout.tsx solo acepta tema=(claro|oscuro).
    expect(cookie).toMatch(/^tema=(claro|oscuro);/);
  });

  it("tiene una etiqueta en español para cada tema", () => {
    expect(ETIQUETA_TEMA).toEqual({ claro: "Claro", oscuro: "Oscuro" });
  });
});
