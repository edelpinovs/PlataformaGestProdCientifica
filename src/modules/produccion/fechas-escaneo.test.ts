import { describe, expect, it } from "vitest";
import { anioActualMexico, fechaEscaneo, ZONA_FECHAS_ESCANEO } from "./fechas-escaneo";

describe("año en curso en Ciudad de México (#252, revisión del PR #289)", () => {
  it("el 31 de diciembre por la noche sigue siendo el mismo año, aunque en UTC ya cambió", () => {
    expect(anioActualMexico(new Date("2027-01-01T05:30:00Z"))).toBe(2026);
    expect(anioActualMexico(new Date("2026-12-31T18:00:00-06:00"))).toBe(2026);
  });
  it("cambia de año a la medianoche de Ciudad de México", () => {
    expect(anioActualMexico(new Date("2027-01-01T06:00:00Z"))).toBe(2027);
  });
});

describe("fechas de búsquedas manuales (#170)", () => {
  it("muestra la fecha de Ciudad de México, incluso al cambiar de día respecto de UTC", () => {
    expect(ZONA_FECHAS_ESCANEO).toBe("America/Mexico_City");
    expect(fechaEscaneo("2026-01-01T04:00:00Z")).toMatch(/31.*dic.*2025/);
    expect(fechaEscaneo("2026-01-01T04:00:00Z")).toContain("22:00");
  });
  it("no inventa fechas faltantes o inválidas", () => {
    for (const fecha of [null, undefined, "no válida"]) expect(fechaEscaneo(fecha)).toBe("Sin fecha registrada");
  });
});
