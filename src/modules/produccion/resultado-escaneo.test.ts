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
});
