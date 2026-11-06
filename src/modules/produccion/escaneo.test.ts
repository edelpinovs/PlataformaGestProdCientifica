import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ejecutarEscaneo, type RepositorioProduccion } from "./escaneo";
import { consultarScopus } from "./conectores/scopus";
import { consultarOrcid } from "./conectores/orcid";
import type { PublicacionCandidata } from "./tipos";

vi.mock("./conectores/scopus", () => ({ consultarScopus: vi.fn() }));
vi.mock("./conectores/openalex", () => ({ consultarOpenAlex: vi.fn() }));
vi.mock("./conectores/orcid", () => ({ consultarOrcid: vi.fn() }));
vi.mock("./conectores/crossref", () => ({ enriquecerLoteConCrossref: vi.fn() }));

const inicio = new Date("2026-01-02T12:00:00Z");
const obra: PublicacionCandidata = {
  tipo: "ARTICULO", titulo: "Estudio ficticio de prueba", autoresTexto: "Autor ficticio",
  profesorId: 1, fuente: "ORCID", anio: 2026, doi: "10.1000/prueba-corte",
};

function crearRepositorio() {
  return {
    obtenerProfesores: vi.fn().mockResolvedValue([
      { id: 1, nombres: "Persona", apellidos: "Ficticia", orcid: "0000-0000-0000-0001" },
    ]),
    buscarPorDoi: vi.fn(), buscarSimilares: vi.fn(),
    persistirOActualizar: vi.fn().mockResolvedValue(10),
    vincularAutoria: vi.fn().mockResolvedValue(true),
    obtenerUltimoCorte: vi.fn().mockResolvedValue(null),
    registrarCorte: vi.fn().mockResolvedValue(undefined),
    actualizarJob: vi.fn().mockResolvedValue(undefined),
  } satisfies RepositorioProduccion;
}

describe("RF-020: corte incremental recuperable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(inicio);
    vi.mocked(consultarScopus).mockResolvedValue({ publicaciones: [] });
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("resuelve e inyecta la clave institucional en cada escaneo sin perder otras fuentes ante un fallo", async () => {
    const obtenerClaveScopus = vi.fn().mockResolvedValue("institucional-ficticia");
    const repo = { ...crearRepositorio(), obtenerClaveScopus };
    await ejecutarEscaneo({ fuentes: ["SCOPUS"] }, repo);
    expect(consultarScopus).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 2026, "institucional-ficticia");
    obtenerClaveScopus.mockRejectedValue(new Error("Configuración no disponible"));
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra] });
    const resultado = await ejecutarEscaneo({ fuentes: ["SCOPUS", "ORCID"] }, repo);
    expect(resultado.publicacionesGuardadas).toBe(1);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain("Scopus");
  });

  it("recupera diciembre al cambiar de año y todos los años desde el corte", async () => {
    const repo = crearRepositorio();
    repo.obtenerUltimoCorte.mockResolvedValue(new Date("2025-01-01T00:00:00Z"));
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(vi.mocked(consultarOrcid).mock.calls.map((llamada) => llamada[1])).toEqual([2024, 2025, 2026]);
    expect(repo.registrarCorte).toHaveBeenCalledWith(1, "ORCID", inicio);
  });

  it("sin corte comienza por el año actual", async () => {
    const repo = crearRepositorio();
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(consultarOrcid).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 1 }), 2026);
  });

  it("guarda publicaciones y autorías antes de avanzar el corte", async () => {
    const repo = crearRepositorio();
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra] });
    repo.registrarCorte.mockImplementation(async () => {
      expect(repo.persistirOActualizar).toHaveBeenCalledOnce();
      expect(repo.vincularAutoria).toHaveBeenCalledWith(10, 1);
    });
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(repo.registrarCorte).toHaveBeenCalledWith(1, "ORCID", inicio);
  });

  it.each(["publicacion", "autoria"])("conserva el corte si falla guardar %s y permite reintentar", async (fallo) => {
    const repo = crearRepositorio();
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra] });
    if (fallo === "publicacion") repo.persistirOActualizar.mockRejectedValueOnce(new Error("Fallo simulado"));
    else repo.vincularAutoria.mockRejectedValueOnce(new Error("Fallo simulado"));
    const resultado = await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(resultado.errores).toHaveLength(1);
    expect(repo.registrarCorte).not.toHaveBeenCalled();
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(repo.registrarCorte).toHaveBeenCalledOnce();
  });

  it("un fallo de una fuente no adelanta su corte ni bloquea otra fuente exitosa", async () => {
    const repo = crearRepositorio();
    vi.mocked(consultarScopus).mockResolvedValue({ publicaciones: [], error: "NO_API_KEY" });
    const resultado = await ejecutarEscaneo({ fuentes: ["SCOPUS", "ORCID"] }, repo);
    expect(resultado.errores).toHaveLength(1);
    expect(repo.registrarCorte).toHaveBeenCalledExactlyOnceWith(1, "ORCID", inicio);
  });

  it("no adelanta el corte con un año histórico solicitado explícitamente", async () => {
    const repo = crearRepositorio();
    await ejecutarEscaneo({ fuentes: ["ORCID"], anio: 2020 }, repo);
    expect(consultarOrcid).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 1 }), 2020);
    expect(repo.obtenerUltimoCorte).not.toHaveBeenCalled();
    expect(repo.registrarCorte).not.toHaveBeenCalled();
  });

  it("no avanza si falla un año intermedio aunque otro año tenga resultados", async () => {
    const repo = crearRepositorio();
    repo.obtenerUltimoCorte.mockResolvedValue(new Date("2025-03-01T00:00:00Z"));
    vi.mocked(consultarOrcid).mockResolvedValueOnce({ publicaciones: [obra] })
      .mockResolvedValueOnce({ publicaciones: [], error: "HTTP_503" });
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(repo.registrarCorte).not.toHaveBeenCalled();
    expect(repo.persistirOActualizar).not.toHaveBeenCalled();
  });

  it("si falla guardar el corte registra el error y conserva el resultado persistido", async () => {
    const repo = crearRepositorio();
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra] });
    repo.registrarCorte.mockRejectedValue(new Error("Fallo simulado"));
    const resultado = await ejecutarEscaneo({ fuentes: ["ORCID"] }, repo);
    expect(resultado.publicacionesGuardadas).toBe(1);
    expect(resultado.errores[0]).toContain("No se pudo guardar el corte");
  });
});
