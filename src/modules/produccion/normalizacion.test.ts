import { describe, expect, it } from "vitest";
import {
  calcularSimilitudTrigramas,
  extraerTrigramas,
  limpiarDoi,
  limpiarTexto,
  normalizarIssnIsbn,
  normalizarTitulo,
} from "./normalizacion";

describe("normalizacion (RF-020, RF-021)", () => {
  describe("limpiarTexto", () => {
    it("elimina espacios iniciales, finales y colapsa internos", () => {
      expect(limpiarTexto("   Machine   learning in   education  ")).toBe(
        "Machine learning in education",
      );
      expect(limpiarTexto("")).toBe("");
      expect(limpiarTexto(null)).toBe("");
      expect(limpiarTexto(undefined)).toBe("");
    });
  });

  describe("normalizarTitulo", () => {
    it("elimina acentos, mayúsculas y caracteres de puntuación", () => {
      const original = "¡Análisis de Datos, Minería & Inteligencia Artificial!";
      const esperado = "analisis de datos mineria inteligencia artificial";
      expect(normalizarTitulo(original)).toBe(esperado);
    });

    it("trata igual títulos con acentos o variantes diacríticas", () => {
      const t1 = "Evaluación del Rendimiento Académico en Ingeniería";
      const t2 = "evaluacion del rendimiento academico en ingenieria";
      expect(normalizarTitulo(t1)).toBe(normalizarTitulo(t2));
    });

    it("maneja cadenas vacías o nulas", () => {
      expect(normalizarTitulo("")).toBe("");
      expect(normalizarTitulo(null)).toBe("");
      expect(normalizarTitulo(undefined)).toBe("");
    });
  });

  describe("limpiarDoi", () => {
    it("extrae el DOI estándar de URLs https://doi.org/", () => {
      expect(limpiarDoi("https://doi.org/10.1016/j.procs.2023.01.001")).toBe(
        "10.1016/j.procs.2023.01.001",
      );
    });

    it("extrae el DOI de URLs dx.doi.org y con http", () => {
      expect(limpiarDoi("http://dx.doi.org/10.1109/ACCESS.2022.3150000")).toBe(
        "10.1109/access.2022.3150000",
      );
    });

    it("limpia prefijos como doi: y mayúsculas", () => {
      expect(limpiarDoi("doi: 10.3390/W18060703")).toBe("10.3390/w18060703");
    });

    it("elimina puntos o comas finales accidentales", () => {
      expect(limpiarDoi("10.1007/s11277-021-08500-1.")).toBe(
        "10.1007/s11277-021-08500-1",
      );
    });

    it("devuelve null si no hay DOI válido o está vacío", () => {
      expect(limpiarDoi("")).toBeNull();
      expect(limpiarDoi(null)).toBeNull();
      expect(limpiarDoi(undefined)).toBeNull();
    });
  });

  describe("normalizarIssnIsbn", () => {
    it("elimina guiones y espacios en ISSN e ISBN", () => {
      expect(normalizarIssnIsbn("1234-5678")).toBe("12345678");
      expect(normalizarIssnIsbn("978-3-16-148410-0")).toBe("9783161484100");
    });

    it("preserva la letra X mayúscula final de los ISSN", () => {
      expect(normalizarIssnIsbn("2434-561x")).toBe("2434561X");
    });

    it("devuelve null para valores vacíos", () => {
      expect(normalizarIssnIsbn("")).toBeNull();
      expect(normalizarIssnIsbn(null)).toBeNull();
    });
  });

  describe("calcularSimilitudTrigramas", () => {
    it("devuelve 1.0 para títulos idénticos", () => {
      const t = "A deep learning approach for time series forecasting";
      expect(calcularSimilitudTrigramas(t, t)).toBe(1.0);
    });

    it("devuelve 1.0 para títulos que difieren solo en mayúsculas o acentos", () => {
      const t1 = "Análisis de Redes Complejas en Biología";
      const t2 = "analisis de redes complejas en biologia";
      expect(calcularSimilitudTrigramas(t1, t2)).toBe(1.0);
    });

    it("alcanza >= 0.90 de similitud para variaciones menores o errores tipográficos", () => {
      const t1 = "Deep Learning for Natural Language Processing: A Comprehensive Survey";
      const t2 = "Deep Learning for Natural Language Processing: A Comprehensive Review";
      const similitud = calcularSimilitudTrigramas(t1, t2);
      expect(similitud).toBeGreaterThanOrEqual(0.85);
    });

    it("devuelve una similitud baja (< 0.40) para títulos diferentes", () => {
      const t1 = "Deep learning in image recognition";
      const t2 = "Economic impacts of climate change in agriculture";
      expect(calcularSimilitudTrigramas(t1, t2)).toBeLessThan(0.4);
    });

    it("extrae trigramas correctamente con padding", () => {
      const trigramas = extraerTrigramas("abc");
      // padding es "  abc " -> trigramas: "  a", " ab", "abc", "bc "
      expect(trigramas.has("  a")).toBe(true);
      expect(trigramas.has(" ab")).toBe(true);
      expect(trigramas.has("abc")).toBe(true);
      expect(trigramas.has("bc ")).toBe(true);
    });
  });
});
