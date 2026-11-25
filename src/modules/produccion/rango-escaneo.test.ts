import { describe, expect, it } from "vitest";
import { hoyMexico } from "./fechas-escaneo";
import {
  aniosDelRango, dentroDelRango, MAXIMO_ANIOS_RANGO, rangoDeAnio, rangoEfectivo, rangoSolicitudEsquema, textoRango,
} from "./rango-escaneo";

const rango = { desde: "2024-03-15", hasta: "2025-06-30" };

describe("rango de búsqueda del escaneo con fechas completas (#266)", () => {
  it("consulta los años que abarca el rango", () => {
    expect(aniosDelRango(rango)).toEqual({ desde: 2024, hasta: 2025 });
  });

  it("incluye ambos extremos y excluye el día anterior y el posterior", () => {
    const fecha = (dia: string) => ({ fechaPublicacion: new Date(`${dia}T00:00:00Z`), anio: Number(dia.slice(0, 4)) });
    expect(dentroDelRango(fecha("2024-03-15"), rango)).toBe(true);
    expect(dentroDelRango(fecha("2025-06-30"), rango)).toBe(true);
    expect(dentroDelRango(fecha("2024-03-14"), rango)).toBe(false);
    expect(dentroDelRango(fecha("2025-07-01"), rango)).toBe(false);
  });

  it("un 1 de enero es precisión anual (Google Scholar, Crossref): cuenta el año, no el día", () => {
    expect(dentroDelRango({ fechaPublicacion: new Date("2024-01-01T00:00:00Z"), anio: 2024 }, rango)).toBe(true);
    expect(dentroDelRango({ fechaPublicacion: new Date("2023-01-01T00:00:00Z"), anio: 2023 }, rango)).toBe(false);
    expect(dentroDelRango({ fechaPublicacion: new Date("2026-01-01T00:00:00Z"), anio: 2026 }, rango)).toBe(false);
  });

  it("si la fuente solo trae el año, basta con que esté dentro; sin fecha ni año se conserva para revisión", () => {
    expect(dentroDelRango({ fechaPublicacion: null, anio: 2024 }, rango)).toBe(true);
    expect(dentroDelRango({ fechaPublicacion: null, anio: 2023 }, rango)).toBe(false);
    expect(dentroDelRango({ fechaPublicacion: new Date("no es fecha"), anio: 2026 }, rango)).toBe(false);
    expect(dentroDelRango({}, rango)).toBe(true);
  });

  it("un trabajo anterior con un solo año equivale al año completo; uno sin rango busca novedades", () => {
    expect(rangoDeAnio(2024)).toEqual({ desde: "2024-01-01", hasta: "2024-12-31" });
    expect(rangoEfectivo({ anio: 2024 })).toEqual({ desde: "2024-01-01", hasta: "2024-12-31" });
    expect(rangoEfectivo({ desde: "2024-03-15", hasta: "2025-06-30", anio: 2020 })).toEqual(rango);
    expect(rangoEfectivo({})).toBeUndefined();
  });

  it("muestra el rango con fechas en formato de México", () => {
    expect(textoRango(rango)).toBe("del 15/03/2024 al 30/06/2025");
  });

  describe("validación del formulario", () => {
    const esquema = rangoSolicitudEsquema("2026-11-24");
    it("sin fechas no hay rango; solo «Desde» busca hasta hoy", () => {
      expect(esquema.parse({ desde: "", hasta: "" })).toBeUndefined();
      expect(esquema.parse({ desde: "2026-01-01", hasta: "" })).toEqual({ desde: "2026-01-01", hasta: "2026-11-24" });
      expect(esquema.parse({ desde: "2025-01-01", hasta: "2025-01-01" })).toEqual({ desde: "2025-01-01", hasta: "2025-01-01" });
    });
    it(`acepta hasta ${MAXIMO_ANIOS_RANGO} años calendario y rechaza uno más`, () => {
      expect(esquema.safeParse({ desde: "2016-01-01", hasta: "2025-12-31" }).success).toBe(true);
      expect(esquema.safeParse({ desde: "2015-12-31", hasta: "2025-01-01" }).success).toBe(false);
    });
    it.each([
      [{ desde: "1989-12-31", hasta: "1990-12-31" }, "desde", "La fecha inicial no puede ser anterior al 01/01/1990."],
      [{ desde: "2027-01-01", hasta: "2028-01-01" }, "hasta", "La fecha final no puede ser posterior al 31/12/2027."],
      [{ desde: "2025-13-01", hasta: "" }, "desde", "Indica una fecha válida."],
      [{ desde: "0000-01-01", hasta: "" }, "desde", "Indica una fecha válida."],
      [{ desde: "2025-01-01", hasta: "mañana" }, "hasta", "Indica una fecha válida."],
    ])("rechaza %j con mensaje en español", (datos, campo, mensaje) => {
      const resultado = esquema.safeParse(datos);
      expect(resultado.success).toBe(false);
      if (!resultado.success) expect(resultado.error.issues).toContainEqual(expect.objectContaining({ path: [campo], message: mensaje }));
    });
  });

  it("la fecha de hoy se calcula en Ciudad de México", () => {
    expect(hoyMexico(new Date("2027-01-01T05:30:00Z"))).toBe("2026-12-31");
    expect(hoyMexico(new Date("2027-01-01T06:00:00Z"))).toBe("2027-01-01");
  });
});
