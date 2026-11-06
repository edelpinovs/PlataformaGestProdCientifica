import { describe, expect, it } from "vitest";
import { analizarConsulta, CONSULTA_INICIAL, enlaceConsulta, filtroPublicaciones, paginarPublicaciones, paginasVisibles, redireccionConsultaAnterior, ordenPublicaciones, tramosPorEtiqueta, ETIQUETAS_TIPO } from "./consulta";

describe("RF-PC-01, RF-PC-09 y RF-PC-10: consulta de publicaciones", () => {
  it("sin parámetros empieza en la primera página con límite de 10", () => {
    const resultado = analizarConsulta({});
    expect(resultado.success).toBe(true);
    if (resultado.success) expect(resultado.data).toEqual(CONSULTA_INICIAL);
  });

  it.each([
    { profesor: "-1" }, { profesor: "1.5" }, { profesor: "2147483648" },
    { profesor: ["1", "2"] }, { texto: ["uno", "dos"] }, { anio: "1800" }, { anio: "2101" },
    { estado: "APROBADA" }, { fuente: "DESCONOCIDA" }, { tipo: "DESCONOCIDO" },
    { tamanio: "50000" }, { tamanio: ["20", "100"] }, { pagina: "0" },
    { pagina: "NaN" }, { pagina: "1.5" }, { pagina: "1000001" }, { texto: "a".repeat(201) },
  ])("rechaza parámetros manipulados con mensajes en español: %j", (parametros) => {
    const resultado = analizarConsulta(parametros);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toMatch(/^(Selecciona|Indica|Escribe|La |El |Uno )/);
      expect(resultado.error.issues[0].message).not.toContain("Invalid");
    }
  });

  it("combina todos los filtros y obliga a que profesor y estado sean de la misma autoría", () => {
    const resultado = analizarConsulta({ texto: "  inteligencia  ", profesor: "7", anio: "2024", tipo: "ARTICULO", fuente: "ORCID", estado: "VALIDADA" });
    if (!resultado.success) throw new Error("La consulta de prueba debe ser válida.");
    const filtro = filtroPublicaciones(resultado.data);
    expect(filtro.autorias).toEqual({ some: { profesorId: 7, estado: "VALIDADA" } });
    expect(filtro.tipo).toBe("ARTICULO");
    expect(filtro.fuente).toBe("ORCID");
    expect(filtro.OR).toContainEqual({ titulo: { contains: "inteligencia", mode: "insensitive" } });
    expect(filtro.OR).toContainEqual({ revistaEditorial: { contains: "inteligencia", mode: "insensitive" } });
    expect(filtro.fechaPublicacion).toEqual({ gte: new Date("2024-01-01T00:00:00Z"), lt: new Date("2025-01-01T00:00:00Z") });
  });

  it("los filtros ausentes no excluyen obras sin fecha o sin autorías", () => {
    expect(filtroPublicaciones(CONSULTA_INICIAL)).toEqual({});
  });

  it("trata porcentajes y guiones bajos como texto, no como comodines SQL", () => {
    const filtro = filtroPublicaciones({ ...CONSULTA_INICIAL, q: "50%_\\" });
    expect(filtro.OR?.[0].titulo?.contains).toBe("50\\%\\_\\\\");
  });

  it.each(["20", "50", "100"] as const)("mantiene los enlaces antiguos de tamaño %s pero siempre lee de 10 en 10", (tamanio) => {
    const analisis = analizarConsulta({ tamanio, pagina: "2" });
    expect(analisis.success).toBe(true);
    const pagina = paginarPublicaciones(251, analisis.data);
    expect(pagina.salto).toBe(10);
    expect(pagina.tamanio).toBe(10);
    expect(pagina.hasta - pagina.desde + 1).toBeLessThanOrEqual(10);
  });

  it("una página excesiva se ajusta a la última antes de calcular el desplazamiento", () => {
    expect(paginarPublicaciones(30, { ...CONSULTA_INICIAL, pagina: 999999 })).toEqual({
      total: 30, pagina: 3, tamanio: 10, totalPaginas: 3, salto: 20, desde: 21, hasta: 30,
    });
  });

  it("sin resultados indica cero filas y una página sin desplazamiento", () => {
    expect(paginarPublicaciones(0, { ...CONSULTA_INICIAL, pagina: 2 })).toEqual({
      total: 0, pagina: 1, tamanio: 10, totalPaginas: 1, salto: 0, desde: 0, hasta: 0,
    });
  });

  it("los enlaces conservan los filtros y codifican caracteres especiales", () => {
    const consulta = { ...CONSULTA_INICIAL, q: "a & b/DOI", filtros: { ...CONSULTA_INICIAL.filtros, profesor: "7", anio: "2024", estado: "PENDIENTE" } };
    const enlace = new URL(enlaceConsulta(consulta, 3), "https://ejemplo.invalid");
    expect(enlace.hash).toBe("#publicaciones");
    expect(enlace.pathname).toBe("/produccion/publicaciones");
    expect(enlace.searchParams.get("q")).toBe(consulta.q);
    expect(enlace.searchParams.get("profesor")).toBe("7");
    expect(enlace.searchParams.get("estado")).toBe("PENDIENTE");
    expect(enlace.searchParams.get("pagina")).toBe("3");
    expect(enlace.searchParams.has("tamanio")).toBe(false);
  });

  it("sin filtros antiguos la entrada del módulo permanece en el resumen", () => {
    expect(redireccionConsultaAnterior({})).toBeNull();
    expect(redireccionConsultaAnterior({ desconocido: "valor" })).toBeNull();
  });

  it("no elimina parámetros duplicados de enlaces antiguos que deben rechazarse", () => {
    const ruta = redireccionConsultaAnterior({ profesor: ["1", "2"], tamanio: "50" });
    const parametros = new URL(ruta!, "https://ejemplo.invalid").searchParams;
    expect(parametros.getAll("profesor")).toEqual(["1", "2"]);
    expect(analizarConsulta({ profesor: parametros.getAll("profesor") }).success).toBe(false);
  });

  it.each([
    [1, 2, [1, 2]],
    [1, 100, [1, 2, 3, "separador", 100]],
    [50, 100, [1, "separador", 48, 49, 50, 51, 52, "separador", 100]],
    [100, 100, [1, "separador", 98, 99, 100]],
  ])("muestra números de página acotados para página %s de %s", (pagina, total, esperado) => {
    expect(paginasVisibles(pagina as number, total as number)).toEqual(esperado);
  });

  it.each(["titulo", "tipo", "revista", "profesores", "fuente"])("acepta y estabiliza el orden de %s", (orden) => {
    const resultado = analizarConsulta({ orden, dir: "desc", q: "revista" });
    expect(resultado.success).toBe(true);
    expect(ordenPublicaciones(resultado.data).at(-1)).toEqual({ id: "desc" });
  });

  it("rechaza columnas y sentidos manipulados antes de construir el orderBy", () => {
    expect(analizarConsulta({ orden: "titulo; DROP TABLE", dir: "desc" }).success).toBe(false);
    expect(analizarConsulta({ orden: "titulo", dir: "otra" }).success).toBe(false);
  });

  it("busca por etiquetas de tipo, fuente, estado y datos del profesor", () => {
    const filtro = filtroPublicaciones({ ...CONSULTA_INICIAL, q: "capítulo" });
    expect(filtro.OR).toContainEqual({ tipo: { in: ["CAPITULO"] } });
    const profesores = filtroPublicaciones({ ...CONSULTA_INICIAL, q: "DEMO019" });
    expect(JSON.stringify(profesores.OR)).toContain('"codigo":{"contains":"DEMO019"');
    const fuente = filtroPublicaciones({ ...CONSULTA_INICIAL, q: "Scopus" });
    expect(fuente.OR).toContainEqual({ fuente: { in: ["SCOPUS"] } });
  });

  it("ordena etiquetas de enum alfabéticamente y lee solo los tramos de la página", () => {
    const grupos = [{ valor: "LIBRO", total: 10 }, { valor: "CAPITULO", total: 3 }, { valor: "ARTICULO", total: 5 }];
    expect(tramosPorEtiqueta(grupos, ETIQUETAS_TIPO, "asc", 0, 10)).toEqual([
      { valor: "ARTICULO", salto: 0, cantidad: 5 }, { valor: "CAPITULO", salto: 0, cantidad: 3 }, { valor: "LIBRO", salto: 0, cantidad: 2 },
    ]);
    expect(tramosPorEtiqueta(grupos, ETIQUETAS_TIPO, "asc", 10, 10)).toEqual([{ valor: "LIBRO", salto: 2, cantidad: 8 }]);
    expect(tramosPorEtiqueta(grupos, ETIQUETAS_TIPO, "desc", 0, 10)).toEqual([{ valor: "LIBRO", salto: 0, cantidad: 10 }]);
  });
});
