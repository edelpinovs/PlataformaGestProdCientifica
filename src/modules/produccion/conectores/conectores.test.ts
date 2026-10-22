import { describe, expect, it } from "vitest";
import { mapearEntradaScopus, mapearTipoScopus } from "./scopus";
import { mapearObraOpenAlex, mapearTipoOpenAlex } from "./openalex";
import { mapearObraOrcid, mapearTipoOrcid } from "./orcid";

describe("conectores de fuentes externas (RF-020)", () => {
  describe("conector Scopus", () => {
    it("mapea tipos de documento de Scopus adecuadamente", () => {
      expect(mapearTipoScopus("Article")).toBe("ARTICULO");
      expect(mapearTipoScopus("Review")).toBe("ARTICULO");
      expect(mapearTipoScopus("Conference Paper")).toBe("MEMORIA_CONGRESO");
      expect(mapearTipoScopus("Book Chapter")).toBe("CAPITULO");
      expect(mapearTipoScopus("Book")).toBe("LIBRO");
      expect(mapearTipoScopus("Undefined")).toBe("OTRO");
    });

    it("transforma una entrada típica de Scopus a PublicacionCandidata", () => {
      const entradaScopus = {
        "dc:title": "Deep learning models for anomaly detection in smart grid sensors",
        "prism:doi": "10.1016/j.eswa.2023.120000",
        "subtypeDescription": "Article",
        "dc:creator": "Morales, R.",
        "author": [
          { "authname": "Morales, R." },
          { "authname": "Avila-George, H." },
        ],
        "prism:publicationName": "Expert Systems with Applications",
        "prism:coverDate": "2023-11-15",
        "prism:volume": "230",
        "prism:pageRange": "120000",
        "prism:issn": "0957-4174",
        "citedby-count": "24",
      };

      const resultado = mapearEntradaScopus(entradaScopus, 10);
      expect(resultado).not.toBeNull();
      expect(resultado?.titulo).toBe("Deep learning models for anomaly detection in smart grid sensors");
      expect(resultado?.doi).toBe("10.1016/j.eswa.2023.120000");
      expect(resultado?.tipo).toBe("ARTICULO");
      expect(resultado?.autoresTexto).toBe("Morales, R.; Avila-George, H.");
      expect(resultado?.revistaEditorial).toBe("Expert Systems with Applications");
      expect(resultado?.anio).toBe(2023);
      expect(resultado?.citas).toBe(24);
      expect(resultado?.fuente).toBe("SCOPUS");
      expect(resultado?.profesorId).toBe(10);
    });

    it("descarta entradas sin título", () => {
      expect(mapearEntradaScopus({}, 1)).toBeNull();
    });
  });

  describe("conector OpenAlex", () => {
    it("mapea tipos de OpenAlex adecuadamente", () => {
      expect(mapearTipoOpenAlex("article", "journal")).toBe("ARTICULO");
      expect(mapearTipoOpenAlex("proceedings", "conference")).toBe("MEMORIA_CONGRESO");
      expect(mapearTipoOpenAlex("book", "book series")).toBe("LIBRO");
      expect(mapearTipoOpenAlex("book-chapter", "book")).toBe("CAPITULO");
    });

    it("transforma una obra de OpenAlex a PublicacionCandidata", () => {
      const obraOA = {
        "title": "A survey on federated learning: <i>architectures and security</i>",
        "doi": "https://doi.org/10.1109/ACCESS.2022.3150000",
        "type": "article",
        "publication_year": 2022,
        "publication_date": "2022-03-01",
        "cited_by_count": 58,
        "primary_location": {
          "source": {
            "display_name": "IEEE Access",
            "issn_l": "2169-3536",
            "type": "journal",
          },
          "landing_page_url": "https://ieeexplore.ieee.org/document/9700000",
        },
        "authorships": [
          { "author": { "display_name": "Himer Avila-George" } },
          { "author": { "display_name": "Juan Perez" } },
        ],
      };

      const resultado = mapearObraOpenAlex(obraOA, 5);
      expect(resultado).not.toBeNull();
      // Elimina etiquetas HTML como <i></i>
      expect(resultado?.titulo).toBe("A survey on federated learning: architectures and security");
      expect(resultado?.doi).toBe("10.1109/access.2022.3150000");
      expect(resultado?.tipo).toBe("ARTICULO");
      expect(resultado?.autoresTexto).toBe("Himer Avila-George; Juan Perez");
      expect(resultado?.revistaEditorial).toBe("IEEE Access");
      expect(resultado?.anio).toBe(2022);
      expect(resultado?.citas).toBe(58);
      expect(resultado?.fuente).toBe("OPENALEX");
    });
  });

  describe("conector ORCID", () => {
    it("mapea tipos de ORCID adecuadamente", () => {
      expect(mapearTipoOrcid("journal-article")).toBe("ARTICULO");
      expect(mapearTipoOrcid("conference-paper")).toBe("MEMORIA_CONGRESO");
      expect(mapearTipoOrcid("book-chapter")).toBe("CAPITULO");
      expect(mapearTipoOrcid("software")).toBe("REGISTRO_SOFTWARE");
    });

    it("transforma un resumen de obra de ORCID a PublicacionCandidata", () => {
      const group = {
        "external-ids": {
          "external-id": [
            {
              "external-id-type": "doi",
              "external-id-value": "10.3390/w18060703",
            },
          ],
        },
      };

      const summary = {
        "title": {
          "title": {
            "value": "Smart Water Management: IoT Systems and Machine Learning",
          },
        },
        "type": "journal-article",
        "publication-date": {
          "year": { "value": "2024" },
          "month": { "value": "06" },
          "day": { "value": "12" },
        },
        "journal-title": {
          "value": "Water",
        },
        "url": {
          "value": "https://www.mdpi.com/2073-4441/18/6/703",
        },
      };

      const resultado = mapearObraOrcid(group, summary, 7, "Cervantes, José Antonio");
      expect(resultado).not.toBeNull();
      expect(resultado?.titulo).toBe("Smart Water Management: IoT Systems and Machine Learning");
      expect(resultado?.doi).toBe("10.3390/w18060703");
      expect(resultado?.tipo).toBe("ARTICULO");
      expect(resultado?.revistaEditorial).toBe("Water");
      expect(resultado?.anio).toBe(2024);
      expect(resultado?.autoresTexto).toBe("Cervantes, José Antonio");
      expect(resultado?.fuente).toBe("ORCID");
    });
  });
});
