import { describe, expect, it } from "vitest";
import { analizarBusqueda, textoDuracion } from "./detalle-busqueda";
import { resumenVacio, type DatosLote } from "./lotes";

type Consulta = NonNullable<DatosLote["resumen"]["consultasFuentes"]>[number];
const consulta = (profesorId: number, fuente: Consulta["fuente"], estado: Consulta["estado"], cantidad = 0): Consulta => ({ profesorId, fuente, estado, cantidad });
const trabajo = (consultas: Consulta[], extra: Partial<DatosLote> = {}): DatosLote => ({
  version: 1, profesoresIds: [3, 5, 8], indice: 3, fuentes: ["ORCID", "OPENALEX", "SCOPUS"],
  resumen: { ...resumenVacio(), consultasFuentes: consultas, procedencia: [{ publicacionId: 40, fuentes: ["ORCID", "OPENALEX"] }, { publicacionId: 41, fuentes: ["SCOPUS"] }] },
  ...extra,
});

describe("detalle de una búsqueda", () => {
  it("suma las obras que devolvieron las fuentes", () => {
    const analisis = analizarBusqueda(trabajo([
      consulta(3, "SCOPUS", "COMPLETADA", 2), consulta(3, "ORCID", "COMPLETADA", 4), consulta(5, "ORCID", "SIN_RESULTADOS"), consulta(8, "ORCID", "COMPLETADA", 1),
    ]));
    expect(analisis.obrasRecibidas).toBe(7);
  });

  it("ordena a los profesores: primero con fallos, luego por obras, y al final los no revisados", () => {
    const analisis = analizarBusqueda(trabajo([
      consulta(3, "ORCID", "COMPLETADA", 9), consulta(5, "SCOPUS", "INCIDENCIA"), consulta(5, "OPENALEX", "INCIDENCIA"), consulta(5, "SCOPUS", "INCIDENCIA"),
    ], { indice: 2 }));
    expect(analisis.profesores).toEqual([
      { profesorId: 5, obras: 0, fuentesConFallo: ["Scopus", "OpenAlex"], revisado: true },
      { profesorId: 3, obras: 9, fuentesConFallo: [], revisado: true },
      { profesorId: 8, obras: 0, fuentesConFallo: [], revisado: false },
    ]);
  });

  it("lista las publicaciones guardadas con el nombre de sus fuentes", () => {
    expect(analizarBusqueda(trabajo([])).publicaciones).toEqual([
      { publicacionId: 40, fuentes: ["ORCID", "OpenAlex"] }, { publicacionId: 41, fuentes: ["Scopus"] },
    ]);
  });

  it("tolera búsquedas antiguas sin consultas ni procedencia", () => {
    const antiguo = trabajo([]);
    antiguo.resumen = resumenVacio();
    expect(analizarBusqueda(antiguo)).toMatchObject({ obrasRecibidas: 0, publicaciones: [], consultasRegistradas: false, publicacionesRegistradas: false });
    expect(analizarBusqueda(trabajo([]))).toMatchObject({ consultasRegistradas: true, publicacionesRegistradas: true });
  });

  it("la falta de identificador no cuenta como fuente que falló, tampoco en búsquedas antiguas", () => {
    const datos = trabajo([consulta(3, "ORCID", "SIN_IDENTIFICADOR"), consulta(5, "ORCID", "INCIDENCIA"), consulta(8, "SCOPUS", "INCIDENCIA")]);
    datos.resumen.errores = ["ORCID (Prof. 5): FALTA_IDENTIFICADOR", "Scopus (Prof. 8): HTTP_429"];
    const porId = Object.fromEntries(analizarBusqueda(datos).profesores.map((p) => [p.profesorId, p.fuentesConFallo]));
    expect(porId).toEqual({ 3: [], 5: [], 8: ["Scopus"] });
  });

  it("expresa la duración en español y no inventa una si falta el fin", () => {
    const inicio = new Date("2026-11-24T20:00:00Z");
    expect(textoDuracion(inicio, "2026-11-24T20:00:20Z")).toBe("Menos de un minuto");
    expect(textoDuracion(inicio, "2026-11-24T20:12:00Z")).toBe("12 min");
    expect(textoDuracion(inicio, "2026-11-24T21:00:00Z")).toBe("1 h");
    expect(textoDuracion(inicio, "2026-11-24T21:05:00Z")).toBe("1 h 5 min");
    expect(textoDuracion(inicio, null)).toBe("");
    expect(textoDuracion(inicio, "no es fecha")).toBe("");
    expect(textoDuracion(inicio, "2026-11-24T19:00:00Z")).toBe("");
  });
});
