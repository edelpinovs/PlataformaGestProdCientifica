import { describe, expect, it } from "vitest";
import { claveNombre, cruzarRenglones, type ProfesorCruce, type RenglonCruce } from "./cruce";

// RF-018: datos inventados; ningún profesor real.
const ana: ProfesorCruce = { id: 1, cvu: "900001", codigo: "2001001", nombres: "Ana María", apellidos: "Pérez López" };
const luis: ProfesorCruce = { id: 2, cvu: null, codigo: "2001002", nombres: "Luis", apellidos: "Mora Díaz" };
const juan1: ProfesorCruce = { id: 3, cvu: null, codigo: "2001003", nombres: "Juan", apellidos: "Ruiz Soto" };
const juan2: ProfesorCruce = { id: 4, cvu: null, codigo: "2001004", nombres: "Juan", apellidos: "Ruiz Soto" };

const renglon = (datos: Partial<RenglonCruce>): RenglonCruce => ({
  cvu: null, codigo: null, apellidoPaterno: null, apellidoMaterno: null, nombres: "", ...datos,
});

describe("claveNombre", () => {
  it("quita acentos, signos y mayúsculas, y ordena las palabras", () => {
    expect(claveNombre("PÉREZ  López, Ana-María")).toBe("ana lopez maria perez");
    expect(claveNombre("Ana María Pérez López")).toBe(claveNombre("Pérez López Ana María"));
  });
});

describe("cruzarRenglones (RF-018)", () => {
  it("el CVU manda aunque el nombre no coincida", () => {
    const { cruces } = cruzarRenglones([renglon({ cvu: "900001", nombres: "OTRA PERSONA" })], [ana, luis]);
    expect(cruces).toEqual([{ profesorId: 1, criterio: "CVU" }]);
  });

  it("usa el código cuando no hay CVU", () => {
    const { cruces } = cruzarRenglones([renglon({ codigo: "2001002", nombres: "X" })], [ana, luis]);
    expect(cruces).toEqual([{ profesorId: 2, criterio: "CODIGO" }]);
  });

  it("un CVU que no está en el directorio sigue con el código y luego con el nombre", () => {
    const { cruces } = cruzarRenglones([
      renglon({ cvu: "123", codigo: "2001002", nombres: "X" }),
      renglon({ cvu: "123", apellidoPaterno: "MORA", apellidoMaterno: "DIAZ", nombres: "LUIS" }),
    ], [ana, luis]);
    expect(cruces).toEqual([{ profesorId: 2, criterio: "CODIGO" }, { profesorId: 2, criterio: "NOMBRE" }]);
  });

  it("coincide por nombre aunque el archivo lo traiga en una sola columna y en otro orden", () => {
    const { cruces } = cruzarRenglones([renglon({ nombres: "ANA MARÍA PÉREZ LÓPEZ" })], [ana, luis]);
    expect(cruces).toEqual([{ profesorId: 1, criterio: "NOMBRE" }]);
  });

  it("un nombre que comparten dos profesores queda dudoso y sin profesor", () => {
    const { cruces } = cruzarRenglones([renglon({ apellidoPaterno: "Ruiz", apellidoMaterno: "Soto", nombres: "Juan" })], [juan1, juan2]);
    expect(cruces).toEqual([{ profesorId: null, criterio: "AMBIGUO" }]);
  });

  it("solo cruza con los profesores que recibe (los activos): un CVU ajeno no coincide", () => {
    const { cruces } = cruzarRenglones([renglon({ cvu: "900001", nombres: "Nadie" })], [luis]);
    expect(cruces).toEqual([{ profesorId: null, criterio: "SIN_COINCIDENCIA" }]);
  });

  it("resume coincidencias, dudosos y sin coincidencia", () => {
    const { resumen } = cruzarRenglones([
      renglon({ cvu: "900001", nombres: "X" }),
      renglon({ codigo: "2001002", nombres: "X" }),
      renglon({ nombres: "Juan Ruiz Soto" }),
      renglon({ nombres: "Nadie Nunca" }),
    ], [ana, luis, juan1, juan2]);
    expect(resumen).toEqual({ coincidencias: 2, dudosos: 1, sinCoincidencia: 1 });
  });
});
