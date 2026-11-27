import { describe, expect, it } from "vitest";
import { avanzarLote, datosLoteEsquema, resumenVacio, seleccionReintento, solicitudEscaneoEsquema, TIEMPO_RESERVA_MS, type DatosLote, consultasDeFuentes, erroresDeConsulta } from "./lotes";

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

describe("#279: reintentar un escaneo terminado", () => {
  type Consulta = NonNullable<DatosLote["resumen"]["consultasFuentes"]>[number];
  const trabajo = (consultas: Consulta[], errores: string[] = [], extra: Partial<DatosLote> = {}): DatosLote => ({
    version: 1, profesoresIds: [3, 5, 8], indice: 3, fuentes: ["ORCID", "OPENALEX", "SCOPUS"],
    resumen: { ...resumenVacio(), errores, consultasFuentes: consultas }, ...extra,
  });
  const consulta = (profesorId: number, fuente: Consulta["fuente"], estado: Consulta["estado"]): Consulta => ({ profesorId, fuente, estado, cantidad: 0 });

  it("reintenta solo los profesores y las fuentes que fallaron, en el orden del trabajo", () => {
    expect(seleccionReintento(trabajo([
      consulta(8, "OPENALEX", "INCIDENCIA"), consulta(3, "ORCID", "COMPLETADA"), consulta(3, "OPENALEX", "INCIDENCIA"), consulta(5, "ORCID", "SIN_RESULTADOS"),
    ], ["OpenAlex (Prof. 8): HTTP_429", "OpenAlex (Prof. 3): CONSULTA_FALLIDA"])))
      .toEqual({ ok: true, profesoresIds: [3, 8], fuentes: ["OPENALEX"] });
  });

  it("omite lo que falló solo por falta de clave y lo explica si no queda nada", () => {
    const soloClave = trabajo([consulta(3, "SCOPUS", "INCIDENCIA")], ["Scopus (Prof. 3): NO_API_KEY"]);
    expect(seleccionReintento(soloClave)).toEqual({ ok: false, error: "Las consultas fallaron porque falta la clave de acceso de una fuente. Configúrala antes de reintentar." });
    const mezcla = trabajo([consulta(3, "SCOPUS", "INCIDENCIA"), consulta(5, "ORCID", "INCIDENCIA")], ["Scopus (Prof. 3): NO_API_KEY", "ORCID (Prof. 5): HTTP_429"]);
    expect(seleccionReintento(mezcla)).toEqual({ ok: true, profesoresIds: [5], fuentes: ["ORCID"] });
  });

  it("incluye con todas sus fuentes a los profesores que quedaron sin revisar", () => {
    expect(seleccionReintento(trabajo([consulta(3, "ORCID", "INCIDENCIA")], ["ORCID (Prof. 3): HTTP_429"], { indice: 1 })))
      .toEqual({ ok: true, profesoresIds: [3, 5, 8], fuentes: ["ORCID", "OPENALEX", "SCOPUS"] });
  });

  it("no reintenta la falta de identificador, nueva o de búsquedas antiguas, y lo explica si no queda nada", () => {
    const nueva = trabajo([consulta(3, "ORCID", "SIN_IDENTIFICADOR"), consulta(3, "SCOPUS", "COMPLETADA")]);
    expect(seleccionReintento(nueva)).toEqual({ ok: false, error: "No hay nada que reintentar: a algunos profesores les falta el identificador de una fuente. Regístralo en Profesores y vuelve a buscar." });
    const antigua = trabajo([consulta(3, "ORCID", "INCIDENCIA"), consulta(5, "OPENALEX", "INCIDENCIA")], ["ORCID (Prof. 3): FALTA_IDENTIFICADOR", "OpenAlex (Prof. 5): HTTP_429"]);
    expect(seleccionReintento(antigua)).toEqual({ ok: true, profesoresIds: [5], fuentes: ["OPENALEX"] });
  });

  it("lee como SIN_IDENTIFICADOR las incidencias antiguas por falta de identificador y separa los errores reales", () => {
    const antigua = trabajo([consulta(3, "ORCID", "INCIDENCIA"), consulta(5, "ORCID", "INCIDENCIA")], ["ORCID (Prof. 3): FALTA_IDENTIFICADOR", "ORCID (Prof. 5): HTTP_429"]);
    expect(consultasDeFuentes(antigua.resumen).map((c) => c.estado)).toEqual(["SIN_IDENTIFICADOR", "INCIDENCIA"]);
    expect(erroresDeConsulta(antigua.resumen)).toEqual(["ORCID (Prof. 5): HTTP_429"]);
  });

  it("no propone un reintento vacío", () => {
    expect(seleccionReintento(trabajo([consulta(3, "ORCID", "COMPLETADA")]))).toEqual({ ok: false, error: "Esta búsqueda no tiene consultas fallidas ni profesores pendientes que reintentar." });
  });

  it("comparte el tiempo de reserva de diez minutos", () => {
    expect(TIEMPO_RESERVA_MS).toBe(10 * 60 * 1000);
  });
});
