import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  departamento: { findMany: vi.fn() },
  gradoCientifico: { findMany: vi.fn() },
  profesor: { findMany: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));

const pedir = (consulta = "") => GET(new Request(`http://localhost/profesores/exportar${consulta}`));

describe("exportar profesores a Excel (issue #233)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.departamento.findMany.mockResolvedValue([{ id: 4 }, { id: 8 }]);
    dobles.gradoCientifico.findMany.mockResolvedValue([{ id: 2 }]);
    dobles.profesor.findMany.mockResolvedValue([{
      codigo: "DEMO0001", apellidos: "Apellido Uno", nombres: "Nombre Uno", correo: "profesor01@demo.invalid",
      tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO", grado: { nombre: "Doctorado" }, departamento: null,
    }]);
  });

  it("exige el permiso del módulo antes de leer datos", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("sin permiso"));
    await expect(pedir()).rejects.toThrow("sin permiso");
    expect(dobles.requireModulo).toHaveBeenCalledWith("profesores");
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
  });

  it("descarga un .xlsx sin guardarlo en caché", async () => {
    const respuesta = await pedir();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(respuesta.headers.get("Content-Disposition")).toBe('attachment; filename="profesores.xlsx"');
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK"); // un .xlsx es un zip
  });

  it("trae todas las filas que coinciden, sin paginar, con el filtro y el orden pedidos", async () => {
    await pedir("?situacion=inactivos&departamento=8&orden=codigo&dir=desc&pagina=3");
    const consulta = dobles.profesor.findMany.mock.calls[0][0];
    expect(consulta.skip).toBeUndefined();
    expect(consulta.take).toBeUndefined();
    expect(consulta.where).toMatchObject({ estatusLaboral: { not: "ACTIVO" }, departamentoId: 8 });
    expect(consulta.orderBy[0]).toEqual({ codigo: "desc" });
  });

  it("no pide CVU, ORCID ni identificadores de Scholar o Scopus", async () => {
    await pedir();
    const { select } = dobles.profesor.findMany.mock.calls[0][0];
    for (const campo of ["cvu", "orcid", "scholarId", "scopusId"]) expect(select).not.toHaveProperty(campo);
  });

  it("un parámetro inválido responde 400 en español, sin consultar profesores", async () => {
    const respuesta = await pedir("?situacion=jubilados&orden=orcid");
    expect(respuesta.status).toBe(400);
    const mensaje = await respuesta.text();
    expect(mensaje).toContain("No se pudo exportar");
    expect(mensaje).toContain("Uno de los filtros tiene un valor que no existe.");
    expect(mensaje).not.toMatch(/Invalid|expected/i);
    expect(dobles.profesor.findMany).not.toHaveBeenCalled();
  });
});
