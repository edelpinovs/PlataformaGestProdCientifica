import { describe, expect, it } from "vitest";
import { area, buscarAreaDuplicada, motivoAreaNoEliminable } from "./areas";

describe("área (issue 264)", () => {
  it("limpia espacios y pone mayúscula inicial", () => {
    expect(area.parse({ nombre: "  ciencias   de la salud " })).toEqual({ nombre: "Ciencias de la salud" });
  });

  it("rechaza nombre vacío, corto, con números o demasiado largo, con mensaje en español", () => {
    expect(area.safeParse({ nombre: "" }).error?.issues[0].message).toBe("El nombre es obligatorio.");
    expect(area.safeParse({ nombre: "Ab" }).error?.issues[0].message).toBe("El nombre debe tener al menos 3 caracteres.");
    expect(area.safeParse({ nombre: "Área 51" }).error?.issues[0].message).toBe(
      "El nombre solo admite letras, espacios, puntos, comas y guiones.",
    );
    expect(area.safeParse({ nombre: "a".repeat(151) }).error?.issues[0].message).toBe("El nombre admite como máximo 150 caracteres.");
  });

  it("el nombre no se repite, sin distinguir mayúsculas ni acentos", () => {
    const catalogo = [{ id: 1, nombre: "Física y Matemáticas" }];
    expect(buscarAreaDuplicada({ nombre: "fisica y matematicas" }, catalogo)?.mensaje).toBe(
      "Ya existe un área llamada «Física y Matemáticas».",
    );
    expect(buscarAreaDuplicada({ nombre: "Biología" }, catalogo)).toBeNull();
  });

  it("al editar no choca consigo misma", () => {
    const catalogo = [{ id: 1, nombre: "Biología" }];
    expect(buscarAreaDuplicada({ nombre: "Biología" }, catalogo, 1)).toBeNull();
    expect(buscarAreaDuplicada({ nombre: "Biología" }, catalogo, 2)).not.toBeNull();
  });

  it("un área con subáreas no se elimina y el mensaje dice cuántas", () => {
    expect(motivoAreaNoEliminable("Biología", 0)).toBeNull();
    expect(motivoAreaNoEliminable("Biología", 1)).toBe("No se puede eliminar «Biología»: tiene 1 subárea. Elimínala o cámbiala de área antes.");
    expect(motivoAreaNoEliminable("Biología", 3)).toBe("No se puede eliminar «Biología»: tiene 3 subáreas. Elimínalas o cámbialas de área antes.");
  });
});
