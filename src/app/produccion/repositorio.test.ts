import { beforeEach, describe, expect, it, vi } from "vitest";
import { repositorioPrisma } from "./repositorio";
import { crearConsolidada } from "@/modules/produccion/deduplicacion";

const base = vi.hoisted(() => ({
  publicacion: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  autoria: { findUnique: vi.fn(), create: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: base }));

const obra = crearConsolidada({ tipo: "ARTICULO", titulo: "Estudio ficticio de coautoría",
  autoresTexto: "Persona ficticia", profesorId: 1, fuente: "ORCID", doi: "10.1000/coautoria-prueba", anio: 2026 });

describe("RF-021 y RF-022: persistencia concurrente", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    base.publicacion.findUnique.mockResolvedValue(null);
    base.$queryRaw.mockResolvedValue([]);
    base.publicacion.create.mockResolvedValue({ id: 10 });
    base.autoria.findUnique.mockResolvedValue(null);
    base.autoria.create.mockResolvedValue({ publicacionId: 10, profesorId: 1, estado: "PENDIENTE" });
  });

  it("recupera la publicación creada por otro escaneo entre buscar y guardar el DOI", async () => {
    base.publicacion.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 12, doi: obra.doi });
    base.publicacion.create.mockRejectedValue({ code: "P2002" });
    expect(await repositorioPrisma.persistirOActualizar(obra)).toBe(12);
    expect(base.publicacion.findUnique).toHaveBeenCalledTimes(2);
  });

  it("no oculta un P2002 si no puede recuperar la misma obra", async () => {
    const error = { code: "P2002" };
    base.publicacion.create.mockRejectedValue(error);
    await expect(repositorioPrisma.persistirOActualizar(obra)).rejects.toBe(error);
  });

  it("no trata otros fallos de la base como una publicación duplicada", async () => {
    const error = { code: "P2003" };
    base.publicacion.create.mockRejectedValue(error);
    await expect(repositorioPrisma.persistirOActualizar(obra)).rejects.toBe(error);
    expect(base.publicacion.findUnique).toHaveBeenCalledOnce();
  });

  it.each(["PENDIENTE", "VALIDADA", "RECHAZADA"])("conserva una autoría existente en estado %s", async (estado) => {
    base.autoria.findUnique.mockResolvedValue({ publicacionId: 10, profesorId: 1, estado });
    expect(await repositorioPrisma.vincularAutoria(10, 1)).toBe(estado === "RECHAZADA" ? "RECHAZADA" : false);
    expect(base.autoria.create).not.toHaveBeenCalled();
  });

  it("recupera una autoría creada o validada por otra petición sin reiniciar su estado", async () => {
    base.autoria.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ estado: "VALIDADA" });
    base.autoria.create.mockRejectedValue({ code: "P2002" });
    expect(await repositorioPrisma.vincularAutoria(10, 1)).toBe(false);
    expect(base.autoria.findUnique).toHaveBeenCalledTimes(2);
  });

  it("no oculta conflictos de autoría si la relación no existe", async () => {
    const error = { code: "P2002" };
    base.autoria.create.mockRejectedValue(error);
    await expect(repositorioPrisma.vincularAutoria(10, 1)).rejects.toBe(error);
  });

  it("respeta un rechazo concurrente al recuperar un conflicto de unicidad", async () => {
    base.autoria.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ estado: "RECHAZADA" });
    base.autoria.create.mockRejectedValue({ code: "P2002" });
    expect(await repositorioPrisma.vincularAutoria(10, 1)).toBe("RECHAZADA");
  });

  it("si falla pg_trgm impide crear publicaciones sin comprobar la similitud", async () => {
    base.$queryRaw.mockRejectedValue(new Error("Fallo técnico simulado"));
    await expect(repositorioPrisma.persistirOActualizar(obra)).rejects.toThrow("No se pudo comprobar la similitud");
    expect(base.publicacion.create).not.toHaveBeenCalled();
    expect(base.publicacion.findMany).not.toHaveBeenCalled();
  });

  it("una obra con DOI ya conocido no necesita la búsqueda de similitud", async () => {
    base.publicacion.findUnique.mockResolvedValue({ id: 10, doi: obra.doi });
    expect(await repositorioPrisma.persistirOActualizar(obra)).toBe(10);
    expect(base.$queryRaw).not.toHaveBeenCalled();
  });

  it("con título igual y DOI distintos conserva dos obras independientes", async () => {
    base.$queryRaw.mockResolvedValue([{ id: 3, titulo: obra.titulo, doi: "10.1000/otra-obra", fechaPublicacion: null }]);
    expect(await repositorioPrisma.persistirOActualizar(obra)).toBe(10);
    expect(base.publicacion.create).toHaveBeenCalledOnce();
  });
});
