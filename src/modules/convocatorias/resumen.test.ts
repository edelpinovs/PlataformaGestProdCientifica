import { describe, expect, it } from "vitest";
import { leerResumen } from "./resumen";

const resumen = {
  renglones: 9512,
  conCvu: 9500,
  conVigencia: 0,
  porNivel: { CANDIDATO: 3000, NIVEL_1: 6512 },
  avisos: [{ renglon: 12, mensaje: "Renglón 12: el CVU «12A4» no es válido; se guardó sin CVU." }],
  totalAvisos: 3,
};

describe("leerResumen (RF-017)", () => {
  it("lee el resumen que la lectura guardó en la tarea", () => {
    expect(leerResumen({ cargaId: 3, ruta: "snii/2025/x.pdf", resumen })).toEqual(resumen);
  });

  it("no inventa un resumen si la tarea aún no tiene uno o trae otra forma", () => {
    expect(leerResumen(null)).toBeNull();
    expect(leerResumen({ cargaId: 3 })).toBeNull();
    expect(leerResumen({ cargaId: 3, resumen: { ...resumen, renglones: "x" } })).toBeNull();
    expect(leerResumen("texto")).toBeNull();
  });
});
