// Pruebas de la revisión del PR #63 (ver docs/pruebas/PR-063-motor-escaneo.md).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deduplicarLote } from "./deduplicacion";
import { consultarOpenAlex } from "./conectores/openalex";
import { consultarScopus } from "./conectores/scopus";
import { consultarOrcid } from "./conectores/orcid";
import type { PublicacionCandidata } from "./tipos";

const prismaFalso = vi.hoisted(() => ({
  job: { findFirst: vi.fn() },
}));
const trabajosFalsos = vi.hoisted(() => ({ crearTrabajoEscaneo: vi.fn(), procesarSiguienteProfesor: vi.fn(), TIPOS_ESCANEO: ["escaneo-manual", "escaneo-diario"] }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/produccion/trabajos", () => trabajosFalsos);
vi.mock("next/server", () => ({ after: vi.fn() }));

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
    expect(fetchFalso.mock.calls.map(([url]) => Number(new URL(url).searchParams.get("start")))).toEqual([0, 25, 50, 75, 100, 125]);
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

// El primer import dinámico de la acción transforma y carga varios módulos y, en una corrida
// completa con muchos archivos en paralelo, puede pasar de los 5 s por omisión.
describe("Notas 2 y 6 · Server Action iniciarEscaneoAction", { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    trabajosFalsos.crearTrabajoEscaneo.mockResolvedValue({ id: 7, estado: "PENDIENTE", avance: 0, total: 2 });
  });

  it("control: encola el escaneo y responde sin esperar a las fuentes externas", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.pendiente).toBe(true);
    expect(r.jobId).toBe(7);
    expect(trabajosFalsos.procesarSiguienteProfesor).not.toHaveBeenCalled();
    const { after } = await import("next/server");
    expect(after).toHaveBeenCalledOnce();
    const tarea = vi.mocked(after).mock.calls[0][0] as () => Promise<void>;
    await tarea();
    expect(trabajosFalsos.procesarSiguienteProfesor).toHaveBeenCalledWith(7);
  });

  it("2b. muestra el fallo persistido por el trabajador sin dejar la pantalla esperando", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    prismaFalso.job.findFirst.mockResolvedValue({ id: 7, estado: "FALLIDO", avance: 0, total: 2 });
    const r = await iniciarEscaneoAction({}, formulario({ jobId: "7" }));
    expect(r.error).toBeDefined();
    expect(r.pendiente).toBe(false);
  });

  it("6a. no muestra a la persona el mensaje técnico de la excepción", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    trabajosFalsos.crearTrabajoEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.error).toBeDefined();
    expect(r.error).not.toContain("Connection terminated");
  });

  it("6b. si todas las fuentes fallan, no responde con éxito", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    prismaFalso.job.findFirst.mockResolvedValue({ id: 7, estado: "FALLIDO", datos: {
      version: 1, profesoresIds: [1], indice: 1, resumen: { ...resumenVacio, errores: ["HTTP_503"] },
    } });
    const r = await iniciarEscaneoAction({}, formulario({ jobId: "7" }));
    expect(r.exito).not.toBe(true);
  });

  it("presenta los resultados parciales guardados sin exponer el error técnico", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    prismaFalso.job.findFirst.mockResolvedValue({ id: 7, estado: "FALLIDO", datos: {
      version: 1, profesoresIds: [1], indice: 1, resumen: { ...resumenVacio,
        publicacionesEncontradas: 2, publicacionesGuardadas: 2, errores: ["Scopus (Prof. 1): NO_API_KEY"] },
    } });
    const r = await iniciarEscaneoAction({}, formulario({ jobId: "7" }));
    expect(r.resultado?.tipo).toBe("aviso");
    expect(r.resultado?.mensaje).toContain("Guardadas o actualizadas: 2");
    expect(JSON.stringify(r.resultado)).not.toContain("NO_API_KEY");
  });

  it("6c. rechaza un año fuera de rango en vez de escanear todos los años", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "1500" }));
    expect(r.error).toBeDefined();
    expect(trabajosFalsos.crearTrabajoEscaneo).not.toHaveBeenCalled();
  });

  it("cada consulta de progreso exige permiso del módulo y restringe el tipo de Job", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    const { requireModulo } = await import("@/lib/auth/session");
    prismaFalso.job.findFirst.mockResolvedValue({ id: 7, estado: "COMPLETADO", avance: 2, total: 2 });
    const resultado = await iniciarEscaneoAction({}, formulario({ jobId: "7" }));
    expect(requireModulo).toHaveBeenCalledWith("produccion");
    expect(prismaFalso.job.findFirst).toHaveBeenCalledWith({ where: { id: 7, tipo: { in: ["escaneo-manual", "escaneo-diario"] } } });
    expect(resultado.exito).toBe(true);
  });

  it("no agenda trabajo si se deniega el permiso", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    const { requireModulo } = await import("@/lib/auth/session");
    vi.mocked(requireModulo).mockRejectedValueOnce(new Error("Sin permiso"));
    await expect(iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }))).rejects.toThrow("Sin permiso");
    expect(trabajosFalsos.crearTrabajoEscaneo).not.toHaveBeenCalled();
  });
});
