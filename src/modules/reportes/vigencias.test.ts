import { describe, expect, it } from "vitest";
import {
  analizarReporte,
  COLUMNAS_VIGENCIA,
  consultarVigencias,
  opcionesAnio,
  cuentaParaSemaforo,
  enlaceReporte,
  filaCuerpo,
  filaProdep,
  filaSnii,
  finDeCuerpo,
  textoColumna,
  type FilaVigencia,
} from "./vigencias";

const hoy = new Date(Date.UTC(2026, 10, 15));

function snii(parcial: Partial<Parameters<typeof filaSnii>[0]> = {}) {
  return filaSnii({
    id: 1,
    nivel: "NIVEL_1",
    resultado: "APROBADO",
    inicio: new Date(Date.UTC(2024, 0, 1)),
    fin: new Date(Date.UTC(2030, 0, 1)),
    nombres: "Ada",
    apellidos: "Lovelace",
    departamento: "Computación",
    ...parcial,
  }, hoy);
}

function estadoBase() {
  return analizarReporte({});
}

describe("semáforo aplicado a cada distinción (RF-026)", () => {
  it("no toma un resultado no aprobado como distinción", () => {
    expect(cuentaParaSemaforo("NO_APROBADO")).toBe(false);
    expect(cuentaParaSemaforo("APROBADO")).toBe(true);
    expect(cuentaParaSemaforo("EN_RECONSIDERACION")).toBe(true);
  });

  it("marca en rojo un SNII ya vencido", () => {
    expect(snii({ fin: new Date(Date.UTC(2024, 0, 1)) }).semaforo).toBe("ROJO");
  });

  it("marca en amarillo un PRODEP que vence dentro de 12 meses", () => {
    const fila = filaProdep({
      id: 4,
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      inicio: new Date(Date.UTC(2024, 0, 1)),
      fin: new Date(Date.UTC(2027, 4, 1)),
      nombres: "Grace",
      apellidos: "Hopper",
      departamento: null,
    }, hoy);
    expect(fila.semaforo).toBe("AMARILLO");
    expect(fila.detalle).toBe("Renovación");
    expect(fila.departamento).toBe("Sin departamento");
  });

  it("marca en verde un cuerpo académico cuyo año de vencimiento queda a más de 12 meses", () => {
    const fila = filaCuerpo({
      id: 8,
      clave: "CA-001",
      nombre: "Software",
      nivel: "CONSOLIDADO",
      anioRegistro: 2020,
      anioVencimiento: 2030,
      departamento: "Computación",
    }, hoy);
    expect(finDeCuerpo(2030).toISOString()).toBe("2030-12-31T00:00:00.000Z");
    expect(fila.fin.toISOString()).toBe("2030-12-31T00:00:00.000Z");
    expect(fila.semaforo).toBe("VERDE");
    expect(fila.nombre).toBe("Software (CA-001)");
    expect(fila.detalle).toBe("Consolidado");
  });

  it("marca en rojo un cuerpo académico de un año ya cerrado", () => {
    const fila = filaCuerpo({
      id: 2,
      clave: "CA-002",
      nombre: "Datos",
      nivel: "EN_FORMACION",
      anioRegistro: 2018,
      anioVencimiento: 2024,
      departamento: "Computación",
    }, hoy);
    expect(fila.semaforo).toBe("ROJO");
  });

  it("marca en amarillo un cuerpo que vence en el año en curso", () => {
    const fila = filaCuerpo({
      id: 3,
      clave: "CA-003",
      nombre: "Redes",
      nivel: "EN_CONSOLIDACION",
      anioRegistro: 2023,
      anioVencimiento: 2026,
      departamento: "Computación",
    }, hoy);
    expect(fila.semaforo).toBe("AMARILLO");
    expect(textoColumna(fila, "semaforo")).toBe("Por vencer");
  });

  it("señala en el detalle una distinción que sigue en reconsideración", () => {
    expect(snii({ resultado: "EN_RECONSIDERACION" }).detalle).toBe("Nivel I · En reconsideración");
  });
});

