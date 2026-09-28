import { describe, expect, it } from "vitest";
import { calcularSemaforo } from "./semaforo";

const hoy = new Date("2026-09-28");

describe("calcularSemaforo (RF-026)", () => {
  it("marca en rojo una vigencia vencida", () => {
    expect(calcularSemaforo(new Date("2026-09-27"), hoy)).toBe("ROJO");
  });

  it("marca en amarillo una vigencia que vence en 12 meses o menos", () => {
    expect(calcularSemaforo(new Date("2026-12-31"), hoy)).toBe("AMARILLO");
    expect(calcularSemaforo(new Date("2027-09-28"), hoy)).toBe("AMARILLO");
  });

  it("marca en verde una vigencia de más de 12 meses", () => {
    expect(calcularSemaforo(new Date("2030-12-31"), hoy)).toBe("VERDE");
  });
});
