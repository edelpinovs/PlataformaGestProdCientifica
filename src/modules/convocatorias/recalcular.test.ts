import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { profesoresEnListado, recalcularConvocatoria } from "./recalcular";

// RF-018: la base es un doble; se revisa qué cambios pide el servicio.
const tx = {
  cargaResultados: { findFirst: vi.fn() },
  renglonResultado: { findMany: vi.fn() },
  participacionConvocatoria: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
};
const cliente = tx as unknown as Prisma.TransactionClient;

describe("recalcularConvocatoria", () => {
  beforeEach(() => vi.resetAllMocks());

  it("sin carga con ese estado no hay listado", async () => {
    tx.cargaResultados.findFirst.mockResolvedValue(null);
    expect(await profesoresEnListado(cliente, 5, "EN_REVISION")).toBeNull();
    expect(tx.cargaResultados.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { convocatoriaId: 5, estado: "EN_REVISION" } }));
  });

  it("el resultado oficial solo sale de una carga confirmada (RF-028 lo cuenta)", async () => {
    tx.cargaResultados.findFirst.mockResolvedValue(null);
    tx.participacionConvocatoria.findMany.mockResolvedValue([]);
    await recalcularConvocatoria(cliente, 5);
    expect(tx.cargaResultados.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { convocatoriaId: 5, estado: "CONFIRMADA" } }));
  });

  it("aprueba a quien aparece, no aprueba a quien falta y agrega a quien no estaba registrado", async () => {
    tx.cargaResultados.findFirst.mockResolvedValue({ id: 9 });
    tx.renglonResultado.findMany.mockResolvedValue([{ profesorId: 10 }, { profesorId: 30 }]);
    tx.participacionConvocatoria.findMany.mockResolvedValue([
      { id: 1, profesorId: 10, origen: "MANUAL", resultado: null },
      { id: 2, profesorId: 20, origen: "MANUAL", resultado: null },
    ]);
    await recalcularConvocatoria(cliente, 5);
    expect(tx.participacionConvocatoria.createMany).toHaveBeenCalledWith({
      data: [{ convocatoriaId: 5, profesorId: 30, origen: "LISTADO", resultado: "APROBADO" }], skipDuplicates: true,
    });
    expect(tx.participacionConvocatoria.updateMany).toHaveBeenCalledWith({ where: { id: { in: [1] } }, data: { resultado: "APROBADO" } });
    expect(tx.participacionConvocatoria.updateMany).toHaveBeenCalledWith({ where: { id: { in: [2] } }, data: { resultado: "NO_APROBADO" } });
    expect(tx.participacionConvocatoria.deleteMany).not.toHaveBeenCalled();
  });
});
