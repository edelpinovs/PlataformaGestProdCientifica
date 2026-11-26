import { describe, expect, it } from "vitest";
import { resumenVacio } from "./lotes";
import { presentarResultadoEscaneo } from "./resultado-escaneo";

function datos(guardadas: number, errores: string[] = []) {
  return { version: 1, profesoresIds: [1], indice: 1,
    resumen: { ...resumenVacio(), publicacionesEncontradas: guardadas, publicacionesGuardadas: guardadas, errores } };
}

describe("Presentación segura del resultado del escaneo", () => {
  it("muestra resultados parciales aunque el trabajo persistido sea FALLIDO", () => {
    const resultado = presentarResultadoEscaneo("FALLIDO", datos(2, ["Scopus (Prof. 1): NO_API_KEY"]));
    expect(resultado?.tipo).toBe("aviso");
    expect(resultado?.mensaje).toContain("Guardadas o actualizadas: 2");
    expect(resultado?.incidencias).toEqual(["Scopus: falta configurar la clave de acceso en el servidor."]);
  });
  it("distingue un fallo total de una consulta sin coincidencias", () => {
    expect(presentarResultadoEscaneo("FALLIDO", datos(0, ["HTTP_503"]))?.tipo).toBe("error");
    expect(presentarResultadoEscaneo("COMPLETADO", datos(0))?.mensaje).toContain("No se encontraron publicaciones");
    expect(presentarResultadoEscaneo("COMPLETADO", datos(3))?.tipo).toBe("exito");
  });
  it("no revela mensajes arbitrarios ni datos de profesores", () => {
    const resultado = presentarResultadoEscaneo("FALLIDO", datos(1, ["Scopus (Prof. 1): secreto", "Persistencia: contraseña"]));
    expect(JSON.stringify(resultado)).not.toMatch(/secreto|contraseña|Prof\. 1/);
  });
  it("tolera trabajos antiguos y no anuncia resultados mientras están pendientes", () => {
    expect(presentarResultadoEscaneo("FALLIDO", null)?.tipo).toBe("error");
    expect(presentarResultadoEscaneo("EN_PROCESO", datos(1))).toBeNull();
  });

  it("distingue rechazos previos de autorías nuevas sin exponerlas como candidatas", () => {
    const trabajo = datos(0);
    trabajo.resumen = { ...trabajo.resumen, publicacionesEncontradas: 2, autoriasRechazadasOmitidas: 2 } as typeof trabajo.resumen;
    const resultado = presentarResultadoEscaneo("COMPLETADO", trabajo);
    expect(resultado?.mensaje).toContain("Autorías omitidas por rechazo previo: 2");
    expect(resultado?.mensaje).toContain("Autorías nuevas: 0");
    expect(resultado?.mensaje).toContain("Guardadas o actualizadas: 0");
  });

  it("muestra una sola línea por fuente con el motivo de su incidencia", () => {
    const trabajo = datos(3, ["Scopus (Prof. 1): NO_API_KEY"]);
    trabajo.resumen = { ...trabajo.resumen, consultasFuentes: [
      { profesorId: 1, fuente: "ORCID", estado: "SIN_RESULTADOS", cantidad: 0 },
      { profesorId: 1, fuente: "OPENALEX", estado: "NO_SELECCIONADA", cantidad: 0 },
      { profesorId: 1, fuente: "SCOPUS", estado: "INCIDENCIA", cantidad: 0 },
      { profesorId: 1, fuente: "CROSSREF", estado: "COMPLETADA", cantidad: 3 },
      { profesorId: 1, fuente: "GOOGLE_SCHOLAR", estado: "NO_SELECCIONADA", cantidad: 0 },
    ] } as typeof trabajo.resumen;
    const resultado = presentarResultadoEscaneo("FALLIDO", trabajo);
    expect(resultado?.fuentes).toEqual([
      { fuente: "ORCID", estado: "sin resultados" },
      { fuente: "OpenAlex", estado: "no seleccionada" },
      { fuente: "Scopus", estado: "falló", detalle: "falta configurar la clave de acceso en el servidor." },
      { fuente: "Crossref", estado: "consultada", obras: 3 },
      { fuente: "Google Scholar", estado: "no seleccionada" },
    ]);
    expect(resultado?.incidencias).toEqual([]);
  });

  it("une los motivos distintos de una misma fuente sin repetirlos", () => {
    const trabajo = datos(0, ["Scopus (Prof. 1): HTTP_429", "Scopus (Prof. 2): FALTA_IDENTIFICADOR", "Scopus (Prof. 3): HTTP_429"]);
    trabajo.resumen = { ...trabajo.resumen, consultasFuentes: [1, 2, 3].map((profesorId) => ({ profesorId, fuente: "SCOPUS" as const, estado: "INCIDENCIA" as const, cantidad: 0 })) };
    const scopus = presentarResultadoEscaneo("FALLIDO", trabajo)?.fuentes.find((linea) => linea.fuente === "Scopus");
    expect(scopus).toEqual({ fuente: "Scopus", estado: "falló",
      detalle: "se alcanzó el límite del proveedor. Reintenta más tarde. · falta un identificador o perfil necesario para consultar." });
  });

  it("#279: explica una búsqueda cancelada y conserva lo guardado", () => {
    const resultado = presentarResultadoEscaneo("CANCELADO", datos(2));
    expect(resultado?.tipo).toBe("aviso");
    expect(resultado?.mensaje).toContain("La búsqueda se canceló antes de terminar; se conserva lo guardado hasta ese momento.");
    expect(resultado?.mensaje).toContain("Guardadas o actualizadas: 2");
    expect(resultado?.mensaje).not.toContain("No se encontraron publicaciones");
    expect(presentarResultadoEscaneo("CANCELADO", null)?.mensaje).toBe("La búsqueda se canceló antes de terminar.");
  });
});
