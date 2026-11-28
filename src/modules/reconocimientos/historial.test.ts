import { describe, expect, it } from "vitest";
import { ordenarPeriodosProdep, ordenarPeriodosSnii } from "./historial";

function fecha(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

describe("historial de reconocimientos", () => {
  it("ordena los periodos SNII de antiguo a reciente", () => {
    const periodos = [
      { id: 3, nivel: "NIVEL_2" as const, tipoParticipacion: "RENOVACION" as const, resultado: "APROBADO" as const, inicio: fecha("2024-01-01"), fin: fecha("2026-12-31") },
      { id: 1, nivel: "NIVEL_1" as const, tipoParticipacion: "NUEVO_INGRESO" as const, resultado: "APROBADO" as const, inicio: fecha("2018-01-01"), fin: fecha("2020-12-31") },
      { id: 2, nivel: "NIVEL_1" as const, tipoParticipacion: "RENOVACION" as const, resultado: "APROBADO" as const, inicio: fecha("2021-01-01"), fin: fecha("2023-12-31") },
    ];

    expect(ordenarPeriodosSnii(periodos).map((periodo) => periodo.id)).toEqual([1, 2, 3]);
  });

  it("ordena los periodos PRODEP de antiguo a reciente y usa el id como desempate", () => {
    const periodos = [
      { id: 8, tipoSolicitud: "RENOVACION" as const, resultado: "APROBADO" as const, inicio: fecha("2023-01-01"), fin: fecha("2028-12-31") },
      { id: 4, tipoSolicitud: "PRIMER_RECONOCIMIENTO" as const, resultado: "APROBADO" as const, inicio: fecha("2017-01-01"), fin: fecha("2019-12-31") },
      { id: 7, tipoSolicitud: "RENOVACION" as const, resultado: "APROBADO" as const, inicio: fecha("2023-01-01"), fin: fecha("2028-12-31") },
    ];

    expect(ordenarPeriodosProdep(periodos).map((periodo) => periodo.id)).toEqual([4, 7, 8]);
  });
});
