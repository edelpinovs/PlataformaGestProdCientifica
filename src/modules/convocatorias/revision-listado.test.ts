import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import type { FilaRevision } from "./balance";
import { COLUMNAS_REVISION, filtrarYOrdenarRevision, LISTADO_REVISION } from "./revision-listado";

const fila = (clave: string, datos: Partial<FilaRevision>): FilaRevision => ({
  clave, renglonId: 1, numero: 2, nombreListado: null, profesorId: null, criterio: null, clasificacion: "SIN_COINCIDENCIA", ...datos,
});
const filas = [
  fila("r1", { nombreListado: "RUIZ SOTO JUAN", criterio: "AMBIGUO", clasificacion: "DUDOSO" }),
  fila("r2", { nombreListado: "PÉREZ LÓPEZ ANA", profesorId: 10, criterio: "CVU", clasificacion: "PROMOCION" }),
  fila("p20", { renglonId: null, numero: null, profesorId: 20, clasificacion: "NO_APROBADO" }),
  fila("r3", { nombreListado: "NADIE NUNCA" }),
];
const nombres: Record<number, string> = { 10: "Pérez López, Ana · 2001", 20: "Mora Díaz, Luis · 2002" };
const nombreProfesor = (id: number) => nombres[id] ?? "";
const consulta = (p: Record<string, string> = {}) => analizarListado(LISTADO_REVISION, p).consulta;
const claves = (p: Record<string, string> = {}) => filtrarYOrdenarRevision(filas, consulta(p), nombreProfesor).map((f) => f.clave);

describe("listado de la revisión (RF-019)", () => {
  it("por omisión ordena por clasificación en el orden del balance", () => {
    expect(claves()).toEqual(["r2", "p20", "r1", "r3"]);
  });

  it("filtra por clasificación y por criterio", () => {
    expect(claves({ clasificacion: "DUDOSO" })).toEqual(["r1"]);
    expect(claves({ criterio: "CVU" })).toEqual(["r2"]);
  });

  it("busca sin acentos en el nombre del listado y en el profesor del directorio", () => {
    expect(claves({ q: "perez" })).toEqual(["r2"]);
    expect(claves({ q: "mora 2002" })).toEqual(["p20"]);
  });

  it("ordena por nombre del listado de forma descendente con desempate estable", () => {
    expect(claves({ orden: "listado", dir: "desc" })).toEqual(["r1", "r2", "r3", "p20"]);
  });

  it("avisa en español un filtro que no existe", () => {
    expect(analizarListado(LISTADO_REVISION, { clasificacion: "OTRA" }).errores.clasificacion)
      .toBe("Uno de los filtros tiene un valor que no existe.");
  });

  it("toda columna ordenable tiene texto para el selector de celular", () => {
    expect(COLUMNAS_REVISION.map((c) => c.clave)).toEqual([...LISTADO_REVISION.columnas]);
  });
});
