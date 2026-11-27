import { describe, expect, it } from "vitest";
import type { ParametrosListado } from "@/lib/listados/consulta";
import {
  analizarConvocatoria,
  aniosConvocatoria,
  clasificarDictamen,
  consultarConvocatoria,
  enlaceConvocatoria,
  type DictamenConvocatoria,
  type HistorialSnii,
  type ParticipacionReporte,
} from "./convocatoria";

function estadoConvocatoria(parametros: ParametrosListado = {}, catalogo: { departamentos: readonly number[] } = { departamentos: [] }) {
  return analizarConvocatoria(parametros, catalogo);
}

function snii(parcial: Partial<DictamenConvocatoria> = {}): DictamenConvocatoria {
  return {
    id: 1,
    profesorId: 7,
    programa: "SNII",
    anio: 2026,
    departamento: "Computación",
    departamentoId: 1,
    genero: "F",
    resultado: "APROBADO",
    tipo: "NUEVO_INGRESO",
    nivel: "CANDIDATO",
    inicio: "2026-01-01",
    ...parcial,
  };
}

describe("clasificación de la convocatoria anual (RF-028)", () => {
  const historial: HistorialSnii[] = [{ id: 9, profesorId: 7, nivel: "CANDIDATO", inicio: "2022-01-01" }];

  it("cuenta el nuevo ingreso, el reingreso y el primer PRODEP como nuevo ingreso", () => {
    expect(clasificarDictamen(snii(), [])).toBe("nuevo-ingreso");
    expect(clasificarDictamen(snii({ tipo: "REINGRESO_NO_VIGENTE" }), [])).toBe("nuevo-ingreso");
    expect(clasificarDictamen(snii({
      programa: "PRODEP", tipo: "PRIMER_RECONOCIMIENTO", nivel: null,
    }), [])).toBe("nuevo-ingreso");
  });

  it("cuenta como promoción solo la renovación SNII que sube de nivel", () => {
    expect(clasificarDictamen(snii({ id: 2, tipo: "RENOVACION", nivel: "NIVEL_1" }), historial)).toBe("promocion");
    expect(clasificarDictamen(snii({ id: 2, tipo: "RENOVACION", nivel: "CANDIDATO" }), historial)).toBe("vigente");
    expect(clasificarDictamen(snii({ id: 2, tipo: "RENOVACION", nivel: "CANDIDATO" }), [])).toBe("vigente");
    expect(clasificarDictamen(snii({
      programa: "PRODEP", tipo: "RENOVACION", nivel: null,
    }), historial)).toBe("vigente");
  });

  it("separa al no aprobado y deja fuera la reconsideración", () => {
    expect(clasificarDictamen(snii({ resultado: "NO_APROBADO", nivel: "NO_APROBADO" }), [])).toBe("no-aprobado");
    expect(clasificarDictamen(snii({ resultado: "EN_RECONSIDERACION" }), [])).toBeNull();
  });

  it("desglosa por departamento y género y no duplica el no aprobado de la participación", () => {
    const dictamenes = [
      snii({ id: 1, profesorId: 1, genero: "F", departamento: "Computación" }),
      snii({ id: 2, profesorId: 2, genero: "F", departamento: "Computación" }),
      snii({ id: 3, profesorId: 3, genero: "M", departamento: "Matemáticas", resultado: "NO_APROBADO" }),
    ];
    const participaciones: ParticipacionReporte[] = [
      { profesorId: 3, programa: "SNII", anio: 2026, departamento: "Matemáticas", departamentoId: 2, genero: "M", resultado: "NO_APROBADO" },
      { profesorId: 4, programa: "SNII", anio: 2026, departamento: null, departamentoId: null, genero: "F", resultado: "NO_APROBADO" },
      { profesorId: 5, programa: "SNII", anio: 2026, departamento: "Computación", departamentoId: 1, genero: "M", resultado: "APROBADO" },
    ];
    const { filas } = consultarConvocatoria(dictamenes, participaciones, [], estadoConvocatoria({}));
    expect(filas).toEqual([
      expect.objectContaining({ departamento: "Computación", genero: "F", nuevosIngresos: 2, vigentes: 0 }),
      expect.objectContaining({ departamento: "Matemáticas", genero: "M", noAprobados: 1 }),
      expect.objectContaining({ departamento: "Sin departamento", genero: "F", noAprobados: 1 }),
    ]);
  });

  it("cuenta aparte el género pendiente y permite filtrarlo, sin sumarlo a M ni F (D-261)", () => {
    const dictamenes = [
      snii({ id: 1, profesorId: 1, genero: "F" }),
      snii({ id: 2, profesorId: 2, genero: "PENDIENTE" }),
      snii({ id: 3, profesorId: 3, genero: "PENDIENTE" }),
    ];
    const todas = consultarConvocatoria(dictamenes, [], [], estadoConvocatoria({})).filas;
    expect(todas).toEqual(expect.arrayContaining([
      expect.objectContaining({ genero: "F", nuevosIngresos: 1 }),
      expect.objectContaining({ genero: "PENDIENTE", nuevosIngresos: 2 }),
    ]));

    const estado = estadoConvocatoria({ genero: "PENDIENTE" });
    expect(estado.errores.genero).toBeUndefined();
    expect(consultarConvocatoria(dictamenes, [], [], estado).filas).toEqual([
      expect.objectContaining({ genero: "PENDIENTE", nuevosIngresos: 2 }),
    ]);
  });

  it("acota por año y programa de la convocatoria", () => {
    const dictamenes = [
      snii({ anio: 2026, programa: "SNII" }),
      snii({ id: 2, profesorId: 8, anio: 2025, programa: "PRODEP", tipo: "RENOVACION", nivel: null }),
    ];
    const solo = estadoConvocatoria({ anio: "2025", programa: "PRODEP" });
    const { filas } = consultarConvocatoria(dictamenes, [], [], solo);
    expect(filas).toEqual([expect.objectContaining({ vigentes: 1, nuevosIngresos: 0 })]);
    expect(aniosConvocatoria(dictamenes, [], null)).toEqual([2025, 2026]);
  });

  it("avisa en español si el año o la columna no sirven", () => {
    expect(estadoConvocatoria({ anio: "siglo" }).errores.anio).toBe("El año debe tener cuatro dígitos, entre 1990 y 2100.");
    expect(estadoConvocatoria({ anio: ["2025", "2026"] }).errores.anio).toBe("Elige un solo año.");
    expect(estadoConvocatoria({ programa: "CA" }).errores.programa).toBe("Uno de los filtros tiene un valor que no existe.");
  });

  it("filtra por departamento junto con la búsqueda y, al cambiarlo, vuelve a la página 1", () => {
    const catalogo = { departamentos: [1, 2] };
    const dictamenes = [
      snii({ id: 1, profesorId: 1, departamentoId: 1, departamento: "Computación" }),
      snii({ id: 2, profesorId: 2, departamentoId: 2, departamento: "Matemáticas" }),
    ];
    const estado = estadoConvocatoria({ departamento: "2", q: "matemáticas", genero: "F" }, catalogo);
    expect(estado.consulta.pagina).toBe(1);
    expect(estado.departamentoId).toBe(2);
    expect(consultarConvocatoria(dictamenes, [], [], estado, true).filas.map((fila) => fila.departamento)).toEqual(["Matemáticas"]);
    expect(estadoConvocatoria({ departamento: "9" }, catalogo).errores.departamento).toBe("Elige un departamento que exista.");
    expect(estadoConvocatoria({ departamento: ["1", "2"] }, catalogo).errores.departamento).toBe("Elige un solo departamento.");
    expect(enlaceConvocatoria("/reportes/convocatoria", estadoConvocatoria({ departamento: "1", pagina: "3" }, catalogo))).toContain("departamento=1");
    expect(enlaceConvocatoria("/reportes/convocatoria", estadoConvocatoria({ departamento: "1" }, catalogo))).not.toContain("pagina=");
  });

  it("conserva año, programa y género al pasar de página", () => {
    const estado = estadoConvocatoria({ anio: "2026", programa: "SNII", genero: "F", q: "computación" });
    expect(enlaceConvocatoria("/reportes/convocatoria", estado, { pagina: 2 })).toBe(
      "/reportes/convocatoria?anio=2026&programa=SNII&genero=F&q=computaci%C3%B3n&pagina=2",
    );
  });
});
