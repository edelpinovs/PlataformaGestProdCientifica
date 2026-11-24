import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Carga de Calidad de datos (#278): de SNII y PRODEP solo se reporta vencido el último periodo de
// cada persona; un periodo anterior de quien ya renovó es historial (hallazgo 1 de la revisión del #303).
const dobles = vi.hoisted(() => ({
  prisma: {
    profesor: { findMany: vi.fn() },
    cuerpoAcademico: { findMany: vi.fn() },
    reconocimientoSnii: { findMany: vi.fn() },
    reconocimientoProdep: { findMany: vi.fn() },
  },
  cargarVigencias: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: dobles.prisma }));
vi.mock("@/modules/reportes/cargar-vigencias", () => ({ cargarVigencias: dobles.cargarVigencias }));

import { cargarHallazgos } from "./cargar";

const fecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const profesor = { nombres: "Ana", apellidos: "Pérez", departamento: { nombre: "Ciencias" } };
const snii = (id: number, profesorId: number, inicio: string, fin: string, resultado = "APROBADO") =>
  ({ id, profesorId, nivel: "NIVEL_I", resultado, inicio: fecha(inicio), fin: fecha(fin), profesor });
const prodep = (id: number, profesorId: number, inicio: string, fin: string) =>
  ({ id, profesorId, tipoSolicitud: "RENOVACION", resultado: "APROBADO", inicio: fecha(inicio), fin: fecha(fin), profesor: { ...profesor, departamento: null } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-24T15:00:00Z"));
  dobles.prisma.profesor.findMany.mockResolvedValue([]);
  dobles.prisma.cuerpoAcademico.findMany.mockResolvedValue([]);
  dobles.prisma.reconocimientoSnii.findMany.mockResolvedValue([]);
  dobles.prisma.reconocimientoProdep.findMany.mockResolvedValue([]);
  dobles.cargarVigencias.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

const vencidas = (hallazgos: Awaited<ReturnType<typeof cargarHallazgos>>) =>
  hallazgos.filter((h) => h.regla === "VIGENCIA_VENCIDA").map((h) => h.clave);

describe("cargarHallazgos: vigencias vencidas", () => {
  it("quien renovó SNII y PRODEP no aparece por sus periodos anteriores", async () => {
    dobles.prisma.reconocimientoSnii.findMany.mockResolvedValue([
      snii(1, 7, "2015-01-01", "2018-12-31"), snii(2, 7, "2019-01-01", "2022-12-31"), snii(3, 7, "2023-01-01", "2027-12-31"),
    ]);
    dobles.prisma.reconocimientoProdep.findMany.mockResolvedValue([
      prodep(4, 7, "2017-01-01", "2019-12-31"), prodep(5, 7, "2020-01-01", "2025-12-31"), prodep(6, 7, "2026-01-01", "2031-12-31"),
    ]);
    expect(vencidas(await cargarHallazgos())).toEqual([]);
  });

  it("quien no renovó, o cuya renovación no se aprobó, sí aparece una sola vez", async () => {
    dobles.prisma.reconocimientoSnii.findMany.mockResolvedValue([
      snii(1, 7, "2015-01-01", "2018-12-31"), snii(2, 7, "2019-01-01", "2022-12-31"),
      snii(3, 8, "2019-01-01", "2022-12-31"), snii(4, 8, "2023-01-01", "2027-12-31", "NO_APROBADO"),
    ]);
    expect(vencidas(await cargarHallazgos())).toEqual(["VIGENCIA_VENCIDA:snii-00000002", "VIGENCIA_VENCIDA:snii-00000003"]);
  });

  it("SNII y PRODEP se acotan por separado: un SNII vigente no oculta un PRODEP vencido", async () => {
    dobles.prisma.reconocimientoSnii.findMany.mockResolvedValue([snii(1, 7, "2023-01-01", "2027-12-31")]);
    dobles.prisma.reconocimientoProdep.findMany.mockResolvedValue([prodep(2, 7, "2019-01-01", "2024-12-31")]);
    const h = (await cargarHallazgos()).filter((x) => x.regla === "VIGENCIA_VENCIDA");
    expect(h.map((x) => x.clave)).toEqual(["VIGENCIA_VENCIDA:prodep-00000002"]);
    expect(h[0].detalle).toContain("PRODEP");
  });

  it("solo lee vigencias de profesores activos, como las demás reglas de profesores (hallazgo 2)", async () => {
    await cargarHallazgos();
    const where = { profesor: { estatusLaboral: "ACTIVO" } };
    expect(dobles.prisma.reconocimientoSnii.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(dobles.prisma.reconocimientoProdep.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });

  it("los cuerpos académicos siguen saliendo de Reportes y solo se le piden los cuerpos", async () => {
    await cargarHallazgos();
    expect(dobles.cargarVigencias).toHaveBeenCalledWith(["CA"]);
  });
});
