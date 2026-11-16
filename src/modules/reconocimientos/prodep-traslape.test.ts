import { describe, expect, it } from "vitest";
import { hayTraslapeProdep, type PeriodoProdep } from "./prodep";

function fecha(dia: string) {
  return new Date(`${dia}T00:00:00.000Z`);
}

const nuevo: PeriodoProdep = {
  inicio: fecha("2026-03-01"),
  fin: fecha("2026-03-10"),
  resultado: "APROBADO",
};

function periodo(
  inicio: string,
  fin: string,
  resultado: PeriodoProdep["resultado"] = "APROBADO",
  id = 1,
): PeriodoProdep {
  return { id, inicio: fecha(inicio), fin: fecha(fin), resultado };
}

describe("hayTraslapeProdep (RF-011)", () => {
  it("rechaza un traslape parcial", () => {
    expect(hayTraslapeProdep([periodo("2026-03-05", "2026-03-15")], nuevo)).not.toBeNull();
  });

  it("rechaza periodos idénticos", () => {
    expect(hayTraslapeProdep([periodo("2026-03-01", "2026-03-10")], nuevo)).not.toBeNull();
  });

  it("rechaza un periodo contenido dentro del existente", () => {
    expect(hayTraslapeProdep([periodo("2026-02-20", "2026-03-20")], nuevo)).not.toBeNull();
  });

  it("rechaza periodos que comparten el día límite en cualquiera de sus extremos", () => {
    expect(hayTraslapeProdep([periodo("2026-02-20", "2026-03-01")], nuevo)).not.toBeNull();
    expect(hayTraslapeProdep([periodo("2026-03-10", "2026-03-20")], nuevo)).not.toBeNull();
  });

  it("permite periodos consecutivos sin compartir un día", () => {
    const consecutivo = { inicio: fecha("2027-01-01"), fin: fecha("2027-12-31"), resultado: "APROBADO" as const };
    expect(hayTraslapeProdep([periodo("2026-01-01", "2026-12-31")], consecutivo)).toBeNull();
  });

  it("permite editar el mismo registro sin cambiar sus fechas", () => {
    expect(hayTraslapeProdep([periodo("2026-03-01", "2026-03-10", "APROBADO", 7)], nuevo, 7)).toBeNull();
  });

  it("ignora un registro no aprobado sin reconsideración", () => {
    expect(hayTraslapeProdep([periodo("2026-03-01", "2026-03-10", "NO_APROBADO")], nuevo)).toBeNull();
  });

  it.each(["APROBADO", "EN_RECONSIDERACION"] as const)("rechaza un periodo existente %s", (resultado) => {
    expect(hayTraslapeProdep([periodo("2026-03-01", "2026-03-10", resultado)], nuevo)).not.toBeNull();
  });

  it("no bloquea el registro de un dictamen nuevo no aprobado", () => {
    expect(hayTraslapeProdep(
      [periodo("2026-03-01", "2026-03-10")],
      { ...nuevo, resultado: "NO_APROBADO" },
    )).toBeNull();
  });
});
