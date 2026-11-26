import { describe, expect, it, vi } from "vitest";
import { eventoAuditoria, resumenCargaConfirmada, resumenDictamen, resumenEliminacion } from "@/modules/administracion/auditoria";
import { registrarAuditoria } from "./auditoria";

const actor = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx" };

describe("registrarAuditoria", () => {
  it("pide crear el evento tal cual y devuelve la operación para la transacción", () => {
    const pendiente = Symbol("operacion");
    const create = vi.fn().mockReturnValue(pendiente);
    const evento = eventoAuditoria("validacion.dictaminada", actor, { tipo: "Publicacion", id: "7" }, resumenDictamen(7, "aprobada"));
    expect(registrarAuditoria({ auditoria: { create } }, evento)).toBe(pendiente);
    expect(create).toHaveBeenCalledWith({ data: evento });
  });
});

describe("acciones de otros módulos", () => {
  it("toman el módulo de la acción", () => {
    expect(eventoAuditoria("validacion.dictaminada", actor, { tipo: "Publicacion", id: "7" }, "x").modulo).toBe("validacion");
    expect(eventoAuditoria("carga.confirmada", actor, { tipo: "Carga", id: "3" }, "x").modulo).toBe("convocatorias");
  });

  it("un borrado toma el módulo de quien lo registra", () => {
    const e = eventoAuditoria("registro.eliminado", actor, { tipo: "Profesor", id: "9" }, resumenEliminacion("el profesor", "DEMO001"), "profesores");
    expect(e.modulo).toBe("profesores");
    expect(e.resumen).toBe("Eliminó el profesor DEMO001.");
  });

  it("un borrado sin módulo no falla: queda como «sistema»", () => {
    expect(eventoAuditoria("registro.eliminado", actor, { tipo: "X", id: "1" }, "x").modulo).toBe("sistema");
  });

  it("los resúmenes llevan identificadores y conteos", () => {
    expect(resumenDictamen(7, "aprobada")).toBe("Dictaminó la publicación 7: aprobada.");
    expect(resumenCargaConfirmada(3, 120, 45)).toBe("Confirmó la carga 3: 120 renglones, 45 reconocimientos creados.");
  });
});
