import { describe, expect, it } from "vitest";
import { resumenBusqueda } from "./resumen-busqueda";

describe("RF-020: resumen de la búsqueda antes de escanear", () => {
  it("resume la búsqueda por omisión con fuentes en el orden de la pantalla", () => {
    expect(resumenBusqueda({ fuentes: ["SCOPUS", "ORCID", "OPENALEX"], profesor: "todos", desde: "", hasta: "" }))
      .toBe("Se buscará en ORCID, OpenAlex y Scopus, para todos los profesores activos, sin periodo fijo, desde la última búsqueda de cada fuente.");
  });

  it("con «todos» nombra el departamento elegido o a quienes no tienen uno", () => {
    expect(resumenBusqueda({ fuentes: ["ORCID"], profesor: "todos", departamento: "Departamento Ficticio (DFI)", desde: "", hasta: "" }))
      .toBe("Se buscará en ORCID, para los profesores activos de Departamento Ficticio (DFI), sin periodo fijo, desde la última búsqueda de cada fuente.");
    expect(resumenBusqueda({ fuentes: ["ORCID"], profesor: "todos", departamento: "sin departamento", desde: "", hasta: "" }))
      .toContain("para los profesores activos sin departamento,");
    expect(resumenBusqueda({ fuentes: ["ORCID"], profesor: "Persona Ficticia", departamento: "Departamento Ficticio (DFI)", desde: "", hasta: "" }))
      .toContain("para Persona Ficticia,");
  });

  it("nombra al profesor elegido y el periodo completo", () => {
    expect(resumenBusqueda({ fuentes: ["CROSSREF"], profesor: "Persona Ficticia", desde: "2024-03-05", hasta: "2025-01-31" }))
      .toBe("Se buscará en Crossref, para Persona Ficticia, del 05/03/2024 al 31/01/2025.");
  });

  it("sin Hasta busca hasta hoy", () => {
    expect(resumenBusqueda({ fuentes: ["ORCID", "GOOGLE_SCHOLAR"], profesor: "todos", desde: "2020-01-01", hasta: "" }))
      .toBe("Se buscará en ORCID y Google Scholar, para todos los profesores activos, del 01/01/2020 a hoy.");
  });

  it("avisa lo que falta sin inventar valores", () => {
    expect(resumenBusqueda({ fuentes: [], profesor: "", desde: "", hasta: "2025-01-31" }))
      .toBe("Se buscará sin fuentes elegidas, para un profesor por elegir, falta la fecha Desde.");
  });
});
