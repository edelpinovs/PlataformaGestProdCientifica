import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { ESTADOS_HISTORIAL, idRegistroHistorial, LISTADO_CONTINUIDAD, LISTADO_HISTORIAL, nombreProfesor, periodoProximaConsulta, sqlContinuidad, sqlHistorial, textoAvance, TIPO_ESTADO_HISTORIAL, TIPOS_HISTORIAL } from "./historial";

describe("historial y continuidad de Producción (#169)", () => {
  it("distingue primera consulta, Scopus inicial y solapamiento sin usar fechas de publicaciones", () => {
    const hoy = new Date("2026-11-09T12:00:00Z");
    expect(periodoProximaConsulta("ORCID",null,hoy)).toBe("Historial inicial completo");
    expect(periodoProximaConsulta("SCOPUS",null,hoy)).toBe("2026 (inicio según la fuente)");
    expect(periodoProximaConsulta("ORCID",new Date("2025-01-01"),hoy)).toBe("2024–2026 (incluye solapamiento)");
  });
  it.each([LISTADO_HISTORIAL,LISTADO_CONTINUIDAD])("rechaza columnas y filtros manipulados sin interpolarlos en SQL", definicion => {
    const { consulta, errores } = analizarListado(definicion,{ orden: "id; DROP TABLE", q: "50%_\\'", fuente: "inventada", estado: "inventado" });
    expect(errores.orden).toBe("Ordena por una columna válida.");
    const sql = definicion === LISTADO_HISTORIAL ? sqlHistorial(consulta) : sqlContinuidad(consulta);
    expect(sql.contar.text).not.toContain("50%");
    expect(sql.contar.values).toContain("%50\\%\\_\\\\'%");
    expect(sql.pagina(10,10).text).not.toContain("DROP TABLE");
    expect(sql.pagina(10,10).values.slice(-2)).toEqual([10,10]);
  });
  it("el historial filtra solo trabajos de escaneo y busca sobre datos mostrados, sin errores técnicos", () => {
    const { consulta } = analizarListado(LISTADO_HISTORIAL,{ estado: "FALLIDO", tipo: "escaneo-manual" });
    const sql = sqlHistorial(consulta);
    expect(sql.contar.values).toContain("FALLIDO");
    expect(sql.contar.text).toContain("j.tipo IN ('escaneo-manual','escaneo-diario')");
    expect(sql.contar.text).not.toContain("j.error");
    expect(sql.contar.text).toContain("No registradas");
  });
  it("los puntos de continuación incluyen profesores sin corte y separan cada fuente", () => {
    const sql = sqlContinuidad(analizarListado(LISTADO_CONTINUIDAD,{}).consulta);
    expect(sql.contar.text).toContain('LEFT JOIN "CorteEscaneo"');
    expect(sql.contar.text).toContain('c."profesorId" = p.id AND c.fuente::text = f.fuente');
    expect(sql.contar.text).toContain("Sin búsqueda previa completada");
    expect(sql.contar.values).toEqual(["ORCID","OPENALEX","SCOPUS","CROSSREF","GOOGLE_SCHOLAR"]);
  });
  it("el historial muestra el nombre del profesor, no «Profesor #107», y conserva el número si ya no existe (#189)", () => {
    expect(nombreProfesor({ apellidos: "Ficticia", nombres: "Persona", codigo: "DEMO-107" })).toBe("Ficticia, Persona · DEMO-107");
    const texto = sqlHistorial(analizarListado(LISTADO_HISTORIAL,{}).consulta).contar.text;
    expect(texto).toContain('FROM "Profesor" p');
    expect(texto).toContain("p.apellidos || ', ' || p.nombres || ' · ' || p.codigo");
    expect(texto).toContain("COALESCE(");
    expect(texto).toContain("'Profesor #' ||");
  });
  it("las etiquetas de estado y tipo del SQL salen de los mismos mapas que los filtros (#189)", () => {
    const texto = sqlHistorial(analizarListado(LISTADO_HISTORIAL,{}).consulta).contar.text;
    for (const etiqueta of [...Object.values(ESTADOS_HISTORIAL), ...Object.values(TIPOS_HISTORIAL)]) expect(texto).toContain(`'${etiqueta}'`);
    expect(LISTADO_HISTORIAL.filtros?.tipo).toEqual(Object.keys(TIPOS_HISTORIAL));
  });
  it.each([undefined, ["1","2"], "0", "Infinity", "2147483648", "9007199254740992"])("rechaza un detalle inválido sin consultar un Job arbitrario (%j)", valor => {
    expect(idRegistroHistorial.safeParse(valor).success).toBe(false);
  });
});

describe("presentación del historial (#330)", () => {
  it("concuerda el avance en singular y plural", () => {
    expect(textoAvance(1, 1)).toBe("1 de 1 profesor revisado");
    expect(textoAvance(0, 1)).toBe("0 de 1 profesor revisado");
    expect(textoAvance(3, 30)).toBe("3 de 30 profesores revisados");
  });

  it("da color a cada estado terminado y deja neutros los pendientes", () => {
    expect(Object.keys(TIPO_ESTADO_HISTORIAL).sort()).toEqual(Object.keys(ESTADOS_HISTORIAL).sort());
    expect(TIPO_ESTADO_HISTORIAL).toMatchObject({ COMPLETADO: "exito", FALLIDO: "aviso", PENDIENTE: null, EN_PROCESO: null });
  });

  it("muestra las fechas como dd/mm/aaaa hh:mm", () => {
    const consulta = analizarListado(LISTADO_HISTORIAL, {}).consulta;
    expect(JSON.stringify(sqlHistorial(consulta).contar)).toContain("DD/MM/YYYY HH24:MI");
  });
});
