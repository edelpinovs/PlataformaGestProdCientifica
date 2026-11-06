import { describe, expect, it } from "vitest";
import { hayTraslape, type PeriodoVigencia } from "./vigencia";

function fecha(dia: string) {
  return new Date(`${dia}T00:00:00.000Z`);
}

const nuevo = { inicio: fecha("2026-03-01"), fin: fecha("2026-03-10") };

describe("hayTraslape", () => {
  it("considera inclusivo el día compartido entre periodos", () => {
    const existente = { id: 1, inicio: fecha("2026-02-20"), fin: fecha("2026-03-01") };
    expect(hayTraslape([existente], nuevo)).toBe(existente);
  });

  it("no considera traslape el día siguiente", () => {
    const existente = { id: 1, inicio: fecha("2026-02-20"), fin: fecha("2026-02-28") };
    expect(hayTraslape([existente], nuevo)).toBeNull();
  });

  it("detecta un periodo contenido", () => {
    const existente = { id: 1, inicio: fecha("2026-03-03"), fin: fecha("2026-03-05") };
    expect(hayTraslape([existente], nuevo)).toBe(existente);
  });

  it("omite el registro que se está editando", () => {
    const propio = { id: 7, ...nuevo };
    expect(hayTraslape([propio], nuevo, 7)).toBeNull();
  });

  it("compara periodos sin id incluso al editar otro registro", () => {
    const sinId: PeriodoVigencia = { inicio: fecha("2026-03-03"), fin: fecha("2026-03-05") };
    expect(hayTraslape([sinId], nuevo, 7)).toBe(sinId);
  });
});
