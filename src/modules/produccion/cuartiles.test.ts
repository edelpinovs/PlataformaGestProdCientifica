import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  asignarCuartil,
  cargarCuartilesDesdeExcel,
  crearMapaCuartiles,
  enriquecerLoteConCuartiles,
  enriquecerPublicacionConCuartil,
  extraerIssns,
  normalizarCuartil,
} from "./cuartiles";
import type { PublicacionCandidata } from "./tipos";

describe("cuartiles Scopus (RF-020, RF-026)", () => {
  describe("normalizarCuartil", () => {
    it("normaliza formatos estándar Q1, Q2, Q3, Q4", () => {
      expect(normalizarCuartil("Q1")).toBe("Q1");
      expect(normalizarCuartil("q2")).toBe("Q2");
      expect(normalizarCuartil(" q3 ")).toBe("Q3");
      expect(normalizarCuartil("Q4")).toBe("Q4");
    });

    it("normaliza dígitos simples a prefijo Q", () => {
      expect(normalizarCuartil("1")).toBe("Q1");
      expect(normalizarCuartil(2)).toBe("Q2");
      expect(normalizarCuartil("3")).toBe("Q3");
      expect(normalizarCuartil(4)).toBe("Q4");
    });

    it("normaliza cadenas como 'Cuartil 1' o 'Q 2'", () => {
      expect(normalizarCuartil("Cuartil 1")).toBe("Q1");
      expect(normalizarCuartil("cuartil 3")).toBe("Q3");
      expect(normalizarCuartil("Q 2")).toBe("Q2");
    });

    it("devuelve null ante valores nulos o vacíos", () => {
      expect(normalizarCuartil(null)).toBeNull();
      expect(normalizarCuartil(undefined)).toBeNull();
      expect(normalizarCuartil("")).toBeNull();
      expect(normalizarCuartil("   ")).toBeNull();
    });
  });

  describe("extraerIssns", () => {
    it("extrae y normaliza un ISSN simple con guión", () => {
      expect(extraerIssns("1234-5678")).toEqual(["12345678"]);
    });

    it("extrae ISSN con letra de control X mayúscula o minúscula", () => {
      expect(extraerIssns("0028-0836")).toEqual(["00280836"]);
      expect(extraerIssns("1234-567x")).toEqual(["1234567X"]);
    });

    it("extrae múltiples ISSNs separados por comas, punto y coma o diagonales", () => {
      const entrada = "1234-5678; 9876-5432, 0000-001X / 1111-2222";
      const resultado = extraerIssns(entrada);
      expect(resultado).toEqual(["12345678", "98765432", "0000001X", "11112222"]);
    });

    it("devuelve array vacío ante entradas nulas o vacías", () => {
      expect(extraerIssns(null)).toEqual([]);
      expect(extraerIssns(undefined)).toEqual([]);
      expect(extraerIssns("")).toEqual([]);
    });
  });

  describe("crearMapaCuartiles", () => {
    it("crea un mapa indexado por ISSN normalizado", () => {
      const registros = [
        { issn: "1234-5678", cuartil: "Q1" },
        { issn: "9876-5432", cuartil: "2" },
        { issn: "0000-001X", cuartil: "Cuartil 3" },
      ];
      const mapa = crearMapaCuartiles(registros);

      expect(mapa.get("12345678")).toBe("Q1");
      expect(mapa.get("98765432")).toBe("Q2");
      expect(mapa.get("0000001X")).toBe("Q3");
    });

    it("ignora registros con cuartiles o ISSNs inválidos", () => {
      const registros = [
        { issn: "", cuartil: "Q1" },
        { issn: "1111-2222", cuartil: "" },
      ];
      const mapa = crearMapaCuartiles(registros);
      expect(mapa.size).toBe(0);
    });
  });

  describe("asignarCuartil", () => {
    const mapa = new Map<string, string>([
      ["12345678", "Q1"],
      ["98765432", "Q2"],
      ["0000001X", "Q4"],
    ]);

    it("asigna cuartil buscando por ISSN con guiones", () => {
      expect(asignarCuartil("1234-5678", mapa)).toBe("Q1");
      expect(asignarCuartil("9876-5432", mapa)).toBe("Q2");
      expect(asignarCuartil("0000-001x", mapa)).toBe("Q4");
    });

    it("asigna cuartil si uno de los múltiples ISSN coincide", () => {
      expect(asignarCuartil("0000-9999; 9876-5432", mapa)).toBe("Q2");
    });

    it("soporta Record plano de JavaScript", () => {
      const record = { "12345678": "Q1" };
      expect(asignarCuartil("1234-5678", record)).toBe("Q1");
    });

    it("devuelve null si ningún ISSN coincide", () => {
      expect(asignarCuartil("9999-9999", mapa)).toBeNull();
      expect(asignarCuartil(null, mapa)).toBeNull();
      expect(asignarCuartil("", mapa)).toBeNull();
    });
  });

  describe("cargarCuartilesDesdeExcel", () => {
    it("carga cuartiles correctamente desde un buffer de Excel generado", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Cuartiles Scopus");

      sheet.addRow(["ID", "REVISTA", "ISSN", "PAIS", "CUARTIL"]);
      sheet.addRow([1, "Revista Alpha", "1234-5678", "MX", "Q1"]);
      sheet.addRow([2, "Revista Beta", "9876-543X", "ES", "Q2"]);
      sheet.addRow([3, "Revista Gamma", "0000-1111", "US", "3"]);

      const buffer = await workbook.xlsx.writeBuffer();
      const mapa = await cargarCuartilesDesdeExcel(buffer);

      expect(mapa.size).toBe(3);
      expect(mapa.get("12345678")).toBe("Q1");
      expect(mapa.get("9876543X")).toBe("Q2");
      expect(mapa.get("00001111")).toBe("Q3");
    });

    it("detecta encabezados en la segunda fila si la primera es un título general", async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Reporte");

      sheet.addRow(["CATALOGO INSTITUCIONAL DE CUARTILES 2026"]);
      sheet.addRow(["ISSN_REVISTA", "TITULO", "Q_SCOPUS"]);
      sheet.addRow(["5555-6666", "Revista Delta", "Q1"]);

      const buffer = await workbook.xlsx.writeBuffer();
      const mapa = await cargarCuartilesDesdeExcel(buffer);

      expect(mapa.get("55556666")).toBe("Q1");
    });
  });

  describe("enriquecerPublicacionConCuartil y enriquecerLoteConCuartiles", () => {
    const mapa = new Map<string, string>([["12345678", "Q1"]]);

    it("asigna el cuartil a una publicación que no lo tenía", () => {
      const pub: PublicacionCandidata = {
        titulo: "Estudio sobre Inteligencia Artificial",
        autoresTexto: "García, J.",
        fuente: "SCOPUS",
        profesorId: 10,
        tipo: "ARTICULO",
        isbnIssn: "1234-5678",
      };

      enriquecerPublicacionConCuartil(pub, mapa);
      expect(pub.cuartil).toBe("Q1");
    });

    it("no sobreescribe un cuartil preexistente si forzar es false", () => {
      const pub: PublicacionCandidata = {
        titulo: "Estudio previo",
        autoresTexto: "García, J.",
        fuente: "SCOPUS",
        profesorId: 10,
        tipo: "ARTICULO",
        isbnIssn: "1234-5678",
        cuartil: "Q2",
      };

      enriquecerPublicacionConCuartil(pub, mapa, false);
      expect(pub.cuartil).toBe("Q2");

      enriquecerPublicacionConCuartil(pub, mapa, true);
      expect(pub.cuartil).toBe("Q1");
    });

    it("enriquece un lote completo de publicaciones", () => {
      const lote: PublicacionCandidata[] = [
        {
          titulo: "Pub 1",
          autoresTexto: "A",
          fuente: "SCOPUS",
          profesorId: 1,
          tipo: "ARTICULO",
          isbnIssn: "1234-5678",
        },
        {
          titulo: "Pub 2",
          autoresTexto: "B",
          fuente: "SCOPUS",
          profesorId: 1,
          tipo: "ARTICULO",
          isbnIssn: "9999-9999", // no existe en mapa
        },
      ];

      enriquecerLoteConCuartiles(lote, mapa);
      expect(lote[0].cuartil).toBe("Q1");
      expect(lote[1].cuartil).toBeUndefined();
    });
  });
});

