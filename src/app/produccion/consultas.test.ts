import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPublicaciones } from "./consultas";
import { CONSULTA_INICIAL } from "@/modules/produccion/consulta";

const dobles = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn(), transaccion: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: dobles.transaccion } }));

describe("RF-PC: lectura paginada de publicaciones", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.transaccion.mockImplementation(async (operacion) => operacion({ publicacion: { count: dobles.count, findMany: dobles.findMany, groupBy: dobles.groupBy } }));
    dobles.count.mockResolvedValue(30);
    dobles.findMany.mockResolvedValue([]);
  });

  it("cuenta publicaciones y limita la lectura usando un snapshot consistente", async () => {
    const resultado = await consultarPublicaciones({ ...CONSULTA_INICIAL, pagina: 999999 });
    expect(resultado.total).toBe(30);
    expect(resultado.pagina).toBe(3);
    expect(dobles.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10, orderBy: [{ titulo: "asc" }, { id: "asc" }] }));
    expect(dobles.transaccion).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });

  it("usa exactamente las mismas condiciones para el total y las filas", async () => {
    await consultarPublicaciones({ ...CONSULTA_INICIAL, filtros: { ...CONSULTA_INICIAL.filtros, profesor: "3", estado: "VALIDADA", fuente: "SCOPUS" } });
    const whereTotal = dobles.count.mock.calls[0][0].where;
    expect(dobles.findMany.mock.calls[0][0].where).toEqual(whereTotal);
    expect(whereTotal.autorias.some).toEqual({ profesorId: 3, estado: "VALIDADA" });
    expect(whereTotal.fuente).toBe("SCOPUS");
  });

  it("sin resultados mantiene el límite y no pide páginas negativas", async () => {
    dobles.count.mockResolvedValue(0);
    const resultado = await consultarPublicaciones(CONSULTA_INICIAL);
    expect(resultado.desde).toBe(0);
    expect(resultado.hasta).toBe(0);
    expect(dobles.findMany.mock.calls[0][0].skip).toBe(0);
    expect(dobles.findMany.mock.calls[0][0].take).toBe(10);
  });

  it("no carga todas las obras para ordenar por el texto del tipo", async () => {
    dobles.groupBy.mockResolvedValue([
      { tipo: "LIBRO", _count: { _all: 10 } }, { tipo: "ARTICULO", _count: { _all: 5 } }, { tipo: "CAPITULO", _count: { _all: 3 } },
    ]);
    await consultarPublicaciones({ ...CONSULTA_INICIAL, orden: "tipo" });
    expect(dobles.findMany.mock.calls.map(([opciones]) => [opciones.where.tipo, opciones.take])).toEqual([["ARTICULO", 5], ["CAPITULO", 3], ["LIBRO", 2]]);
    expect(dobles.findMany.mock.calls.reduce((total, [opciones]) => total + opciones.take, 0)).toBe(10);
  });
});
