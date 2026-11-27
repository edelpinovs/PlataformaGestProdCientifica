import { describe, expect, it } from "vitest";
import { revisarSubarea, subarea } from "./subareas";

const areas = [{ id: 1, nombre: "Biología" }, { id: 2, nombre: "Química" }];

describe("subárea (issue 264)", () => {
  it("convierte el área que llega como texto y limpia el nombre", () => {
    expect(subarea.parse({ nombre: " genética  molecular", areaId: "1" })).toEqual({ nombre: "Genética molecular", areaId: 1 });
  });

  it("sin área, con texto o con un valor atípico devuelve el mensaje propio en español", () => {
    for (const areaId of ["", "abc", "-3", "1.5", "NaN"]) {
      expect(subarea.safeParse({ nombre: "Genética", areaId }).error?.issues[0].message).toBe("Elige el área a la que pertenece.");
    }
    expect(subarea.safeParse({ nombre: "Genética" }).error?.issues[0].message).toBe("Elige el área a la que pertenece.");
  });

  it("un área inexistente se rechaza", () => {
    expect(revisarSubarea({ nombre: "Genética", areaId: 9 }, { areas, subareas: [] })).toEqual({
      campo: "areaId", mensaje: "El área elegida no existe. Recarga la página y elige otra.",
    });
  });

  it("el nombre no se repite dentro del área, pero sí puede existir en otra", () => {
    const subareas = [{ id: 5, nombre: "Genética", areaId: 1 }];
    expect(revisarSubarea({ nombre: "genetica", areaId: 1 }, { areas, subareas })?.mensaje).toBe(
      "El área «Biología» ya tiene una subárea llamada «Genética».",
    );
    expect(revisarSubarea({ nombre: "Genética", areaId: 2 }, { areas, subareas })).toBeNull();
  });

  it("al editar no choca consigo misma", () => {
    const subareas = [{ id: 5, nombre: "Genética", areaId: 1 }];
    expect(revisarSubarea({ nombre: "Genética", areaId: 1 }, { areas, subareas }, 5)).toBeNull();
  });
});
