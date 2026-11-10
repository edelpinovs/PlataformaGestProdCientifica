import { describe, expect, it } from "vitest";
import { consultarVista, distribuirPagina, gruposEnumerados, filtroAutorias, ordenAutorias, retornoValidacion } from "./listados";
import { consultaResumen } from "./resumen-listado";

describe("consulta de Validación (#115)", () => {
  it("ordena por etiquetas españolas y pagina entre grupos sin saltar o repetir filas", () => {
    const { consulta } = consultarVista({ orden: "fuente" });
    expect(gruposEnumerados(consulta)).toEqual(["MANUAL", "GOOGLE_SCHOLAR", "OPENALEX", "ORCID", "SCOPUS"]);
    expect(gruposEnumerados({ ...consulta, dir: "desc" })).toEqual(["SCOPUS", "ORCID", "OPENALEX", "GOOGLE_SCHOLAR", "MANUAL"]);
    expect(distribuirPagina([{ valor: "A", total: 12 }, { valor: "B", total: 0 }, { valor: "C", total: 11 }], 10, 10)).toEqual([{ valor: "A", salto: 10, tamanio: 2 }, { valor: "C", salto: 0, tamanio: 8 }]);
    expect(distribuirPagina([{ valor: "A", total: 0 }], 0, 10)).toEqual([]);
  });
  it("abre pendientes, valida la vista y rechaza columnas y filtros manipulados en español", () => {
    const resultado = consultarVista({ vista: "externa", orden: "DROP", tipo: "INVALIDO", pagina: "NaN" });
    expect(resultado.vista).toBe("bandeja");
    expect(resultado.consulta.filtros.estado).toBe("PENDIENTE");
    expect(resultado.errores).toEqual({ vista: "Uno de los filtros tiene un valor que no existe.", orden: "Ordena por una columna válida.", tipo: "Uno de los filtros tiene un valor que no existe.", pagina: "La página debe ser un número entero entre 1 y 999999." });
  });

  it("mantiene la búsqueda, filtros, orden y página tras confirmar y rechazar", () => {
    const retorno = "vista=bandeja&q=agua&fuente=ORCID&tipo=ARTICULO&estado=TODOS&orden=profesor&dir=desc&pagina=3";
    for (const accion of ["confirmada", "rechazada"]) {
      const url = new URL(retornoValidacion(retorno, `accion=${accion}`), "https://ejemplo.invalid");
      expect(url.pathname).toBe("/validacion");
      expect(Object.fromEntries(url.searchParams)).toEqual({ vista: "bandeja", q: "agua", fuente: "ORCID", tipo: "ARTICULO", estado: "TODOS", orden: "profesor", dir: "desc", pagina: "3", accion });
    }
    expect(retornoValidacion("https://externo.invalid/?q=mal", "accion=confirmada")).toMatch(/^\/validacion\?/);
  });

  it("consultar todos los estados sigue funcionando al paginar o volver de una acción", () => {
    const { consulta } = consultarVista({ estado: "" });
    expect(consulta.filtros.estado).toBe("TODOS");
    expect(filtroAutorias(consulta, 42)).toMatchObject({ profesorId: 42 });
    expect(filtroAutorias(consulta, 42)).not.toHaveProperty("estado");
    expect(retornoValidacion("estado=TODOS", "accion=confirmada")).toContain("estado=TODOS");
  });

  it("escapa comodines y limita la búsqueda del profesor a la autoría visible", () => {
    const { consulta } = consultarVista({ q: "50%_\\" });
    const filtro = filtroAutorias(consulta, 8);
    expect(filtro.profesorId).toBe(8);
    expect(filtro.OR?.[0]).toEqual({ profesor: { OR: [{ nombres: { contains: "50\\%\\_\\\\", mode: "insensitive" } }, { apellidos: { contains: "50\\%\\_\\\\", mode: "insensitive" } }, { codigo: { contains: "50\\%\\_\\\\", mode: "insensitive" } }] } });
    expect(JSON.stringify(filtro.OR?.[1])).not.toContain('"autorias"');
  });

  it("busca etiquetas traducidas de fuentes, tipos y estados y el año visible", () => {
    expect(filtroAutorias(consultarVista({ q: "Scopus" }).consulta).OR?.[1]).toMatchObject({ publicacion: { OR: expect.arrayContaining([{ fuente: { in: ["SCOPUS"] } }]) } });
    expect(filtroAutorias(consultarVista({ q: "2026" }).consulta).OR?.[1]).toMatchObject({ publicacion: { OR: expect.arrayContaining([{ fechaPublicacion: { gte: new Date("2026-01-01T00:00:00Z"), lt: new Date("2027-01-01T00:00:00Z") } }]) } });
  });

  it("desempata por la clave compuesta sin inventar un id de autoría", () => {
    const { consulta } = consultarVista({ orden: "profesor", dir: "desc" });
    expect(ordenAutorias(consulta)).toEqual([{ profesor: { apellidos: "desc" } }, { profesor: { nombres: "desc" } }, { publicacionId: "desc" }, { profesorId: "desc" }]);
  });

  it("los resúmenes parametrizan la búsqueda y el alcance docente sin interpolar SQL enviado por la persona", () => {
    const { consulta } = consultarVista({ vista: "profesores", q: "%' OR TRUE --", orden: "nombre; DROP TABLE" });
    const sql = consultaResumen("profesores", consulta, 42);
    expect(sql.contar.text).not.toContain("OR TRUE");
    expect(sql.contar.values).toContain("%\\%' OR TRUE --%");
    expect(sql.contar.values).toContain(42);
    expect(sql.pagina(20, 10).text).toContain("ORDER BY validadas DESC, id DESC LIMIT");
    expect(sql.pagina(20, 10).values.slice(-2)).toEqual([10, 20]);
    expect(sql.contar.text).toContain("a.estado = 'VALIDADA'");
  });

  it("valida el departamento contra opciones permitidas y lo parametriza en el resumen", () => {
    const valida = consultarVista({ vista: "profesores", departamento: "DEMO" }, ["DEMO"]);
    expect(valida.errores).toEqual({});
    expect(consultaResumen("profesores", valida.consulta).contar.values).toContain("DEMO");
    expect(consultarVista({ vista: "profesores", departamento: "OTRO" }, ["DEMO"]).errores.departamento).toBe("Uno de los filtros tiene un valor que no existe.");
  });
});
