// Pruebas de la revisión del PR #63 (ver docs/pruebas/PR-063-motor-escaneo.md).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deduplicarLote } from "./deduplicacion";
import { consultarOpenAlex } from "./conectores/openalex";
import { consultarScopus } from "./conectores/scopus";
import { consultarOrcid } from "./conectores/orcid";
import type { PublicacionCandidata } from "./tipos";

const prismaFalso = vi.hoisted(() => ({
  job: { create: vi.fn(), update: vi.fn() },
}));
const escaneoFalso = vi.hoisted(() => ({ ejecutarEscaneo: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/produccion/escaneo", () => escaneoFalso);

const base: PublicacionCandidata = {
  tipo: "ARTICULO",
  titulo: "",
  autoresTexto: "Pérez, Ana",
  fuente: "OPENALEX",
  profesorId: 1,
};

function respuestaJson(cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" } });
}

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

const resumenVacio = {
  profesoresProcesados: 1,
  publicacionesEncontradas: 0,
  publicacionesGuardadas: 0,
  autoriasCreadas: 0,
  coautoriasDetectadas: 0,
  errores: [] as string[],
};

describe("Nota 1 · deduplicarLote no junta obras distintas", () => {
  it("1a. mismo título exacto pero años lejanos (2019 y 2024) son dos obras", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Editorial", anio: 2019, doi: "10.1000/ed.2019" },
      { ...base, titulo: "Editorial", anio: 2024, doi: "10.1000/ed.2024" },
    ]);
    expect(r).toHaveLength(2);
  });

  it("1b. títulos casi iguales del mismo año con DOI distinto son dos obras", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco", anio: 2024, doi: "10.1000/a" },
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco.", anio: 2024, doi: "10.1000/b" },
    ]);
    expect(r).toHaveLength(2);
  });

  it("control: misma obra en dos fuentes, una sin DOI, sí se fusiona", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco", anio: 2024, doi: "10.1000/a" },
      { ...base, fuente: "ORCID", titulo: "Machine Learning for Crop Yield Prediction in Jalisco", anio: 2024 },
    ]);
    expect(r).toHaveLength(1);
  });
});

describe("Nota 3 · los conectores traen todas las páginas", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("3a. OpenAlex: un profesor con 150 obras devuelve las 150", async () => {
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

  it("3b. Scopus: un profesor con 150 obras devuelve las 150", async () => {
    const fetchFalso = vi.fn(async (url: string) => {
      const inicio = Number(new URL(url).searchParams.get("start") ?? 0);
      const n = Math.max(0, Math.min(100, 150 - inicio));
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
  });
});

describe("Menor · ORCID con filtro de año", () => {
  afterEach(() => vi.unstubAllGlobals());

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

describe("Notas 2 y 6 · Server Action iniciarEscaneoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.job.create.mockResolvedValue({ id: 7 });
    prismaFalso.job.update.mockResolvedValue({});
  });

  it("control: un escaneo correcto responde con éxito", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue({ ...resumenVacio, publicacionesEncontradas: 3, publicacionesGuardadas: 3 });
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.exito).toBe(true);
  });

  it("2b. si el escaneo lanza una excepción, el Job queda FALLIDO y no EN_PROCESO", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(prismaFalso.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: expect.objectContaining({ estado: "FALLIDO" }) }),
    );
  });

  it("6a. no muestra a la persona el mensaje técnico de la excepción", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.error).toBeDefined();
    expect(r.error).not.toContain("Connection terminated");
  });

  it("6b. si todas las fuentes fallan, no responde con éxito", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue({
      ...resumenVacio,
      errores: ["OpenAlex (Prof. 1): HTTP_503", "ORCID (Prof. 1): TIMEOUT"],
    });
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.exito).not.toBe(true);
  });

  it("6c. rechaza un año fuera de rango en vez de escanear todos los años", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue(resumenVacio);
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "1500" }));
    expect(r.error).toBeDefined();
    expect(escaneoFalso.ejecutarEscaneo).not.toHaveBeenCalled();
  });
});
