import { describe, expect, it } from "vitest";
import {
  analizarCompleto,
  consultarCompleto,
  enlaceCompleto,
  ETIQUETA_COLUMNA_COMPLETO,
  filaCompleto,
  SIN_CONVOCATORIA,
  SIN_CUERPO,
  SIN_PUBLICACIONES,
} from "./completo";
import { SIN_SNII } from "./matriz";

const hoy = new Date(Date.UTC(2026, 10, 15));
const catalogo = { departamentos: [1, 2], programas: [10, 11] };

function profesor(parcial: Partial<Parameters<typeof filaCompleto>[0]> = {}) {
  return filaCompleto({
    id: 1,
    codigo: "CV001",
    nombres: "Ada",
    apellidos: "Lovelace",
    genero: "F",
    tipoContratacion: "TIEMPO_COMPLETO",
    estatusLaboral: "ACTIVO",
    departamento: { id: 1, nombre: "Computación" },
    grado: "Doctorado",
    programas: [{ id: 10, nombre: "Ingeniería" }],
    snii: [{ nivel: "NIVEL_1", inicio: new Date(Date.UTC(2024, 0, 1)), fin: new Date(Date.UTC(2030, 0, 1)) }],
    prodep: [{ inicio: new Date(Date.UTC(2024, 0, 1)), fin: new Date(Date.UTC(2029, 5, 1)) }],
    cuerpos: [{ nombre: "Cómputo", anioVencimiento: 2028 }, { nombre: "Datos", anioVencimiento: 2026 }],
    participaciones: [
      { programa: "PRODEP", anio: 2024, resultado: "NO_APROBADO" },
      { programa: "SNII", anio: 2024, resultado: null },
    ],
    publicaciones: ["Obra pendiente", "Álgebra"],
    ...parcial,
  }, hoy);
}

describe("reporte completo por profesor", () => {
  it("llama estatus a la vigencia de SNII, PRODEP y el cuerpo", () => {
    expect(ETIQUETA_COLUMNA_COMPLETO.sniiSemaforo).toBe("Estatus SNII");
    expect(ETIQUETA_COLUMNA_COMPLETO.prodepSemaforo).toBe("Estatus PRODEP");
    expect(ETIQUETA_COLUMNA_COMPLETO.caSemaforo).toBe("Estatus del cuerpo");
    expect(ETIQUETA_COLUMNA_COMPLETO.estatus).toBe("Estatus");
  });

  it("junta en una fila solo el SNII y el PRODEP vigentes, el cuerpo que vence antes y las convocatorias", () => {
    const fila = profesor({
      snii: [
        { nivel: "NIVEL_2", inicio: new Date(Date.UTC(2020, 0, 1)), fin: new Date(Date.UTC(2024, 0, 1)) },
        { nivel: "CANDIDATO", inicio: new Date(Date.UTC(2025, 0, 1)), fin: new Date(Date.UTC(2031, 5, 1)) },
      ],
      publicaciones: [],
    });
    expect(fila.genero).toBe("Femenino");
    expect(fila.snii).toBe("Candidato");
    expect(fila.sniiSemaforo).toBe("Vigente");
    expect(fila.prodep).toBe("Vigente");
    expect(fila.cuerpos).toBe("Cómputo, Datos");
    expect(fila.caFin).toBe("31 dic 2026");
    expect(fila.caSemaforo).toBe("Por vencer");
    expect(fila.convocatoria).toBe("PRODEP 2024 · No aprobado; SNII 2024 · Sin resultado");
    expect(fila.publicaciones).toBe(SIN_PUBLICACIONES);
    expect(profesor({ snii: [], prodep: [], cuerpos: [], participaciones: [] }).snii).toBe(SIN_SNII);
    expect(profesor({ cuerpos: [] }).cuerpos).toBe(SIN_CUERPO);
    expect(profesor({ participaciones: [] }).convocatoria).toBe(SIN_CONVOCATORIA);
  });

  it("deja fuera un SNII que todavía no inicia", () => {
    const fila = profesor({
      snii: [{ nivel: "NIVEL_3", inicio: new Date(Date.UTC(2027, 0, 1)), fin: new Date(Date.UTC(2030, 0, 1)) }],
    });
    expect(fila.snii).toBe(SIN_SNII);
    expect(fila.sniiFin).toBe(SIN_SNII);
  });

  it("muestra solo las columnas elegidas y filtra por departamento", () => {
    const ada = profesor();
    const alan = profesor({
      id: 2,
      codigo: "CV002",
      nombres: "Alan",
      apellidos: "Turing",
      departamento: { id: 2, nombre: "Otro" },
      publicaciones: ["Máquinas"],
    });
    const estado = analizarCompleto({ columnas: "codigo,publicaciones", departamento: "1" }, catalogo);
    const { filas } = consultarCompleto([ada, alan], estado, true);
    expect(filas.map((fila) => fila.codigo)).toEqual(["CV001"]);
    expect(estado.columnas).toEqual(["codigo", "publicaciones"]);
    expect(ada.publicaciones).toBe("Álgebra; Obra pendiente");
  });

  it("exporta todas las filas filtradas, no solo la primera página", () => {
    const filas = Array.from({ length: 12 }, (_, indice) => profesor({
      id: indice + 1,
      codigo: `CV${String(indice + 1).padStart(3, "0")}`,
      nombres: `Nombre${indice + 1}`,
    }));
    const estado = analizarCompleto({ columnas: "nombre" }, catalogo);
    expect(consultarCompleto(filas, estado).filas).toHaveLength(10);
    expect(consultarCompleto(filas, estado, true).filas).toHaveLength(12);
  });

  it("avisa en español si la columna o el departamento no existen y conserva la selección en el enlace", () => {
    const estado = analizarCompleto({ columnas: "codigo,inventada", departamento: "9", programa: ["10", "11"] }, catalogo);
    expect(estado.errores.columnas).toBe("Hay una columna que no existe.");
    expect(estado.errores.departamento).toBe("Elige un departamento que exista.");
    expect(estado.errores.programa).toBe("Elige un solo programa educativo.");
    const conDatos = analizarCompleto({ columnas: "nombre,snii", departamento: "2", q: "Ada" }, catalogo);
    expect(enlaceCompleto("/reportes/completo", conDatos)).toBe(
      "/reportes/completo?columnas=nombre%2Csnii&departamento=2&q=Ada",
    );
  });
});
