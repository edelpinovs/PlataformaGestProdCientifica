import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarIndiceH, consultarScopus, mapearEntradaScopus, mapearTipoScopus } from "./scopus";
import { consultarOpenAlex, mapearObraOpenAlex, mapearTipoOpenAlex } from "./openalex";
import { consultarOrcid, mapearObraOrcid, mapearTipoOrcid } from "./orcid";
import { enriquecerLoteConCrossref, requiereEnriquecimientoAutores } from "./crossref";
import type { PublicacionCandidata } from "../tipos";

function respuestaJson(cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" } });
}

describe("conectores de fuentes externas (RF-020)", () => {
  afterEach(() => vi.unstubAllGlobals());

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

    it("3b. Scopus: un profesor con 150 obras devuelve las 150 paginadas", async () => {
      const fetchFalso = vi.fn(async (url: string) => {
        const inicio = Number(new URL(url).searchParams.get("start") ?? 0);
        const cantidad = Number(new URL(url).searchParams.get("count"));
        if (cantidad > 25) return new Response(null, { status: 400 });
        const n = Math.max(0, Math.min(cantidad, 150 - inicio));
        return respuestaJson({
          "search-results": {
            "opensearch:totalResults": "150",
            entry: Array.from({ length: n }, (_, i) => ({ "dc:title": `Obra ${inicio + i}` })),
          },
        });
      });
      vi.stubGlobal("fetch", fetchFalso);
      const r = await consultarScopus({ id: 1, scopusId: "57200000000" }, undefined, "clave-ficticia");
      expect(r.publicaciones).toHaveLength(150);
      expect(r.error).toBeUndefined();
      expect(fetchFalso).toHaveBeenCalledTimes(6);
    });

    it("consulta el índice H de un autor en Scopus", async () => {
      const fetchFalso = vi.fn(async () =>
        respuestaJson({
          "author-retrieval-response": [
            {
              "@status": "found",
              "h-index": "18",
              "coredata": { "document-count": "45", "citation-count": "1150" },
            },
          ],
        }),
      );
      vi.stubGlobal("fetch", fetchFalso);

      const cache = new Map<string, number | null>();
      const r = await consultarIndiceH("57200000000", "clave-ficticia", cache);

      expect(r.indiceH).toBe(18);
      expect(fetchFalso).toHaveBeenCalledTimes(1);

      // Segunda llamada usa caché sin hacer fetch
      const r2 = await consultarIndiceH("57200000000", "clave-ficticia", cache);
      expect(r2.indiceH).toBe(18);
      expect(fetchFalso).toHaveBeenCalledTimes(1);
    });

    it("devuelve error NO_API_KEY si no hay clave configurada", async () => {
      const r = await consultarIndiceH("57200000000", "");
      expect(r.error).toBe("NO_API_KEY");
      expect(r.indiceH).toBeNull();
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

    it("3a. OpenAlex: un profesor con 150 obras devuelve las 150 con cursor", async () => {
      const obras = (desde: number, n: number) =>
        Array.from({ length: n }, (_, i) => ({ title: `Obra ${desde + i}`, publication_year: 2024 }));
      const fetchFalso = vi.fn(async (url: string) => {
        const pagina = new URL(url).searchParams.get("cursor") === "pag2" ? 2 : 1;
        return respuestaJson({
          meta: { count: 150, next_cursor: pagina === 1 ? "pag2" : null },
          results: pagina === 1 ? obras(0, 100) : obras(100, 50),
        });
      });
      vi.stubGlobal("fetch", fetchFalso);
      const r = await consultarOpenAlex({ id: 1, orcid: "0000-0001-2345-6789" });
      expect(r.publicaciones).toHaveLength(150);
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

    it("no incluye obras sin año cuando se pide un año concreto", async () => {
      const resumen = (titulo: string, anio?: string) => ({
        title: { title: { value: titulo } },
        type: "journal-article",
        "publication-date": anio ? { year: { value: anio } } : null,
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          respuestaJson({
            group: [
              { "work-summary": [resumen("Obra de 2024", "2024")] },
              { "work-summary": [resumen("Obra sin fecha")] },
            ],
          }),
        ),
      );
      const r = await consultarOrcid({ id: 1, orcid: "0000-0001-2345-6789" }, 2024);
      expect(r.publicaciones.map((p) => p.titulo)).toEqual(["Obra de 2024"]);
    });
  });

  describe("conector Crossref · enriquecimiento de autores (RF-020)", () => {
    it("detecta que una publicación de Scopus con un solo autor requiere enriquecimiento", () => {
      const pub: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Test",
        doi: "10.1000/1",
        autoresTexto: "Pérez, J.",
        fuente: "SCOPUS",
        profesorId: 1,
      };
      expect(requiereEnriquecimientoAutores(pub)).toBe(true);
    });

    it("no requiere enriquecimiento si ya tiene múltiples autores", () => {
      const pub: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Test",
        doi: "10.1000/1",
        autoresTexto: "Pérez, J.; Gómez, A.; López, C.",
        fuente: "SCOPUS",
        profesorId: 1,
      };
      expect(requiereEnriquecimientoAutores(pub)).toBe(false);
    });

    it("enriquece un lote mixto: solo completa las que tienen DOI y un autor", async () => {
      const fetchFalso = vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: "ok",
            message: {
              author: [
                { family: "Ávila-George", given: "Himer" },
                { family: "Morales", given: "Roberto" },
                { family: "Sorcia-Vázquez", given: "Felipe" },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchFalso);

      const lote: PublicacionCandidata[] = [
        // Scopus vista estándar: solo primer autor → necesita enriquecimiento
        { tipo: "ARTICULO", titulo: "Obra A", doi: "10.1016/j.eswa.2023.120000", autoresTexto: "Ávila-George, H.", fuente: "SCOPUS", profesorId: 1 },
        // OpenAlex ya con múltiples autores → no necesita enriquecimiento
        { tipo: "ARTICULO", titulo: "Obra B", doi: "10.1109/access.2022.1", autoresTexto: "Autor, A.; Autor, B.", fuente: "OPENALEX", profesorId: 1 },
        // Sin DOI → no se puede enriquecer
        { tipo: "ARTICULO", titulo: "Obra C", autoresTexto: "García, María.", fuente: "SCOPUS", profesorId: 1 },
      ];

      const enriquecidas = await enriquecerLoteConCrossref(lote);

      expect(enriquecidas).toBe(1);
      expect(lote[0].autoresTexto).toBe("Ávila-George, Himer; Morales, Roberto; Sorcia-Vázquez, Felipe");
      expect(lote[1].autoresTexto).toBe("Autor, A.; Autor, B."); // sin cambio
      expect(lote[2].autoresTexto).toBe("García, María.");       // sin cambio
    });
  });
});
