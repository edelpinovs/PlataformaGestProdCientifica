import { describe, expect, it, vi } from "vitest";
import { buscarProfesores, idProfesorSeleccionado, revalidarProfesorSeleccionado } from "./selector";

const opciones = [
  { id: 1, nombres: "Profesora Ámbar", apellidos: "Ejemplo Norte", codigo: "DEMO-001" },
  { id: 2, nombres: "Profesor Bruno", apellidos: "Ejemplo Sur", codigo: "DEMO-002" },
];

describe("selector compartido de profesores (#162)", () => {
  it("busca por nombre, apellidos y código en cualquier orden, con espacios y acentos", () => {
    expect(buscarProfesores(opciones, " AMBAR   norte ")).toEqual([opciones[0]]);
    expect(buscarProfesores(opciones, "sur bruno")).toEqual([opciones[1]]);
    expect(buscarProfesores(opciones, "demo-002")).toEqual([opciones[1]]);
    expect(buscarProfesores(opciones, "")).toEqual(opciones);
    expect(buscarProfesores(opciones, "sin coincidencias")).toEqual([]);
    expect(buscarProfesores([opciones[0]], "bruno")).toEqual([]);
  });

  it.each([null, undefined, NaN, 2, ["2"], {}, "", "NaN", "Infinity", "0", "-1", "1.5", "2e0", "9007199254740992"])("rechaza valores atípicos (%j) con mensaje español", valor => {
    const resultado = idProfesorSeleccionado.safeParse(valor);
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(["Selecciona un profesor.", "Selecciona un profesor válido de la lista."]).toContain(resultado.error.issues[0].message);
  });

  it("consulta la elegibilidad al guardar y rechaza una selección que dejó de ser válida", async () => {
    const buscar = vi.fn().mockResolvedValueOnce(opciones[0]).mockResolvedValueOnce(null);
    expect(await revalidarProfesorSeleccionado("1", buscar)).toEqual({ profesor: opciones[0] });
    expect(await revalidarProfesorSeleccionado("1", buscar)).toEqual({ error: "El profesor ya no está disponible para esta operación. Selecciona otro." });
    expect(buscar).toHaveBeenNthCalledWith(1, 1);
    expect(buscar).toHaveBeenNthCalledWith(2, 1);
  });

  it("no consulta con un identificador manipulado ni acepta la respuesta de otro profesor", async () => {
    const buscar = vi.fn().mockResolvedValue(opciones[1]);
    expect(await revalidarProfesorSeleccionado("Infinity", buscar)).toEqual({ error: "Selecciona un profesor válido de la lista." });
    expect(buscar).not.toHaveBeenCalled();
    expect(await revalidarProfesorSeleccionado("1", buscar)).toHaveProperty("error");
  });

  it("una incidencia de datos devuelve un mensaje español, sin exponer excepciones", async () => {
    const buscar = vi.fn().mockRejectedValue(new Error("Database connection failed"));
    expect(await revalidarProfesorSeleccionado("1", buscar)).toEqual({ error: "No se pudo verificar el profesor. Inténtalo de nuevo." });
  });
});
