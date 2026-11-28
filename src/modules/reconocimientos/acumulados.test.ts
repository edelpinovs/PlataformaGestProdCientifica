import { describe, expect, it } from "vitest";
import { calcularAcumuladosProfesor, type PeriodoReconocimientoAcumulado } from "./acumulados";

function periodo(
  inicio: string,
  fin: string,
  resultado: PeriodoReconocimientoAcumulado["resultado"] = "APROBADO",
  esRenovacion = false,
): PeriodoReconocimientoAcumulado {
  return {
    inicio: new Date(`${inicio}T00:00:00.000Z`),
    fin: new Date(`${fin}T00:00:00.000Z`),
    resultado,
    esRenovacion,
  };
}

describe("calcularAcumuladosProfesor (issue 250)", () => {
  it("suma periodos aprobados aunque estén interrumpidos", () => {
    const resultado = calcularAcumuladosProfesor(
      [
        periodo("2020-01-01", "2020-02-28"),
        periodo("2020-03-01", "2020-04-29", "APROBADO", true),
      ],
      [],
    );

    expect(resultado.snii).toEqual({ aniosAcumulados: 0.33, renovaciones: 1 });
    expect(resultado.prodep).toEqual({ aniosAcumulados: 0, renovaciones: 0 });
  });

  it("fusiona periodos solapados y cuenta los días inclusivos una sola vez", () => {
    const resultado = calcularAcumuladosProfesor(
      [
        periodo("2020-01-01", "2020-10-31"),
        periodo("2020-04-01", "2020-12-31", "APROBADO", true),
      ],
      [],
    );

    expect(resultado.snii).toEqual({ aniosAcumulados: 1, renovaciones: 1 });
  });

  it("devuelve cero para programas sin registros", () => {
    expect(calcularAcumuladosProfesor([], [])).toEqual({
      snii: { aniosAcumulados: 0, renovaciones: 0 },
      prodep: { aniosAcumulados: 0, renovaciones: 0 },
    });
  });

  it("calcula un solo periodo aprobado con sus dos extremos inclusivos", () => {
    const resultado = calcularAcumuladosProfesor(
      [],
      [periodo("2020-01-01", "2020-12-31", "APROBADO", true)],
    );

    expect(resultado.prodep).toEqual({ aniosAcumulados: 1, renovaciones: 1 });
  });

  it("excluye del tiempo y renovaciones los periodos no aprobados", () => {
    const resultado = calcularAcumuladosProfesor(
      [
        periodo("2020-01-01", "2020-12-31"),
        periodo("2021-01-01", "2021-12-31", "NO_APROBADO", true),
        periodo("2022-01-01", "2022-12-31", "EN_RECONSIDERACION", true),
      ],
      [periodo("2020-01-01", "2020-12-31", "EN_RECONSIDERACION", true)],
    );

    expect(resultado.snii).toEqual({ aniosAcumulados: 1, renovaciones: 0 });
    expect(resultado.prodep).toEqual({ aniosAcumulados: 0, renovaciones: 0 });
  });
});
