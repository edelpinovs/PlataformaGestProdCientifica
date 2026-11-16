import { describe, expect, it } from "vitest";
import { fragmentosDePdf } from "./lector-pdf";
import { agruparEnFilas } from "./pdf-filas";
import { crearPdfDePrueba, type TextoDePrueba } from "./pdf-prueba";

// PDF inventado con la forma del listado del SNII (carta, 612 × 792 pt); CVU 90xxxx de los profesores demo.
const encabezado = (y: number): TextoDePrueba[] => [
  { x: 105, y, texto: "CVU" },
  { x: 162, y, texto: "APELLIDO" },
  { x: 248, y, texto: "APELLIDO" },
  { x: 338, y, texto: "NOMBRES" },
  { x: 432, y, texto: "NIVEL OTORGADO", tamano: 7 },
  { x: 164, y: y - 10, texto: "PATERNO" },
  { x: 250, y: y - 10, texto: "MATERNO" },
];

const fila = (y: number, [cvu, paterno, materno, nombres, nivel]: string[]): TextoDePrueba[] =>
  [
    { x: 108, y, texto: cvu },
    { x: 143, y, texto: paterno },
    { x: 226, y, texto: materno },
    { x: 314, y, texto: nombres },
    { x: 404, y, texto: nivel, tamano: 6 },
  ].filter((t) => t.texto);

describe("fragmentosDePdf (RF-017)", () => {
  it("entrega los textos del PDF con su página y posición", async () => {
    const fragmentos = await fragmentosDePdf(crearPdfDePrueba([[{ x: 100, y: 700, texto: "CVU" }]]));
    expect(fragmentos).toHaveLength(1);
    expect(fragmentos[0]).toMatchObject({ texto: "CVU", x: 100, y: 700, pagina: 1 });
    expect(fragmentos[0].ancho).toBeGreaterThan(0);
  });

  it("permite rearmar la tabla del listado en dos páginas", async () => {
    const pdf = crearPdfDePrueba([
      [
        { x: 100, y: 750, texto: "RESULTADOS DE LA CONVOCATORIA 2025" },
        ...encabezado(700),
        ...fila(675, ["900001", "ZUÑIGA", "PEREZ", "JOSE JAIME", "Candidato"]),
        ...fila(655, ["900002", "ACEVES", "", "CARLA", "Investigador Nacional Nivel I"]),
        { x: 400, y: 60, texto: "Página 1 de 2" },
      ],
      [...encabezado(700), ...fila(675, ["900003", "ROBLES", "DIAZ", "ANA", "Investigador Nacional Nivel III"])],
    ]);
    const encabezados = ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"];
    expect(agruparEnFilas(await fragmentosDePdf(pdf))).toEqual([
      encabezados,
      ["900001", "ZUÑIGA", "PEREZ", "JOSE JAIME", "Candidato"],
      ["900002", "ACEVES", "", "CARLA", "Investigador Nacional Nivel I"],
      encabezados,
      ["900003", "ROBLES", "DIAZ", "ANA", "Investigador Nacional Nivel III"],
    ]);
  });

  it("no entrega nada de un PDF sin texto", async () => {
    expect(await fragmentosDePdf(crearPdfDePrueba([[]]))).toEqual([]);
  });
});
