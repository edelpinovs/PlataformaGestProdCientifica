import { describe, expect, it } from "vitest";
import { porPalabras } from "./busqueda";

// Revisión del PR 433: búsqueda por nombre completo. Datos inventados.
const campos = (contiene: { contains: string; mode: "insensitive" }) => [{ nombres: contiene }, { apellidos: contiene }];

describe("porPalabras", () => {
  it("con una sola palabra no agrega nada: basta la búsqueda normal", () => {
    expect(porPalabras("ana", campos)).toBeNull();
    expect(porPalabras("   ", campos)).toBeNull();
  });

  it("pide cada palabra en algún campo, ignora espacios de más y escapa %, _ y \\", () => {
    expect(porPalabras("  ana   10%_ ", campos)).toEqual({
      AND: [
        { OR: [{ nombres: { contains: "ana", mode: "insensitive" } }, { apellidos: { contains: "ana", mode: "insensitive" } }] },
        { OR: [{ nombres: { contains: "10\\%\\_", mode: "insensitive" } }, { apellidos: { contains: "10\\%\\_", mode: "insensitive" } }] },
      ],
    });
  });
});
