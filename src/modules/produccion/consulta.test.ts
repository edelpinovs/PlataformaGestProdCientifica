import { describe, expect, it } from "vitest";
import { analizarConsulta, CONSULTA_INICIAL, enlaceConsulta, filtroPublicaciones, paginarPublicaciones } from "./consulta";

describe("RF-PC-01, RF-PC-09 y RF-PC-10: consulta de publicaciones", () => {
  it("sin parámetros empieza en la primera página con límite de 20", () => {
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
      expect(resultado.error.issues[0].message).toMatch(/^(Selecciona|Indica|Escribe|La )/);
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
    expect(filtro.OR).toHaveLength(3);
    expect(filtro.OR?.[0]).toEqual({ titulo: { contains: "inteligencia", mode: "insensitive" } });
    expect(filtro.fechaPublicacion).toEqual({ gte: new Date("2024-01-01T00:00:00Z"), lt: new Date("2025-01-01T00:00:00Z") });
  });

  it("los filtros ausentes no excluyen obras sin fecha o sin autorías", () => {
    expect(filtroPublicaciones(CONSULTA_INICIAL)).toEqual({});
  });

  it("trata porcentajes y guiones bajos como texto, no como comodines SQL", () => {
    const filtro = filtroPublicaciones({ ...CONSULTA_INICIAL, texto: "50%_\\" });
    expect(filtro.OR?.[0].titulo?.contains).toBe("50\\%\\_\\\\");
  });

  it.each(["20", "50", "100"] as const)("acepta páginas de %s filas sin superar el límite", (tamanio) => {
    expect(analizarConsulta({ tamanio }).success).toBe(true);
    const pagina = paginarPublicaciones(251, { ...CONSULTA_INICIAL, tamanio, pagina: "2" });
    expect(pagina.salto).toBe(Number(tamanio));
    expect(pagina.hasta - pagina.desde + 1).toBeLessThanOrEqual(Number(tamanio));
  });

  it("una página excesiva se ajusta a la última antes de calcular el desplazamiento", () => {
    expect(paginarPublicaciones(30, { ...CONSULTA_INICIAL, pagina: "999999" })).toEqual({
      pagina: 2, tamanio: 20, totalPaginas: 2, salto: 20, desde: 21, hasta: 30,
    });
  });

  it("sin resultados indica cero filas y una página sin desplazamiento", () => {
    expect(paginarPublicaciones(0, { ...CONSULTA_INICIAL, pagina: "2" })).toEqual({
      pagina: 1, tamanio: 20, totalPaginas: 1, salto: 0, desde: 0, hasta: 0,
    });
  });

  it("los enlaces conservan los filtros y codifican caracteres especiales", () => {
    const consulta = { ...CONSULTA_INICIAL, texto: "a & b/DOI", profesor: "7", anio: "2024", tamanio: "50" as const, estado: "PENDIENTE" as const };
    const enlace = new URL(enlaceConsulta(consulta, 3), "https://ejemplo.invalid");
    expect(enlace.hash).toBe("#publicaciones");
    expect(enlace.searchParams.get("texto")).toBe(consulta.texto);
    expect(enlace.searchParams.get("profesor")).toBe("7");
    expect(enlace.searchParams.get("estado")).toBe("PENDIENTE");
    expect(enlace.searchParams.get("pagina")).toBe("3");
    expect(enlace.searchParams.get("tamanio")).toBe("50");
  });
});
