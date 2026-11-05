import { describe, expect, it } from "vitest";
import { altaLgac, revisarLgac } from "./lgac";

const integrantes = [{ profesorId: 1 }, { profesorId: 2 }];
const base = {
  cuerpoId: 4,
  nombre: "Gestión ambiental del territorio",
  descripcion: "Línea aplicada a cuencas.",
  profesorIds: [1],
};

describe("altaLgac (RF-015)", () => {
  it("exige nombre e integrantes", () => {
    const vacio = altaLgac.safeParse({ cuerpoId: "4", nombre: "", descripcion: "", profesorIds: [] });
    expect(vacio.success).toBe(false);
    if (!vacio.success) {
      expect(vacio.error.issues.some((i) => i.message === "El nombre es obligatorio.")).toBe(true);
      expect(vacio.error.issues.some((i) => i.message === "Elige al menos un integrante de esta línea.")).toBe(true);
    }
  });

  it("limpia el nombre y deja la descripción vacía en nulo", () => {
    expect(
      altaLgac.parse({
        cuerpoId: "4",
        nombre: "  gestión ambiental  ",
        descripcion: "   ",
        profesorIds: ["1", "2"],
      }),
    ).toEqual({
      cuerpoId: 4,
      nombre: "gestión ambiental",
      descripcion: null,
      profesorIds: [1, 2],
    });
  });

  it("rechaza una descripción demasiado larga", () => {
    const resultado = altaLgac.safeParse({ ...base, descripcion: "x".repeat(401) });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe("La descripción admite como máximo 400 caracteres.");
    }
  });
});

describe("revisarLgac (RF-015)", () => {
  it("rechaza si el CA no tiene integrantes", () => {
    expect(revisarLgac(base, [], [])).toEqual({
      campo: "profesorIds",
      mensaje: "Primero asigna integrantes. Las LGAC se vinculan a integrantes de este cuerpo académico.",
    });
  });

  it("rechaza a un profesor que no es integrante", () => {
    expect(revisarLgac({ ...base, profesorIds: [1, 9] }, integrantes, [])).toEqual({
      campo: "profesorIds",
      mensaje: "Solo se vinculan integrantes de este cuerpo académico. Quita a quien ya no pertenezca.",
    });
  });

  it("rechaza un nombre duplicado en el mismo CA", () => {
    expect(revisarLgac(base, integrantes, [{ nombre: "Gestión ambiental del territorio" }])).toEqual({
      campo: "nombre",
      mensaje: "Ya existe la LGAC «Gestión ambiental del territorio» en este cuerpo académico.",
    });
  });

  it("al editar no choca consigo misma", () => {
    expect(
      revisarLgac(base, integrantes, [{ id: 8, nombre: "Gestión ambiental del territorio" }], 8),
    ).toBeNull();
  });

  it("acepta una línea nueva con integrantes del CA", () => {
    expect(revisarLgac(base, integrantes, [{ id: 3, nombre: "Otra línea" }])).toBeNull();
  });
});
