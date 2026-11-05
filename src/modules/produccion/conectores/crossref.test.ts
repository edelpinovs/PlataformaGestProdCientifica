import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consultarAutoresPorDoi,
  enriquecerLoteConCrossref,
  enriquecerPublicacionConCrossref,
  formatearAutoresCrossref,
  requiereEnriquecimientoAutores,
} from "./crossref";
import type { PublicacionCandidata } from "../tipos";

describe("conector de Crossref (RF-020, enriquecimiento de autores)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("formatearAutoresCrossref", () => {
    it("formatea autores con family y given a 'Family, Given'", () => {
      const entrada = [
        { family: "Pérez", given: "Juan" },
        { family: "Gómez", given: "Ana María" },
      ];
      const res = formatearAutoresCrossref(entrada);
      expect(res).toEqual(["Pérez, Juan", "Gómez, Ana María"]);
    });

    it("maneja autores con solo apellido o solo nombre institucional", () => {
      const entrada = [
        { family: "García" },
        { given: "Carlos" },
        { name: "Organización Mundial de la Salud" },
      ];
      const res = formatearAutoresCrossref(entrada);
      expect(res).toEqual(["García", "Carlos", "Organización Mundial de la Salud"]);
    });

    it("ignora autores vacíos o duplicados y limpia espacios", () => {
      const entrada = [
        { family: "  López  ", given: "  Mario  " },
        { family: "López", given: "Mario" }, // duplicado
        { family: "" },
        null,
      ];
      const res = formatearAutoresCrossref(entrada);
      expect(res).toEqual(["López, Mario"]);
    });

    it("devuelve arreglo vacío para entrada no válida", () => {
      expect(formatearAutoresCrossref(undefined)).toEqual([]);
      expect(formatearAutoresCrossref([])).toEqual([]);
    });
  });

  describe("consultarAutoresPorDoi", () => {
    it("obtiene autores de una obra vía API de Crossref", async () => {
      const fetchFalso = vi.fn(async (url: string) => {
        expect(url).toContain("10.3390%2Fw18060703");
        return new Response(
          JSON.stringify({
            status: "ok",
            message: {
              DOI: "10.3390/w18060703",
              title: ["Water Resources Management"],
              author: [
                { family: "Ávila-George", given: "Himer" },
                { family: "Morales", given: "Roberto" },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      });
      vi.stubGlobal("fetch", fetchFalso);

      const r = await consultarAutoresPorDoi("10.3390/w18060703");
      expect(r.autores).toEqual(["Ávila-George, Himer", "Morales, Roberto"]);
      expect(r.autoresTexto).toBe("Ávila-George, Himer; Morales, Roberto");
      expect(r.error).toBeUndefined();
    });

    it("usa la caché si ya se había consultado el DOI", async () => {
      const fetchFalso = vi.fn();
      vi.stubGlobal("fetch", fetchFalso);

      const cache = new Map<string, string>();
      cache.set("10.1000/cached", "Pérez, Juan; López, Ana");

      const r = await consultarAutoresPorDoi("10.1000/cached", cache);
      expect(r.autoresTexto).toBe("Pérez, Juan; López, Ana");
      expect(fetchFalso).not.toHaveBeenCalled();
    });

    it("maneja DOI inválido o vacío sin hacer llamada de red", async () => {
      const fetchFalso = vi.fn();
      vi.stubGlobal("fetch", fetchFalso);

      const r = await consultarAutoresPorDoi("");
      expect(r.autores).toEqual([]);
      expect(r.autoresTexto).toBe("");
      expect(fetchFalso).not.toHaveBeenCalled();
    });

    it("maneja error HTTP 404 (DOI no indexado en Crossref)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("Not found", { status: 404 })),
      );

      const r = await consultarAutoresPorDoi("10.9999/no-existe");
      expect(r.autores).toEqual([]);
      expect(r.error).toBe("HTTP_404");
    });
  });

  describe("requiereEnriquecimientoAutores", () => {
    it("devuelve true si la publicación es de Scopus y solo tiene un autor", () => {
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

    it("devuelve false si ya tiene múltiples autores separados por punto y coma", () => {
      const pub: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Test",
        doi: "10.1000/1",
        autoresTexto: "Pérez, J.; Gómez, A.",
        fuente: "SCOPUS",
        profesorId: 1,
      };
      expect(requiereEnriquecimientoAutores(pub)).toBe(false);
    });

    it("devuelve false si no tiene DOI", () => {
      const pub: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Test",
        autoresTexto: "Pérez, J.",
        fuente: "SCOPUS",
        profesorId: 1,
      };
      expect(requiereEnriquecimientoAutores(pub)).toBe(false);
    });
  });

  describe("enriquecerPublicacionConCrossref y enriquecerLoteConCrossref", () => {
    it("enriquece los autores de una publicación con vista estándar de Scopus", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              status: "ok",
              message: {
                author: [
                  { family: "Pérez", given: "Juan" },
                  { family: "Gómez", given: "Ana" },
                  { family: "López", given: "Carlos" },
                ],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
      );

      const pub: PublicacionCandidata = {
        tipo: "ARTICULO",
        titulo: "Articulo con vista estandar",
        doi: "10.1016/j.future.2023.01.005",
        autoresTexto: "Pérez, J.",
        fuente: "SCOPUS",
        profesorId: 1,
      };

      const enriquecida = await enriquecerPublicacionConCrossref(pub);
      expect(enriquecida).toBe(true);
      expect(pub.autoresTexto).toBe("Pérez, Juan; Gómez, Ana; López, Carlos");
    });

    it("enriquece un lote de publicaciones candidatas en paralelo", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              status: "ok",
              message: {
                author: [
                  { family: "Autor", given: "A" },
                  { family: "Autor", given: "B" },
                ],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
      );

      const lote: PublicacionCandidata[] = [
        {
          tipo: "ARTICULO",
          titulo: "Obra 1",
          doi: "10.1000/1",
          autoresTexto: "Autor, A.",
          fuente: "SCOPUS",
          profesorId: 1,
        },
        {
          tipo: "ARTICULO",
          titulo: "Obra 2 ya completa",
          doi: "10.1000/2",
          autoresTexto: "Autor, A.; Autor, B.; Autor, C.",
          fuente: "OPENALEX",
          profesorId: 1,
        },
        {
          tipo: "ARTICULO",
          titulo: "Obra 3 sin DOI",
          autoresTexto: "Autor, A.",
          fuente: "SCOPUS",
          profesorId: 1,
        },
      ];

      const count = await enriquecerLoteConCrossref(lote);
      expect(count).toBe(1);
      expect(lote[0].autoresTexto).toBe("Autor, A; Autor, B");
      expect(lote[1].autoresTexto).toBe("Autor, A.; Autor, B.; Autor, C.");
    });
  });
});

