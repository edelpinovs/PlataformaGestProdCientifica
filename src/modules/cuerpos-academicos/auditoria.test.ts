import { describe, expect, it } from "vitest";
import {
  idIntegrante,
  resumenCuerpoEliminado,
  resumenIntegranteQuitado,
  resumenLgacEliminada,
} from "./auditoria";

describe("resúmenes de bitácora de Cuerpos Académicos (#379)", () => {
  it("el borrado de un CA lleva su clave y su id", () => {
    expect(resumenCuerpoEliminado("UACJ-CA-01", 7)).toBe("Eliminó el cuerpo académico UACJ-CA-01 (id 7).");
  });

  it("el borrado de una LGAC lleva su id y la clave del CA, no su nombre", () => {
    expect(resumenLgacEliminada(12, "UACJ-CA-01")).toBe("Eliminó la LGAC id 12 del cuerpo académico UACJ-CA-01.");
  });

  it("quitar a un integrante lo identifica por su código, nunca por su nombre", () => {
    const resumen = resumenIntegranteQuitado("UACJ-CA-01", { id: 3, codigo: "P-0042" });
    expect(resumen).toBe("Eliminó al integrante con código P-0042 del cuerpo académico UACJ-CA-01.");
  });

  it("sin código del profesor usa su id y no lo llama «código»", () => {
    const resumen = resumenIntegranteQuitado("UACJ-CA-01", { id: 3, codigo: null });
    expect(resumen).toBe("Eliminó al integrante con id 3 del cuerpo académico UACJ-CA-01.");
    expect(resumen).not.toMatch(/código/);
  });

  it("el vínculo integrante se identifica por el par cuerpo:profesor", () => {
    expect(idIntegrante(7, 3)).toBe("7:3");
  });
});
