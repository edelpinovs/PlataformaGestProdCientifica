import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarOpenAlex } from "./openalex";
const doble = vi.hoisted(() => ({ http: vi.fn() }));
vi.mock("./http", () => ({ fetchJsonConReintentos: doble.http }));

describe("Historial completo de OpenAlex", () => {
  afterEach(() => vi.resetAllMocks());
  it("pagina sin filtrar el año y conserva obras antiguas y sin fecha", async () => {
    doble.http.mockResolvedValueOnce({ data: { meta: { next_cursor: "segunda" }, results: [
      { title: "Obra ficticia antigua", publication_year: 2001, type: "article" },
    ] } }).mockResolvedValueOnce({ data: { meta: { next_cursor: null }, results: [
      { title: "Obra ficticia sin fecha", type: "article" },
    ] } });
    const resultado = await consultarOpenAlex({ id: 1, orcid: "0000-0000-0000-0001" });
    expect(resultado.publicaciones).toHaveLength(2);
    expect(resultado.publicaciones.map((obra) => obra.anio)).toEqual([2001, null]);
    expect(doble.http.mock.calls[0][1].params.filter).not.toContain("publication_year");
    expect(doble.http.mock.calls[1][1].params.cursor).toBe("segunda");
  });
  it("descarta una respuesta parcial si falla una página y permite reintentar sin corte falso", async () => {
    doble.http.mockResolvedValueOnce({ data: { meta: { next_cursor: "segunda" }, results: [
      { title: "Obra ficticia", type: "article" },
    ] } }).mockResolvedValueOnce({ data: null, status: 503, error: "HTTP_503" });
    const resultado = await consultarOpenAlex({ id: 1, orcid: "0000-0000-0000-0001" });
    expect(resultado).toEqual({ publicaciones: [], error: "HTTP_503" });
  });
});