describe("reporte armado por quien consulta", () => {
  const filas: FilaVigencia[] = [
    snii({ id: 10, fin: new Date(Date.UTC(2030, 0, 1)), nombres: "Ada", apellidos: "Lovelace" }),
    snii({ id: 2, fin: new Date(Date.UTC(2024, 5, 1)), nombres: "Alan", apellidos: "Turing", departamento: "Matemáticas" }),
    filaProdep({
      id: 1,
      tipoSolicitud: "PRIMER_RECONOCIMIENTO",
      resultado: "APROBADO",
      inicio: new Date(Date.UTC(2025, 0, 1)),
      fin: new Date(Date.UTC(2027, 2, 1)),
      nombres: "Grace",
      apellidos: "Hopper",
      departamento: "Computación",
    }, hoy),
  ];

  it("al entrar muestra las tres distinciones y todas las columnas", () => {
    const estado = estadoBase();
    expect(estado.tipos).toEqual(["SNII", "PRODEP", "CA"]);
    expect(estado.columnas).toEqual([...COLUMNAS_VIGENCIA]);
    expect(estado.anio).toBeNull();
    expect(estado.errores).toEqual({});
  });

  it("filtra los vencimientos por el año de la fecha de fin (RF-027)", () => {
    const estado = analizarReporte({ anio: "2027" });
    expect(estado.anio).toBe(2027);
    expect(consultarVigencias(filas, estado).filas.map((fila) => fila.nombre)).toEqual(["Grace Hopper"]);
    expect(opcionesAnio(filas, null)).toEqual([2024, 2027, 2030]);
  });

  it("en un cuerpo académico el año es el de vencimiento, no el de registro", () => {
    const cuerpo = filaCuerpo({
      id: 9,
      clave: "CA-009",
      nombre: "Software",
      nivel: "CONSOLIDADO",
      anioRegistro: 2020,
      anioVencimiento: 2030,
      departamento: "Computación",
    }, hoy);
    expect(consultarVigencias([cuerpo], analizarReporte({ anio: "2030" })).filas).toHaveLength(1);
    expect(consultarVigencias([cuerpo], analizarReporte({ anio: "2020" })).filas).toHaveLength(0);
  });

  it("un año inválido se ignora y se avisa en español", () => {
    const invalido = analizarReporte({ anio: "siglo" });
    expect(invalido.anio).toBeNull();
    expect(invalido.errores.anio).toBe("El año debe tener cuatro dígitos, entre 1990 y 2100.");
    expect(consultarVigencias(filas, invalido).paginacion.total).toBe(filas.length);
    expect(analizarReporte({ anio: ["2026", "2027"] }).errores.anio).toBe("Elige un solo año.");
    expect(analizarReporte({ anio: "1899" }).errores.anio).toBe("El año debe tener cuatro dígitos, entre 1990 y 2100.");
  });

  it("conserva el año al pasar de página", () => {
    const estado = analizarReporte({ anio: "2027" });
    expect(enlaceReporte("/reportes", estado, { pagina: 2 })).toBe("/reportes?anio=2027&pagina=2");
  });

  it("respeta las distinciones elegidas", () => {
    const estado = analizarReporte({ tipos: "SNII" });
    const { filas: pagina, paginacion } = consultarVigencias(filas, estado);
    expect(pagina.map((fila) => fila.tipo)).toEqual(["SNII", "SNII"]);
    expect(paginacion.total).toBe(2);
  });

  it("busca solo en las columnas que quedaron visibles", () => {
    const conNombre = analizarReporte({ q: "hopper", columnas: "nombre,semaforo" });
    expect(consultarVigencias(filas, conNombre).filas.map((fila) => fila.nombre)).toEqual(["Grace Hopper"]);

    const sinNombre = analizarReporte({ q: "hopper", columnas: "semaforo" });
    expect(consultarVigencias(filas, sinNombre).filas).toEqual([]);
  });

  it("filtra por el semáforo calculado", () => {
    const estado = analizarReporte({ semaforo: "ROJO" });
    expect(consultarVigencias(filas, estado).filas.map((fila) => fila.nombre)).toEqual(["Alan Turing"]);
  });

  it("si la columna de orden no está en el reporte, usa la primera columna visible", () => {
    const estado = analizarReporte({ columnas: "nombre", orden: "fin" });
    const { filas: pagina } = consultarVigencias(filas, estado);
    expect(pagina.map((fila) => fila.nombre)).toEqual(["Ada Lovelace", "Alan Turing", "Grace Hopper"]);
  });

  it("ordena por vencimiento y desempatan por id", () => {
    const mismoDia = [
      snii({ id: 10, fin: new Date(Date.UTC(2028, 0, 1)), nombres: "Bea" }),
      snii({ id: 2, fin: new Date(Date.UTC(2028, 0, 1)), nombres: "Ana" }),
    ];
    const { filas: pagina } = consultarVigencias(mismoDia, analizarReporte({ orden: "fin", dir: "asc" }));
    expect(pagina.map((fila) => fila.id)).toEqual(["snii-00000002", "snii-00000010"]);
  });

  it("pide otra página y, si se pasa, muestra la última", () => {
    const muchas = Array.from({ length: 11 }, (_, indice) => snii({
      id: indice + 1,
      fin: new Date(Date.UTC(2030, 0, indice + 1)),
      nombres: `Persona ${indice + 1}`,
    }));
    const pagina2 = consultarVigencias(muchas, analizarReporte({ pagina: "2" }));
    expect(pagina2.filas).toHaveLength(1);
    expect(pagina2.paginacion.desde).toBe(11);

    const lejos = consultarVigencias(muchas, analizarReporte({ pagina: "9" }));
    expect(lejos.paginacion.pagina).toBe(2);
    expect(lejos.filas).toHaveLength(1);
  });

  it("sin columnas no cuenta distinciones", () => {
    const estado = analizarReporte({ armado: "1", tipos: "SNII" });
    expect(estado.columnas).toEqual([]);
    expect(consultarVigencias(filas, estado).paginacion.total).toBe(0);
  });

  it("avisa en español si la selección queda vacía o trae un valor que no existe", () => {
    expect(analizarReporte({ armado: "1" }).errores.tipos).toBe("Elige al menos una distinción.");
    expect(analizarReporte({ armado: "1" }).errores.columnas).toBe("Elige al menos una columna.");
    expect(analizarReporte({ tipos: "OTRA" }).errores.tipos).toBe("Hay una distinción que no existe.");
    expect(analizarReporte({ columnas: "sueldo" }).errores.columnas).toBe("Hay una columna que no existe.");
    expect(analizarReporte({ semaforo: "azul" }).errores.semaforo).toBe("Uno de los filtros tiene un valor que no existe.");
  });

  it("filtra por departamento junto con la búsqueda y el año, y al cambiarlo vuelve a la página 1", () => {
    const catalogo = { departamentos: [1, 2] };
    const filas = [
      snii({ id: 1, departamentoId: 1, departamento: "Computación", nombres: "Ada", fin: new Date(Date.UTC(2030, 0, 1)) }),
      snii({ id: 2, departamentoId: 2, departamento: "Matemáticas", nombres: "Alan", fin: new Date(Date.UTC(2024, 0, 1)) }),
    ];
    const estado = analizarReporte({ departamento: "1", q: "ada", anio: "2030" }, catalogo);
    expect(estado.consulta.pagina).toBe(1);
    expect(estado.departamentoId).toBe(1);
    expect(consultarVigencias(filas, estado, true).filas.map((fila) => fila.nombre)).toEqual(["Ada Lovelace"]);
    expect(analizarReporte({ departamento: "9" }, catalogo).errores.departamento).toBe("Elige un departamento que exista.");
    expect(analizarReporte({ departamento: ["1", "2"] }, catalogo).errores.departamento).toBe("Elige un solo departamento.");
    expect(enlaceReporte("/reportes", analizarReporte({ departamento: "1" }, catalogo))).toBe("/reportes?departamento=1");
    expect(enlaceReporte("/reportes", analizarReporte({ departamento: "1", pagina: "2" }, catalogo))).toBe("/reportes?departamento=1&pagina=2");
  });

  it("conserva la selección al pasar de página", () => {
    const estado = analizarReporte({ tipos: ["SNII", "CA"], columnas: "nombre,fin", q: "ada", semaforo: "VERDE" });
    expect(enlaceReporte("/reportes", estado, { pagina: 2 })).toBe(
      "/reportes?tipos=SNII%2CCA&columnas=nombre%2Cfin&q=ada&semaforo=VERDE&pagina=2",
    );
  });
});
