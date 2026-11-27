import { describe, expect, it } from "vitest";
import { analizarMatriz, consultarMatriz, enlaceMatriz, filaMatriz, SIN_PRODEP, SIN_SNII, type FilaMatriz } from "./matriz";
import { SIN_CVU } from "./vigencias";

const hoy = new Date(Date.UTC(2026, 10, 15));
const catalogo = { departamentos: [1, 2], programas: [10, 11] };

function profesor(parcial: Partial<Parameters<typeof filaMatriz>[0]> = {}) {
  return filaMatriz({
    id: 1,
    codigo: "CV001",
    nombres: "Ada",
    apellidos: "Lovelace",
    tipoContratacion: "TIEMPO_COMPLETO",
    estatusLaboral: "ACTIVO",
    departamento: { id: 1, nombre: "Computación" },
    grado: "Doctorado",
    programas: [{ id: 10, nombre: "Ingeniería" }, { id: 11, nombre: "Maestría" }],
    snii: [{ nivel: "NIVEL_1", inicio: new Date(Date.UTC(2024, 0, 1)), fin: new Date(Date.UTC(2030, 0, 1)) }],
    prodep: [{ inicio: new Date(Date.UTC(2024, 0, 1)), fin: new Date(Date.UTC(2030, 0, 1)) }],
    ...parcial,
  }, hoy);
}

describe("matriz de acreditación (RF-029)", () => {
  it("muestra el SNII y el PRODEP solo cuando hoy están vigentes", () => {
    expect(profesor({ correo: "ada@demo.invalid", cvu: "100200" }).correo).toBe("ada@demo.invalid");
    expect(profesor({ correo: "ada@demo.invalid", cvu: "100200" }).cvu).toBe("100200");
    expect(profesor().cvu).toBe(SIN_CVU);
    expect(profesor().snii).toBe("Nivel I");
    expect(profesor().prodep).toBe("Vigente");
    expect(profesor({
      snii: [{ nivel: "NIVEL_2", inicio: new Date(Date.UTC(2020, 0, 1)), fin: new Date(Date.UTC(2024, 0, 1)) }],
      prodep: [{ inicio: new Date(Date.UTC(2020, 0, 1)), fin: new Date(Date.UTC(2024, 0, 1)) }],
    }).snii).toBe(SIN_SNII);
    expect(profesor({ prodep: [] }).prodep).toBe(SIN_PRODEP);
    expect(profesor({
      snii: [{ nivel: "CANDIDATO", inicio: new Date(Date.UTC(2027, 0, 1)), fin: new Date(Date.UTC(2030, 0, 1)) }],
    }).snii).toBe(SIN_SNII);
  });

  it("si hay dos SNII vigentes, se queda con el que vence más tarde", () => {
    const fila = profesor({
      snii: [
        { nivel: "CANDIDATO", inicio: new Date(Date.UTC(2024, 0, 1)), fin: new Date(Date.UTC(2027, 0, 1)) },
        { nivel: "NIVEL_2", inicio: new Date(Date.UTC(2025, 0, 1)), fin: new Date(Date.UTC(2031, 0, 1)) },
      ],
    });
    expect(fila.snii).toBe("Nivel II");
  });

  it("junta los programas en una sola fila y filtra por departamento o por programa", () => {
    const ada = profesor();
    const alan = profesor({
      id: 2, codigo: "CV002", nombres: "Alan", apellidos: "Turing",
      departamento: { id: 2, nombre: "Matemáticas" },
      programas: [{ id: 10, nombre: "Ingeniería" }],
      snii: [], prodep: [],
    });
    expect(ada.programas).toBe("Ingeniería, Maestría");
    expect(ada.programaIds).toEqual([10, 11]);

    const porDepartamento = consultarMatriz([ada, alan], analizarMatriz({ departamento: "2" }, catalogo));
    expect(porDepartamento.filas.map((fila) => fila.nombre)).toEqual(["Alan Turing"]);

    const porPrograma = consultarMatriz([ada, alan], analizarMatriz({ programa: "11" }, catalogo));
    expect(porPrograma.filas.map((fila) => fila.nombre)).toEqual(["Ada Lovelace"]);
  });

  it("avisa en español si el departamento o el programa no existen", () => {
    expect(analizarMatriz({ departamento: "99" }, catalogo).errores.departamento).toBe("Elige un departamento que exista.");
    expect(analizarMatriz({ programa: ["10", "11"] }, catalogo).errores.programa).toBe("Elige un solo programa educativo.");
    expect(analizarMatriz({ departamento: "99" }, catalogo).departamentoId).toBeNull();
  });

  it("conserva los dos filtros al pasar de página", () => {
    const estado = analizarMatriz({ departamento: "1", programa: "10", q: "ada" }, catalogo);
    expect(enlaceMatriz("/reportes/matriz", estado, { pagina: 2 })).toBe("/reportes/matriz?departamento=1&programa=10&q=ada&pagina=2");
  });

  it("no arma una fila de proyectos activos", () => {
    const fila: FilaMatriz = profesor();
    expect(Object.keys(fila)).not.toContain("proyectos");
  });
});
