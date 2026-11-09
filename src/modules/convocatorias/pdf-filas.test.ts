import { describe, expect, it } from "vitest";
import { agruparEnFilas, type Fragmento } from "./pdf-filas";

// Fragmentos inventados con la geometría del listado oficial del SNII (carta, y crece hacia
// arriba): CVU ~120–185, paterno ~185–305, materno ~305–423, nombres ~423–550, nivel ~550–725.
// Los encabezados van centrados y algunos en dos líneas; el CVU, alineado a la derecha.
function linea(pagina: number, y: number, celdas: [number, number, string][]): Fragmento[] {
  return celdas.map(([x, ancho, texto]) => ({ texto, x, y, ancho, pagina }));
}

const ENCABEZADO = ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"];

function encabezado(pagina: number, y: number): Fragmento[] {
  return [
    ...linea(pagina, y, [
      [140, 20, "CVU"],
      [215, 60, "APELLIDO"],
      [335, 60, "APELLIDO"],
      [460, 55, "NOMBRES"],
      [590, 95, "NIVEL OTORGADO"],
    ]),
    ...linea(pagina, y - 12, [
      [220, 50, "PATERNO"],
      [340, 50, "MATERNO"],
    ]),
  ];
}

function persona(pagina: number, y: number, [cvu, paterno, materno, nombres, nivel]: string[]): Fragmento[] {
  const celdas: [number, number, string][] = [[182 - cvu.length * 6, cvu.length * 6, cvu]];
  if (paterno) celdas.push([190, paterno.length * 6, paterno]);
  if (materno) celdas.push([309, materno.length * 6, materno]);
  if (nombres) celdas.push([427, nombres.length * 6, nombres]);
  if (nivel) celdas.push([553, nivel.length * 5, nivel]);
  return linea(pagina, y, celdas);
}

describe("agruparEnFilas (RF-017)", () => {
  it("une el encabezado partido en dos líneas", () => {
    const filas = agruparEnFilas([...encabezado(1, 600), ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"])]);
    expect(filas[0]).toEqual(ENCABEZADO);
  });

  it("asigna cada texto a su columna, aunque el CVU vaya alineado a la derecha", () => {
    const filas = agruparEnFilas([
      ...encabezado(1, 600),
      ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"]),
      ...persona(1, 550, ["7880", "ACOSTA", "", "CESAR RENAN", "Investigador Nacional Nivel I"]),
    ]);
    expect(filas.slice(1)).toEqual([
      ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"],
      ["7880", "ACOSTA", "", "CESAR RENAN", "Investigador Nacional Nivel I"],
    ]);
  });

  it("une en una sola celda el nombre partido en dos renglones", () => {
    const filas = agruparEnFilas([
      ...encabezado(1, 600),
      ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"]),
      // Celda alta: el nombre ocupa dos renglones y el resto de la fila va centrado entre ellos.
      ...linea(1, 553, [[427, 90, "MARIA GUADALUPE"]]),
      ...persona(1, 547, ["900002", "ACOSTA", "CASTILLO", "", "Candidato"]),
      ...linea(1, 541, [[427, 60, "DE LOURDES"]]),
      ...persona(1, 524, ["900003", "ACOSTA", "COLLAZO", "ALEJANDRO", "Investigador Nacional Nivel II"]),
    ]);
    expect(filas.slice(1)).toEqual([
      ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"],
      ["900002", "ACOSTA", "CASTILLO", "MARIA GUADALUPE DE LOURDES", "Candidato"],
      ["900003", "ACOSTA", "COLLAZO", "ALEJANDRO", "Investigador Nacional Nivel II"],
    ]);
  });

  it("descarta el membrete de arriba y el pie de página de abajo", () => {
    const filas = agruparEnFilas([
      ...linea(1, 760, [[200, 300, "Subsecretaría de Ciencias y Humanidades"]]),
      ...linea(1, 700, [[150, 450, "Por acuerdo del Consejo General se comunican los resultados."]]),
      ...encabezado(1, 600),
      ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"]),
      ...persona(1, 550, ["900002", "ROBLES", "DIAZ", "ANA", "Candidato"]),
      ...linea(1, 490, [[250, 400, "Av. Insurgentes Sur 1582, Col. Crédito Constructor"]]),
      ...linea(1, 470, [[600, 80, "Página 1 de 2"]]),
    ]);
    expect(filas).toEqual([
      ENCABEZADO,
      ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"],
      ["900002", "ROBLES", "DIAZ", "ANA", "Candidato"],
    ]);
  });

  it("repite el encabezado de cada página y conserva el orden de las filas", () => {
    const filas = agruparEnFilas([
      ...persona(2, 670, ["900003", "ZUÑIGA", "VEGA", "JOSE JAIME", "Investigador Nacional Nivel III"]),
      ...encabezado(2, 700),
      ...encabezado(1, 600),
      ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"]),
    ]);
    expect(filas).toEqual([
      ENCABEZADO,
      ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"],
      ENCABEZADO,
      ["900003", "ZUÑIGA", "VEGA", "JOSE JAIME", "Investigador Nacional Nivel III"],
    ]);
  });

  it("usa las columnas de la página anterior si una página no repite el encabezado", () => {
    const filas = agruparEnFilas([
      ...encabezado(1, 600),
      ...persona(1, 570, ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"]),
      ...persona(2, 700, ["900002", "ROBLES", "DIAZ", "ANA", "Candidato"]),
    ]);
    expect(filas).toEqual([
      ENCABEZADO,
      ["900001", "ACEVES", "AVILA", "CARLA", "Candidato"],
      ["900002", "ROBLES", "DIAZ", "ANA", "Candidato"],
    ]);
  });

  it("no devuelve filas si no hay texto o no hay encabezado", () => {
    expect(agruparEnFilas([])).toEqual([]);
    expect(agruparEnFilas(linea(1, 700, [[100, 300, "Un documento sin tabla"]]))).toEqual([]);
  });
});
