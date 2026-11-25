import { describe, expect, it } from "vitest";
import {
  capitalizarNombre,
  codigoPendiente,
  correoPendiente,
  informePlan,
  prepararCarga,
  type EstadoBase,
} from "./cargar-profesores";
import type { PersonaImportable } from "./importar-profesores";

const persona = (parcial: Partial<PersonaImportable> = {}): PersonaImportable => ({
  apellidos: "SOLÍS VERA",
  nombres: "LORENA",
  orcid: null,
  scholarId: null,
  scopusId: null,
  departamento: null,
  ...parcial,
});

const baseVacia: EstadoBase = { departamentos: [], profesores: [] };

describe("capitalizarNombre", () => {
  it("convierte MAYÚSCULAS a nombre propio y deja las partículas en minúscula", () => {
    expect(capitalizarNombre("ABUNDIS GUTIÉRREZ")).toBe("Abundis Gutiérrez");
    expect(capitalizarNombre("DE LA TORRE GÓMORA")).toBe("De la Torre Gómora");
    expect(capitalizarNombre("MARÍA DEL ROSARIO")).toBe("María del Rosario");
    expect(capitalizarNombre("MA. DEL REFUGIO")).toBe("Ma. del Refugio");
  });

  it("respeta lo que ya viene con mayúsculas y minúsculas y limpia espacios", () => {
    expect(capitalizarNombre("Roxana  Paola ")).toBe("Roxana Paola");
    expect(capitalizarNombre("O'BRIEN-RUIZ")).toBe("O'Brien-Ruiz");
  });
});

describe("marcas de lo pendiente", () => {
  it("el código y el correo comparten el número y llevan la marca", () => {
    expect(codigoPendiente(7)).toBe("PEND-0007");
    expect(correoPendiente(7)).toBe("pend-0007@pendiente.invalid");
  });
});

describe("prepararCarga", () => {
  it("asigna códigos y correos consecutivos, en orden alfabético estable", () => {
    const plan = prepararCarga(
      [persona({ apellidos: "ZAMORA", nombres: "ANA" }), persona({ apellidos: "ÁVILA", nombres: "BETO" })],
      baseVacia,
    );
    expect(plan.cargar.map((p) => [p.codigo, p.apellidos])).toEqual([
      ["PEND-0001", "Ávila"],
      ["PEND-0002", "Zamora"],
    ]);
    expect(plan.cargar[0].correo).toBe("pend-0001@pendiente.invalid");
    expect(plan.cargar[0].nombreNormalizado).toBe("avila beto");
  });

  it("continúa la numeración después del código PEND- más alto que ya exista", () => {
    const base: EstadoBase = {
      departamentos: [],
      profesores: [{ codigo: "PEND-0041", nombreNormalizado: "otra persona", orcid: null, scholarId: null, scopusId: null },
        { codigo: "ABC123", nombreNormalizado: "real persona", orcid: null, scholarId: null, scopusId: null }],
    };
    expect(prepararCarga([persona()], base).cargar[0].codigo).toBe("PEND-0042");
  });

  it("omite a quien ya existe por nombre, sin importar acentos ni mayúsculas, para poder repetir la carga", () => {
    const base: EstadoBase = {
      departamentos: [],
      profesores: [{ codigo: "PEND-0001", nombreNormalizado: "solis vera lorena", orcid: null, scholarId: null, scopusId: null }],
    };
    const plan = prepararCarga([persona()], base);
    expect(plan.cargar).toHaveLength(0);
    expect(plan.omitidos).toEqual(["Solís Vera, Lorena"]);
  });

  it("deja vacío un identificador que ya tiene otra persona en la base y lo anota", () => {
    const base: EstadoBase = {
      departamentos: [],
      profesores: [{ codigo: "ABC1", nombreNormalizado: "otra persona", orcid: "0000-0001-0000-0001", scholarId: "AbCdE12345", scopusId: "11112222" }],
    };
    const plan = prepararCarga(
      [persona({ orcid: "0000-0001-0000-0001", scholarId: "abcde12345", scopusId: "11112222" })],
      base,
    );
    expect(plan.cargar[0]).toMatchObject({ orcid: null, scholarId: null, scopusId: null });
    expect(plan.ajustes.map((a) => a.campo)).toEqual(["orcid", "scholarId", "scopusId"]);
  });

  it("conserva los identificadores que no chocan", () => {
    const plan = prepararCarga([persona({ orcid: "0000-0001-0000-0002", scopusId: "33334444" })], baseVacia);
    expect(plan.cargar[0]).toMatchObject({ orcid: "0000-0001-0000-0002", scopusId: "33334444" });
    expect(plan.ajustes).toHaveLength(0);
  });

  it("asigna el departamento sin importar acentos ni mayúsculas y cuenta los que faltan", () => {
    const base: EstadoBase = { departamentos: [{ id: 5, nombre: "Departamento de Ciencias de la Salud" }], profesores: [] };
    const plan = prepararCarga(
      [
        persona({ apellidos: "A", nombres: "UNO", departamento: "departamento de ciencias de la salud" }),
        persona({ apellidos: "B", nombres: "DOS", departamento: "Departamento de Artes" }),
        persona({ apellidos: "C", nombres: "TRES", departamento: "Departamento de Artes" }),
        persona({ apellidos: "D", nombres: "CUATRO", departamento: null }),
      ],
      base,
    );
    expect(plan.cargar.map((p) => p.departamentoId)).toEqual([5, null, null, null]);
    expect([...plan.departamentosFaltantes]).toEqual([["Departamento de Artes", 2]]);
  });

  it("el informe incluye nombres y resume lo que se hará", () => {
    const plan = prepararCarga([persona()], baseVacia);
    const texto = informePlan(plan);
    expect(texto).toContain("A crear: 1");
    expect(texto).toContain("PEND-0001 · Solís Vera, Lorena");
  });
});
