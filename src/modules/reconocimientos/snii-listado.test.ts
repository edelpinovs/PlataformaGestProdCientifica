import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { filtroSnii, LISTADO_SNII, ordenSnii } from "./snii-listado";

// Issue 111 (D-009): listado de Reconocimientos SNII paginado, con búsqueda, orden y filtros. Datos inventados.
const consulta = (parametros: Record<string, string> = {}) => analizarListado(LISTADO_SNII, parametros);

describe("listado SNII: orden", () => {
  it("por omisión ordena por fecha de fin, de la más reciente a la más antigua, con desempate por id", () => {
    expect(ordenSnii(consulta().consulta)).toEqual([{ fin: "desc" }, { id: "desc" }]);
  });

  it("traduce cada columna permitida a su campo y rechaza las demás con un aviso en español", () => {
    expect(ordenSnii(consulta({ orden: "profesor", dir: "asc" }).consulta)).toEqual([{ profesor: { apellidos: "asc" } }, { id: "asc" }]);
    expect(ordenSnii(consulta({ orden: "nivel", dir: "desc" }).consulta)).toEqual([{ nivel: "desc" }, { id: "desc" }]);
    const invalida = consulta({ orden: "profesor.cvu" });
    expect(invalida.consulta.orden).toBe("fin");
    expect(invalida.errores.orden).toBe("Ordena por una columna válida.");
  });
});

describe("listado SNII: búsqueda y filtros", () => {
  it("busca en el nombre, los apellidos, el código y el CVU del profesor", () => {
    const or = filtroSnii(consulta({ q: "ana" }).consulta).OR;
    const contiene = { contains: "ana", mode: "insensitive" };
    expect(or).toEqual(expect.arrayContaining([
      { profesor: { is: { nombres: contiene } } },
      { profesor: { is: { apellidos: contiene } } },
      { profesor: { is: { codigo: contiene } } },
      { profesor: { is: { cvu: contiene } } },
    ]));
  });

  it("busca también por las etiquetas visibles de nivel, participación y resultado", () => {
    expect(filtroSnii(consulta({ q: "candidato" }).consulta).OR).toContainEqual({ nivel: "CANDIDATO" });
    expect(filtroSnii(consulta({ q: "renovación" }).consulta).OR).toContainEqual({ tipoParticipacion: "RENOVACION" });
    expect(filtroSnii(consulta({ q: "reconsideración" }).consulta).OR).toContainEqual({ resultado: "EN_RECONSIDERACION" });
  });

  it("busca por año, mes o día en las fechas de inicio y fin", () => {
    expect(filtroSnii(consulta({ q: "2027-01" }).consulta).OR).toContainEqual({
      inicio: { gte: new Date("2027-01-01T00:00:00.000Z"), lt: new Date("2027-02-01T00:00:00.000Z") },
    });
    expect(filtroSnii(consulta({ q: "2031" }).consulta).OR).toContainEqual({
      fin: { gte: new Date("2031-01-01T00:00:00.000Z"), lt: new Date("2032-01-01T00:00:00.000Z") },
    });
  });

  it("escapa %, _ y \\ en la búsqueda", () => {
    expect(filtroSnii(consulta({ q: "10%_\\" }).consulta).OR).toContainEqual({ profesor: { is: { nombres: { contains: "10\\%\\_\\\\", mode: "insensitive" } } } });
  });

  it("aplica los filtros de nivel, tipo de participación y resultado, y avisa un valor que no existe", () => {
    expect(filtroSnii(consulta({ nivel: "NIVEL_2", tipoParticipacion: "NUEVO_INGRESO", resultado: "APROBADO" }).consulta))
      .toEqual({ nivel: "NIVEL_2", tipoParticipacion: "NUEVO_INGRESO", resultado: "APROBADO" });
    const invalido = consulta({ nivel: "NIVEL_9" });
    expect(filtroSnii(invalido.consulta)).toEqual({});
    expect(invalido.errores.nivel).toBe("Uno de los filtros tiene un valor que no existe.");
  });
});

// Issue 248: filtro por estatus para ver los próximos a vencer.
describe("listado SNII: estatus", () => {
  const hoy = new Date("2026-11-27T00:00:00.000Z");

  it("filtra por estatus con la regla del reporte, sin pisar el filtro de resultado", () => {
    const where = filtroSnii(consulta({ estatus: "AMARILLO", resultado: "APROBADO" }).consulta, hoy);
    expect(where.resultado).toBe("APROBADO");
    expect(where.AND).toEqual([{ fin: { gte: hoy, lte: expect.any(Date) }, resultado: { in: ["APROBADO", "EN_RECONSIDERACION"] } }]);
  });

  it("ordenar por estatus es ordenar por la fecha de fin", () => {
    expect(ordenSnii(consulta({ orden: "estatus", dir: "asc" }).consulta)).toEqual([{ fin: "asc" }, { id: "asc" }]);
  });
});

