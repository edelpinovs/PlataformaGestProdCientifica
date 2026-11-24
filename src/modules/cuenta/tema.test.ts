import { describe, expect, it } from "vitest";
import { cookieTema, DURACION_COOKIE_TEMA, ETIQUETA_TEMA, esTema, TEMAS, temaDe, temaGuardado, validarTema } from "./tema";

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

  it("validarTema acepta claro y oscuro y rechaza lo demás con un mensaje en español", () => {
    expect(validarTema("oscuro")).toEqual({ ok: true, tema: "oscuro" });
    expect(validarTema("claro")).toEqual({ ok: true, tema: "claro" });
    for (const valor of ["sistema", "OSCURO", "", null, undefined, 1, {}]) {
      expect(validarTema(valor)).toEqual({ ok: false, error: "Elige el tema claro o el oscuro." });
    }
  });

  it("temaGuardado devuelve el tema del perfil o null si no hay uno válido", () => {
    expect(temaGuardado("oscuro")).toBe("oscuro");
    expect(temaGuardado(null)).toBeNull();
    expect(temaGuardado("sistema")).toBeNull();
  });

  it("la cookie dura un año", () => {
    expect(DURACION_COOKIE_TEMA).toBe(365 * 24 * 60 * 60);
  });
});
