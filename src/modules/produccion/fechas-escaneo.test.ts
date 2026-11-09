import { describe, expect, it } from "vitest";
import { fechaEscaneo, ZONA_FECHAS_ESCANEO } from "./fechas-escaneo";

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
