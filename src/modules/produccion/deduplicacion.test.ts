import { describe, expect, it } from "vitest";
import {
  compararConExistente,
  deduplicarLote,
  sonDuplicadosPorDoi,
  sonDuplicadosPorTitulo,
} from "./deduplicacion";
import type { PublicacionCandidata } from "./tipos";

describe("deduplicacion (RF-021, RF-022, RNF-004)", () => {
  describe("sonDuplicadosPorDoi", () => {
    it("identifica como duplicados dos DOIs idénticos con formatos distintos", () => {
      const doi1 = "https://doi.org/10.1016/j.future.2023.01.005";
      const doi2 = "10.1016/J.FUTURE.2023.01.005";
      expect(sonDuplicadosPorDoi(doi1, doi2)).toBe(true);
    });

    it("no marca como duplicados DOIs diferentes", () => {
      const doi1 = "10.1016/j.future.2023.01.005";
      const doi2 = "10.1016/j.future.2023.02.010";
      expect(sonDuplicadosPorDoi(doi1, doi2)).toBe(false);
    });

    it("devuelve false si alguno o ambos DOIs son nulos o vacíos", () => {
      expect(sonDuplicadosPorDoi(null, "10.1016/j.future.2023.01.005")).toBe(false);
      expect(sonDuplicadosPorDoi("10.1016/j.future.2023.01.005", "")).toBe(false);
      expect(sonDuplicadosPorDoi(null, null)).toBe(false);
    });
  });

  describe("sonDuplicadosPorTitulo", () => {
    it("detecta títulos idénticos como duplicado con similitud 1.0", () => {
      const res = sonDuplicadosPorTitulo(
        "Optimization of Energy Consumption in Wireless Sensor Networks",
        "optimization of energy consumption in wireless sensor networks",
      );
      expect(res.esDuplicado).toBe(true);
      expect(res.similitud).toBe(1.0);
      expect(res.motivo).toBe("TITULO_EXACTO");
    });

    it("detecta duplicados por similitud alta con pequeñas diferencias ortográficas", () => {
      const res = sonDuplicadosPorTitulo(
        "Machine Learning Algorithms for Smart Grid Applications: A Review",
        "Machine Learning Algorithm for Smart Grid Applications: A Review",
        2024,
        2024,
      );
      expect(res.esDuplicado).toBe(true);
      expect(res.similitud).toBeGreaterThanOrEqual(0.9);
      expect(res.motivo).toBe("TITULO_SIMILITUD");
    });

    it("rechaza duplicación si la diferencia de años es mayor a 1 año", () => {
      const res = sonDuplicadosPorTitulo(
        "Annual Report on Renewable Energies",
        "Annual Report on Renewable Energies",
        2020,
        2024,
      );
      // Aunque el título sea idéntico, si los años difieren por más de 1 año (ej. reporte anual 2020 vs 2024), no deben fusionarse
      expect(res.esDuplicado).toBe(false);
    });

    it("acepta diferencia de 1 año (prepublicación / online first vs print)", () => {
      const res = sonDuplicadosPorTitulo(
        "Advanced Neural Architectures for Healthcare Diagnostics",
        "Advanced Neural Architectures for Healthcare Diagnostics",
        2023,
        2024,
      );
      expect(res.esDuplicado).toBe(true);
      expect(res.similitud).toBe(1.0);
    });
  });

  describe("compararConExistente", () => {
    it("da prioridad al DOI exacto sobre el título", () => {
      const candidata: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Título en español con variantes",
        doi: "10.1109/access.2024.12345",
        autoresTexto: "García, J.; López, M.",
        fuente: "SCOPUS",
        profesorId: 10,
      };

      const existente = {
        id: 42,
        titulo: "Title in english",
        doi: "https://doi.org/10.1109/ACCESS.2024.12345",
        anio: 2024,
      };

      const resultado = compararConExistente(candidata, existente);
      expect(resultado.esDuplicado).toBe(true);
      expect(resultado.motivo).toBe("DOI_EXACTO");
      expect(resultado.publicacionExistenteId).toBe(42);
    });
  });

  describe("deduplicarLote", () => {
    it("fusiona la misma publicación encontrada en Scopus y ORCID", () => {
      const desdeScopus: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Edge computing in smart cities: architectures and challenges",
        doi: "10.1016/j.compeleceng.2023.108000",
        autoresTexto: "Pérez, Juan; Gómez, Ana",
        revistaEditorial: "Computers & Electrical Engineering",
        isbnIssn: "0045-7906",
        anio: 2023,
        volumen: "105",
        paginas: "108000",
        fuente: "SCOPUS",
        profesorId: 1,
        citas: 15,
        cuartil: "Q1",
      };

      const desdeOrcid: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Edge computing in smart cities: architectures and challenges",
        doi: "https://doi.org/10.1016/j.compeleceng.2023.108000",
        autoresTexto: "Pérez, J.",
        fuente: "ORCID",
        profesorId: 1,
      };

      const consolidadas = deduplicarLote([desdeScopus, desdeOrcid]);

      expect(consolidadas).toHaveLength(1);
      const resultado = consolidadas[0];
      expect(resultado.doi).toBe("10.1016/j.compeleceng.2023.108000");
      expect(resultado.fuentePrincipal).toBe("SCOPUS");
      expect(resultado.fuentesDetectadas).toEqual(["SCOPUS", "ORCID"]);
      // Se conservan los metadatos más completos de Scopus
      expect(resultado.citas).toBe(15);
      expect(resultado.cuartil).toBe("Q1");
      expect(resultado.volumen).toBe("105");
      expect(resultado.revistaEditorial).toBe("Computers & Electrical Engineering");
    });

    it("RF-022: consolida coautoría institucional sin duplicar la obra", () => {
      // Dos profesores del mismo centro universitario son coautores del mismo artículo
      const pubProfesor1: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Federated Learning for Privacy-Preserving IoT Systems",
        doi: "10.1109/JIOT.2023.3210000",
        autoresTexto: "Ávila-George, H.; Morales, R.",
        anio: 2023,
        fuente: "SCOPUS",
        profesorId: 101, // Profesor 1
      };

      const pubProfesor2: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Federated Learning for Privacy-Preserving IoT Systems",
        doi: "10.1109/JIOT.2023.3210000",
        autoresTexto: "Ávila-George, H.; Morales, R.",
        anio: 2023,
        fuente: "OPENALEX",
        profesorId: 102, // Profesor 2
      };

      const consolidadas = deduplicarLote([pubProfesor1, pubProfesor2]);

      expect(consolidadas).toHaveLength(1);
      const unificada = consolidadas[0];
      // Verifica que ambos profesores quedaron vinculados a la misma publicación
      expect(unificada.profesoresIds).toContain(101);
      expect(unificada.profesoresIds).toContain(102);
      expect(unificada.profesoresIds).toHaveLength(2);
      expect(unificada.fuentesDetectadas).toContain("SCOPUS");
      expect(unificada.fuentesDetectadas).toContain("OPENALEX");
    });

    it("deduplica por título cuando ninguna de las fuentes provee DOI", () => {
      const pub1: PublicacionCandidata = {
        tipo: "MEMORIA_CONGRESO",
        titulo: "Análisis del Consumo Energético en Algoritmos Criptográficos Ligeros",
        autoresTexto: "Hernández, C.; Rodríguez, M.",
        anio: 2024,
        fuente: "ORCID",
        profesorId: 5,
      };

      const pub2: PublicacionCandidata = {
        tipo: "MEMORIA_CONGRESO",
        titulo: "analisis del consumo energetico en algoritmos criptograficos ligeros",
        autoresTexto: "Hernández, C.",
        anio: 2024,
        fuente: "OPENALEX",
        profesorId: 5,
      };

      const consolidadas = deduplicarLote([pub1, pub2]);
      expect(consolidadas).toHaveLength(1);
      expect(consolidadas[0].fuentesDetectadas).toHaveLength(2);
    });

    it("no fusiona publicaciones independientes", () => {
      const pub1: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Deep Learning for Audio Classification",
        doi: "10.1000/1",
        autoresTexto: "Autor A",
        anio: 2023,
        fuente: "SCOPUS",
        profesorId: 1,
      };

      const pub2: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Quantum Computing Algorithms for Chemistry",
        doi: "10.1000/2",
        autoresTexto: "Autor B",
        anio: 2023,
        fuente: "SCOPUS",
        profesorId: 1,
      };

      const consolidadas = deduplicarLote([pub1, pub2]);
      expect(consolidadas).toHaveLength(2);
    });
  });
});
