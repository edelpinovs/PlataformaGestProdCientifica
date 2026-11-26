import { describe, expect, it } from "vitest";
import { fechaEnMexico, formatoFechaAlta, inicioDelDiaMexico, rangoFechaBusqueda, rangoPeriodo } from "./fechas";

describe("fechas del panel en hora de Ciudad de México (#276)", () => {
  it("el día empieza a las 06:00 UTC (Ciudad de México no tiene horario de verano desde 2022)", () => {
    expect(inicioDelDiaMexico(2026, 11, 24)).toEqual(new Date("2026-11-24T06:00:00Z"));
  });

  it("respeta el horario de verano que sí tenían las fechas anteriores a 2023", () => {
    expect(inicioDelDiaMexico(2022, 7, 1)).toEqual(new Date("2022-07-01T05:00:00Z"));
  });

  it("busca un día completo en hora de México", () => {
    expect(rangoFechaBusqueda("2026-11-24")).toEqual({
      desde: new Date("2026-11-24T06:00:00Z"),
      hasta: new Date("2026-11-25T06:00:00Z"),
    });
  });

  it("un alta a las 23:30 del 24 en México cae en el día 24, aunque en UTC ya sea el 25", () => {
    const alta = new Date("2026-11-25T05:30:00Z");
    const { desde, hasta } = rangoFechaBusqueda("2026-11-24")!;
    expect(alta >= desde && alta < hasta).toBe(true);
    expect(formatoFechaAlta.format(alta)).toBe(formatoFechaAlta.format(new Date("2026-11-24T18:00:00Z")));
  });

  it("busca un mes y un año completos, también al cambiar de año", () => {
    expect(rangoFechaBusqueda("2026-12")).toEqual({
      desde: new Date("2026-12-01T06:00:00Z"),
      hasta: new Date("2027-01-01T06:00:00Z"),
    });
    expect(rangoFechaBusqueda("2026")).toEqual({
      desde: new Date("2026-01-01T06:00:00Z"),
      hasta: new Date("2027-01-01T06:00:00Z"),
    });
    expect(rangoFechaBusqueda("2026-12-31")?.hasta).toEqual(new Date("2027-01-01T06:00:00Z"));
  });

  it("acepta espacios alrededor", () => {
    expect(rangoFechaBusqueda(" 2026-11 ")).toEqual(rangoFechaBusqueda("2026-11"));
  });

  it("un texto que no es fecha, o una fecha que no existe, no es un periodo", () => {
    for (const texto of ["", "ana", "2026-13", "2026-00", "2026-02-30", "2026-11-31", "24/11/2026", "20261124", "0000"]) {
      expect(rangoFechaBusqueda(texto), texto).toBeNull();
    }
  });

  it("acepta el 29 de febrero solo en año bisiesto", () => {
    expect(rangoFechaBusqueda("2028-02-29")).not.toBeNull();
    expect(rangoFechaBusqueda("2027-02-29")).toBeNull();
  });
});

describe("periodos relativos en hora de Ciudad de México (#277)", () => {
  const iso = (r: { desde: Date; hasta: Date }) => [r.desde.toISOString(), r.hasta.toISOString()];

  it("la fecha de México puede ir un día detrás de UTC", () => {
    expect(fechaEnMexico(new Date("2026-11-25T05:30:00Z"))).toEqual({ anio: 2026, mes: 11, dia: 24 });
    expect(fechaEnMexico(new Date("2026-11-25T06:00:00Z"))).toEqual({ anio: 2026, mes: 11, dia: 25 });
  });

  it("«Hoy» es el día completo y termina en el inicio de mañana", () => {
    expect(iso(rangoPeriodo("HOY", new Date("2026-11-24T20:00:00Z")))).toEqual(["2026-11-24T06:00:00.000Z", "2026-11-25T06:00:00.000Z"]);
  });

  it("«Últimos 7 días» incluye hoy y cruza el cambio de mes y de año", () => {
    expect(iso(rangoPeriodo("7_DIAS", new Date("2027-01-03T18:00:00Z")))).toEqual(["2026-12-28T06:00:00.000Z", "2027-01-04T06:00:00.000Z"]);
  });

  it("«Últimos 30 días» incluye hoy y los 29 anteriores", () => {
    expect(iso(rangoPeriodo("30_DIAS", new Date("2026-03-01T18:00:00Z")))).toEqual(["2026-01-31T06:00:00.000Z", "2026-03-02T06:00:00.000Z"]);
  });

  it("«Este mes» empieza el día 1 y llega hasta el inicio de mañana, también el 31 de diciembre", () => {
    expect(iso(rangoPeriodo("MES", new Date("2026-12-31T20:00:00Z")))).toEqual(["2026-12-01T06:00:00.000Z", "2027-01-01T06:00:00.000Z"]);
  });
});
