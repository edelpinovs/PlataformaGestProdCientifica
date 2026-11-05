import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPublicaciones } from "./consultas";
import { CONSULTA_INICIAL } from "@/modules/produccion/consulta";

const dobles = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), transaccion: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: dobles.transaccion } }));

describe("RF-PC: lectura paginada de publicaciones", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.transaccion.mockImplementation(async (operacion) => operacion({ publicacion: { count: dobles.count, findMany: dobles.findMany } }));
    dobles.count.mockResolvedValue(30);
    dobles.findMany.mockResolvedValue([]);
  });

  it("cuenta publicaciones y limita la lectura usando un snapshot consistente", async () => {
    const resultado = await consultarPublicaciones({ ...CONSULTA_INICIAL, pagina: "999999" });
    expect(resultado.total).toBe(30);
    expect(resultado.pagina).toBe(2);
    expect(dobles.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, orderBy: [{ creadaEn: "desc" }, { id: "desc" }] }));
    expect(dobles.transaccion).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });

  it("usa exactamente las mismas condiciones para el total y las filas", async () => {
    await consultarPublicaciones({ ...CONSULTA_INICIAL, profesor: "3", estado: "VALIDADA", fuente: "SCOPUS" });
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
    expect(dobles.findMany.mock.calls[0][0].take).toBe(20);
  });
});
