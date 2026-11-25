import { describe, expect, it } from "vitest";
import { departamento } from "../../src/modules/catalogos/departamentos";
import { division } from "../../src/modules/catalogos/divisiones";
import { prepararCarga } from "./cargar-profesores";
import {
  DEPARTAMENTOS_REALES,
  DIVISIONES_REALES,
  planearCatalogos,
  type BaseCatalogos,
} from "./catalogos-reales";

const baseVacia: BaseCatalogos = { divisiones: [], departamentos: [] };

describe("definiciones reales", () => {
  it("cumplen las mismas reglas que las pantallas de Divisiones y Departamentos", () => {
    for (const d of DIVISIONES_REALES) expect(division.safeParse(d).success).toBe(true);
    for (const d of DEPARTAMENTOS_REALES) {
      expect(departamento.safeParse({ nombre: d.nombre, nomenclatura: d.nomenclatura, divisionId: 1 }).success).toBe(true);
    }
  });

  it("cada departamento apunta a una división que se define aquí, y las claves no se repiten", () => {
    const claves = DIVISIONES_REALES.map((d) => d.clave);
    expect(new Set(claves).size).toBe(claves.length);
    for (const d of DEPARTAMENTOS_REALES) expect(claves).toContain(d.divisionClave);
    const nomenclaturas = DEPARTAMENTOS_REALES.map((d) => d.nomenclatura);
    expect(new Set(nomenclaturas).size).toBe(nomenclaturas.length);
  });
});

describe("planearCatalogos", () => {
  it("con la base vacía crea las tres divisiones y los tres departamentos", () => {
    const plan = planearCatalogos(baseVacia);
    expect(plan.divisionesNuevas.map((d) => d.clave)).toEqual(["EI", "SA", "SH"]);
    expect(plan.departamentosNuevos).toHaveLength(3);
    expect(plan.conflictos).toEqual([]);
  });

  it("se puede repetir: lo que ya existe (aunque cambien mayúsculas y acentos) no se crea otra vez", () => {
    const base: BaseCatalogos = {
      divisiones: [
        { id: 7, clave: "ei", nombre: "CENTRO UNIVERSITARIO DE CIENCIAS EXACTAS E INGENIERIAS" },
        { id: 8, clave: "SA", nombre: "Centro Universitario de Ciencias de la Salud" },
        { id: 9, clave: "SH", nombre: "Centro Universitario de Ciencias Sociales y Humanidades" },
      ],
      departamentos: [
        { id: 1, nombre: "DEPARTAMENTO DE CIENCIAS DE LA SALUD", nomenclatura: "DCS", divisionId: 8 },
      ],
    };
    const plan = planearCatalogos(base);
    expect(plan.divisionesNuevas).toEqual([]);
    expect(plan.divisionesExistentes).toEqual(["EI", "SA", "SH"]);
    expect(plan.departamentosExistentes).toEqual(["Departamento de Ciencias de la Salud"]);
    expect(plan.departamentosNuevos.map((d) => d.nomenclatura)).toEqual(["DCCI", "DCCOM"]);
    expect(plan.conflictos).toEqual([]);
  });

  it("una clave de división en uso por otra división es un conflicto y no se crean sus departamentos", () => {
    const base: BaseCatalogos = {
      divisiones: [{ id: 3, clave: "EI", nombre: "Otra división distinta" }],
      departamentos: [],
    };
    const plan = planearCatalogos(base);
    expect(plan.divisionesNuevas.map((d) => d.clave)).toEqual(["SA", "SH"]);
    expect(plan.departamentosNuevos.map((d) => d.divisionClave)).toEqual(["SA", "SH"]);
    expect(plan.conflictos.join(" ")).toContain("La clave «EI» ya la usa otra división");
    expect(plan.conflictos.join(" ")).toContain("su división «EI» no existe o tiene un conflicto");
  });

  it("un nombre de división repetido con otra clave es un conflicto, con el mensaje del catálogo", () => {
    const base: BaseCatalogos = {
      divisiones: [{ id: 3, clave: "XX", nombre: "Centro Universitario de Ciencias de la Salud" }],
      departamentos: [],
    };
    const plan = planearCatalogos(base);
    expect(plan.divisionesNuevas.map((d) => d.clave)).toEqual(["EI", "SH"]);
    expect(plan.conflictos.join(" ")).toContain("Ya existe una división con el nombre");
  });

  it("una nomenclatura ya usada es un conflicto y ese departamento no se crea", () => {
    const base: BaseCatalogos = {
      divisiones: [{ id: 8, clave: "SA", nombre: "Centro Universitario de Ciencias de la Salud" }],
      departamentos: [{ id: 1, nombre: "Otro departamento", nomenclatura: "dccom", divisionId: 8 }],
    };
    const plan = planearCatalogos(base);
    expect(plan.departamentosNuevos.map((d) => d.nomenclatura)).toEqual(["DCCI", "DCS"]);
    expect(plan.conflictos.join(" ")).toContain("Ya existe un departamento con la nomenclatura");
  });

  it("un departamento con el mismo nombre en otra división es un conflicto (el cargador cruza por nombre)", () => {
    const base: BaseCatalogos = {
      divisiones: [{ id: 5, clave: "ZZ", nombre: "División ajena" }],
      departamentos: [{ id: 1, nombre: "Departamento de Ciencias de la Salud", nomenclatura: "XYZ", divisionId: 5 }],
    };
    const plan = planearCatalogos(base);
    expect(plan.departamentosNuevos.map((d) => d.divisionClave)).toEqual(["EI", "SH"]);
    expect(plan.conflictos.join(" ")).toContain("ya existe en otra división");
  });
});

describe("compatibilidad con el cargador de profesores", () => {
  it("los nombres de departamento coinciden con los del CSV: el cargador los encuentra", () => {
    const departamentos = DEPARTAMENTOS_REALES.map((d, i) => ({ id: 100 + i, nombre: d.nombre }));
    const plan = prepararCarga(
      DEPARTAMENTOS_REALES.map((d, i) => ({
        apellidos: `APELLIDO${String.fromCharCode(65 + i)}`,
        nombres: "PRUEBA",
        orcid: null,
        scholarId: null,
        scopusId: null,
        departamento: d.nombre,
      })),
      { departamentos, profesores: [] },
    );
    expect(plan.departamentosFaltantes.size).toBe(0);
    expect(plan.cargar.map((p) => p.departamentoId).sort()).toEqual([100, 101, 102]);
  });
});
