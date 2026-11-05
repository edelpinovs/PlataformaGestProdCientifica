import { describe, expect, it } from "vitest";
import { avanzarLote, datosLoteEsquema, resumenVacio, solicitudEscaneoEsquema, type DatosLote } from "./lotes";

describe("RF-020: reglas de lotes", () => {
  it.each(["abc", "0", "-1", "1.5", "9007199254740992"])("rechaza el profesor manipulado %s", (profesorId) => {
    const resultado = solicitudEscaneoEsquema.safeParse({ profesorId, anio: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0].message).toBe("Selecciona un profesor válido.");
  });
  it("valida el año y el profesor en el servidor", () => {
    expect(solicitudEscaneoEsquema.safeParse({ profesorId: "todos", anio: "1500" }).success).toBe(false);
    expect(solicitudEscaneoEsquema.safeParse({ profesorId: "5", anio: "" }).success).toBe(true);
  });
  it("rechaza índices fuera de la instantánea", () => {
    expect(datosLoteEsquema.safeParse({ version: 1, profesoresIds: [1], indice: 2, resumen: resumenVacio() }).success).toBe(false);
  });
  it("avanza aunque la fuente falle y conserva el resultado sin mutar el estado previo", () => {
    const datos: DatosLote = { version: 1, profesoresIds: [1, 2], indice: 0, resumen: resumenVacio() };
    const siguientes = avanzarLote(datos, { ...resumenVacio(), errores: ["Fallo simulado"] });
    expect(siguientes.indice).toBe(1);
    expect(siguientes.resumen.errores).toEqual(["Fallo simulado"]);
    expect(datos.indice).toBe(0);
    expect(datos.resumen.errores).toEqual([]);
  });
});
