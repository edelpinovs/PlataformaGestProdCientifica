import { describe, expect, it } from "vitest";
import { avanzarLote, datosLoteEsquema, resumenVacio, solicitudEscaneoEsquema, type DatosLote } from "./lotes";

describe("RF-020: reglas de lotes", () => {
  it.each(["abc", "0", "-1", "1.5", "2147483648", "9007199254740992"])("rechaza el profesor manipulado %s", (profesorId) => {
    const resultado = solicitudEscaneoEsquema.safeParse({ profesorId, desde: "", hasta: "", fuentes: ["ORCID"] });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0].message).toBe("Selecciona un profesor válido.");
  });
  it("valida el rango y el profesor en el servidor (#266)", () => {
    const rechazo = solicitudEscaneoEsquema.safeParse({ profesorId: "todos", desde: "1500-01-01", hasta: "", fuentes: ["ORCID"] });
    expect(rechazo.success).toBe(false);
    if (!rechazo.success) expect(rechazo.error.issues[0]).toMatchObject({ path: ["desde"], message: "La fecha inicial no puede ser anterior al 01/01/1990." });
    const sinRango = solicitudEscaneoEsquema.safeParse({ profesorId: "5", desde: "", hasta: "", fuentes: ["ORCID"] });
    expect(sinRango.success && sinRango.data.rango).toBeUndefined();
    const conRango = solicitudEscaneoEsquema.safeParse({ profesorId: "5", desde: "2024-03-15", hasta: "2025-06-30", fuentes: ["ORCID"] });
    expect(conRango.success && conRango.data.rango).toEqual({ desde: "2024-03-15", hasta: "2025-06-30" });
  });
  it.each([
    [{ desde: "2025-02-30", hasta: "" }, "desde", "Indica una fecha válida."],
    [{ desde: NaN, hasta: "" }, "desde", "Indica una fecha válida."],
    [{ desde: ["2025-01-01", "2025-02-01"], hasta: "" }, "desde", "Indica una fecha válida."],
    [{ desde: "", hasta: "2025-01-01" }, "desde", "Indica la fecha inicial del rango."],
    [{ desde: "2025-06-01", hasta: "2025-01-01" }, "hasta", "La fecha final debe ser igual o posterior a la fecha inicial."],
    [{ desde: "2010-01-01", hasta: "2025-12-31" }, "hasta", "El rango puede abarcar como máximo 10 años calendario."],
  ])("rechaza un rango atípico con mensaje en español: %j", (rango, campo, mensaje) => {
    const resultado = solicitudEscaneoEsquema.safeParse({ profesorId: "todos", ...rango, fuentes: ["ORCID"] });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues).toContainEqual(expect.objectContaining({ path: [campo], message: mensaje }));
  });
  it("el campo ausente cuenta como vacío solo si llega como cadena; un envío sin el campo se rechaza en español", () => {
    const resultado = solicitudEscaneoEsquema.safeParse({ profesorId: "todos", fuentes: ["ORCID"] });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues.map(error => error.message)).toEqual(["Indica una fecha válida.", "Indica una fecha válida."]);
  });
  it("el trabajo guarda el rango y acepta trabajos anteriores con un solo año", () => {
    expect(datosLoteEsquema.safeParse({ version: 1, profesoresIds: [1], indice: 0, desde: "2024-03-15", hasta: "2025-06-30", resumen: resumenVacio() }).success).toBe(true);
    expect(datosLoteEsquema.safeParse({ version: 1, profesoresIds: [1], indice: 0, anio: 2024, resumen: resumenVacio() }).success).toBe(true);
    const invalido = datosLoteEsquema.safeParse({ version: 1, profesoresIds: [1], indice: 0, desde: "2024-02-30", resumen: resumenVacio() });
    expect(invalido.success).toBe(false);
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

  it("suma las exclusiones al continuar lotes y admite trabajos antiguos sin ese contador", () => {
    const datos: DatosLote = { version: 1, profesoresIds: [1,2], indice: 0, resumen: { ...resumenVacio(), autoriasRechazadasOmitidas: 3 } };
    const siguiente = avanzarLote(datos, { ...resumenVacio(), autoriasRechazadasOmitidas: 2 });
    expect(siguiente.resumen.autoriasRechazadasOmitidas).toBe(5);
    expect(datos.resumen.autoriasRechazadasOmitidas).toBe(3);
    const resumenAntiguo: Partial<typeof datos.resumen> = { ...datos.resumen };
    delete resumenAntiguo.autoriasRechazadasOmitidas;
    const antiguo = { ...datos, resumen: resumenAntiguo };
    expect(datosLoteEsquema.parse(antiguo).resumen.autoriasRechazadasOmitidas).toBe(0);
  });
});
