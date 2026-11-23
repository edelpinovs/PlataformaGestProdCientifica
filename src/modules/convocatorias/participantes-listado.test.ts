import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  COLUMNAS_PARTICIPANTES,
  filtroParticipantes,
  listadoParticipantes,
  ordenParticipantes,
} from "./participantes-listado";

const definicion = listadoParticipantes([5, 6]);
const analizar = (parametros: Record<string, string> = {}) => analizarListado(definicion, parametros);
const consulta = (parametros: Record<string, string> = {}) => analizar(parametros).consulta;

describe("listado de participantes (RF-018)", () => {
  it("cada palabra busca en nombres, apellidos y código del profesor", () => {
    expect(filtroParticipantes(consulta({ q: "ana 2001" }))).toEqual({
      AND: ["ana", "2001"].map((p) => ({
        profesor: {
          OR: [
            { nombres: { contains: p, mode: "insensitive" } },
            { apellidos: { contains: p, mode: "insensitive" } },
            { codigo: { contains: p, mode: "insensitive" } },
          ],
        },
      })),
    });
    expect(filtroParticipantes(consulta())).toEqual({});
  });

  it("filtra por convocatoria, resultado (Sin resultado = nulo) y origen", () => {
    expect(filtroParticipantes(consulta({ convocatoria: "5", resultado: "PENDIENTE", origen: "LISTADO" })))
      .toEqual({ convocatoriaId: 5, resultado: null, origen: "LISTADO" });
    expect(filtroParticipantes(consulta({ resultado: "NO_APROBADO" }))).toEqual({ resultado: "NO_APROBADO" });
  });

  it("ignora y avisa una convocatoria o un resultado que no existen", () => {
    const { consulta: c, errores } = analizar({ convocatoria: "99", resultado: "TODO" });
    expect(c.filtros).toEqual({ convocatoria: "", resultado: "", origen: "" });
    expect(errores.convocatoria).toBe("Uno de los filtros tiene un valor que no existe.");
  });

  it("ordena por convocatoria más reciente por omisión y desempata por id", () => {
    expect(ordenParticipantes(consulta())).toEqual([{ convocatoria: { anio: "desc" } }, { convocatoria: { programa: "desc" } }, { id: "desc" }]);
    expect(ordenParticipantes(consulta({ orden: "profesor", dir: "asc" })))
      .toEqual([{ profesor: { apellidos: "asc" } }, { profesor: { nombres: "asc" } }, { id: "asc" }]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_PARTICIPANTES.map((c) => c.clave)).toEqual([...definicion.columnas]);
    for (const clave of definicion.columnas) expect(() => ordenParticipantes(consulta({ orden: clave }))).not.toThrow();
  });
});
