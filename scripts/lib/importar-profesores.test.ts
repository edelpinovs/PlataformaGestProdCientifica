import { describe, expect, it } from "vitest";
import {
  informeDetallado,
  leerFilas,
  palabrasDeNombre,
  parsearCsv,
  resumenAnonimo,
  validarProfesores,
  type TipoIncidencia,
} from "./importar-profesores";

const ENCABEZADO = "Apellidos,Nombres,Scholar_id,URL_scholar,ORCID _ID,DOI SCOPUS,DOI WEB SITE,SCOPUS_ID";
const ENCABEZADO_SCOPUS = "CODIGO,PROFESOR,SCOPUS_ID,DIVISION,DEPARTAMENTO";

const fila = (apellidos: string, nombres: string, scholar = "", url = "", orcid = "", scopus = "") =>
  `${apellidos},${nombres},${scholar},${url},${orcid},,,${scopus}`;
const completo = (...filas: string[]) => [ENCABEZADO, ...filas].join("\n");
const scopusCsv = (...filas: string[]) => [ENCABEZADO_SCOPUS, ...filas].join("\n");

const tipos = (r: ReturnType<typeof validarProfesores>) => r.incidencias.map((i) => i.tipo);
const cuenta = (r: ReturnType<typeof validarProfesores>, t: TipoIncidencia) => r.resumen.porTipo[t];

describe("parsearCsv", () => {
  it("lee comillas, comas dentro de comillas, CRLF y BOM", () => {
    const filas = parsearCsv('﻿a,b\r\n"x, y","dijo ""hola"""\r\n');
    expect(filas).toEqual([["a", "b"], ["x, y", 'dijo "hola"']]);
  });

  it("descarta filas completamente vacías y normaliza encabezados con espacios", () => {
    const filas = leerFilas(completo(fila("PÉREZ", "ANA"), ",,,,,,,", ",,,,,,,"));
    expect(filas).toHaveLength(1);
    expect(filas[0].campos["ORCIDID"]).toBe("");
    expect(filas[0].linea).toBe(2);
  });
});

describe("palabrasDeNombre", () => {
  it("ignora acentos, mayúsculas, puntos y guiones", () => {
    expect(palabrasDeNombre("Ma. DEL Refugio Ramos-Martínez")).toEqual(["ma", "del", "refugio", "ramos", "martinez"]);
  });
});

describe("validarProfesores · listado completo", () => {
  it("importa una persona limpia y limpia espacios, tabuladores y el sufijo de idioma del Scholar ID", () => {
    const r = validarProfesores({
      completo: completo(
        fila("RAMÍREZ LÓPEZ ", "ANA  MARÍA", "abcdeFAAAAJ&hl=es", "https://scholar.google.com/citations?user=abcdeFAAAAJ&hl=es", "0000-0001-2345-6789", "12345678"),
      ),
    });
    expect(r.importables).toEqual([
      { apellidos: "RAMÍREZ LÓPEZ", nombres: "ANA MARÍA", orcid: "0000-0001-2345-6789", scholarId: "abcdeFAAAAJ", scopusId: "12345678", departamento: null },
    ]);
    expect(r.resumen.excluidas).toBe(0);
  });

  it("deja vacío el Scholar ID con error de Excel y lo anota sin excluir a la persona", () => {
    const r = validarProfesores({ completo: completo(fila("GÓMEZ", "LUIS", "#VALUE!")) });
    expect(r.importables[0].scholarId).toBeNull();
    expect(cuenta(r, "scholar_error_excel")).toBe(1);
    expect(r.importables).toHaveLength(1);
  });

  it("excluye un ORCID con formato inválido y acepta la X final", () => {
    const r = validarProfesores({
      completo: completo(fila("UNO", "ANA", "", "", "0000-0001-2345"), fila("DOS", "BETO", "", "", "0000-0002-1825-009X")),
    });
    expect(r.importables.map((p) => p.orcid)).toEqual([null, "0000-0002-1825-009X"]);
    expect(cuenta(r, "orcid_formato")).toBe(1);
  });

  it("excluye el Scholar ID cuando no coincide con el de su URL", () => {
    const r = validarProfesores({
      completo: completo(fila("UNO", "ANA", "abcdeFAAAAJ", "https://scholar.google.com/citations?user=otroDistinto1")),
    });
    expect(r.importables[0].scholarId).toBeNull();
    expect(cuenta(r, "scholar_url_distinta")).toBe(1);
  });

  it("marca como informativo un Scholar ID que no termina en AAAAJ, pero lo conserva", () => {
    const r = validarProfesores({ completo: completo(fila("UNO", "ANA", "inusual12345")) });
    expect(r.importables[0].scholarId).toBe("inusual12345");
    expect(cuenta(r, "scholar_inusual")).toBe(1);
  });

  it("excluye por completo una fila sin nombres o con dígitos en el nombre", () => {
    const r = validarProfesores({ completo: completo(fila("SIN NOMBRE", ""), fila("PÉREZ", "ANA 2")) });
    expect(r.importables).toHaveLength(0);
    expect(r.excluidas.map((e) => e.motivo)).toEqual(["nombre_invalido", "nombre_invalido"]);
  });

  it("fusiona filas repetidas de la misma persona aunque cambien acentos o mayúsculas", () => {
    const r = validarProfesores({ completo: completo(fila("GARCÍA PÉREZ", "ROSA", "", "", "0000-0001-0000-0001"), fila("Garcia Perez", "Rosa")) });
    expect(r.importables).toHaveLength(1);
    expect(r.importables[0].orcid).toBe("0000-0001-0000-0001");
    expect(cuenta(r, "persona_repetida")).toBe(1);
  });

  it("excluye el Scopus ID cuando la persona tiene varios (filas repetidas o celda con coma)", () => {
    const r = validarProfesores({
      completo: completo(
        fila("UNO", "ANA", "", "", "", "11111111"),
        fila("UNO", "ANA", "", "", "", "22222222"),
        fila("DOS", "BETO", "", "", "", '"33333333, 44444444"'),
      ),
    });
    expect(r.importables.map((p) => p.scopusId)).toEqual([null, null]);
    expect(cuenta(r, "identificador_multiple")).toBe(2);
  });

  it("no asigna un identificador repetido entre personas distintas (a ninguna de las dos)", () => {
    const r = validarProfesores({
      completo: completo(
        fila("UNO", "ANA", "pruebaAAAAAJ", "", "", "55555555"),
        fila("DOS", "BETO", "PRUEBAAAAAAJ", "", "", "55555555"),
        fila("TRES", "CARLA", "", "", "", "66666666"),
      ),
    });
    expect(r.importables.map((p) => [p.scholarId, p.scopusId])).toEqual([
      [null, null],
      [null, null],
      [null, "66666666"],
    ]);
    expect(cuenta(r, "identificador_repetido")).toBe(2);
  });
});

describe("validarProfesores · archivo de Scopus", () => {
  it("cruza por nombre sin importar el orden ni los acentos y toma departamento y Scopus ID", () => {
    const r = validarProfesores({
      completo: completo(fila("SOLÍS VERA CÁRDENAS", "LORENA")),
      scopus: scopusCsv(",Lorena Solís Vera Cárdenas,77777777,,Departamento de Ejemplo\t"),
    });
    expect(r.importables[0]).toMatchObject({ scopusId: "77777777", departamento: "Departamento de Ejemplo" });
    expect(r.resumen.excluidas).toBe(0);
  });

  it("cruza un nombre incompleto en un lado si solo hay un candidato", () => {
    const r = validarProfesores({
      completo: completo(fila("PALACIOS RUIZ", "MARTÍN ALBERTO")),
      scopus: scopusCsv(",Martín Palacios Ruiz,88888888,,Departamento de Ejemplo"),
    });
    expect(r.importables[0].scopusId).toBe("88888888");
  });

  it("excluye el Scopus ID cuando los dos archivos no coinciden", () => {
    const r = validarProfesores({
      completo: completo(fila("UNO", "ANA MARÍA", "", "", "", "11111111")),
      scopus: scopusCsv(",Ana María Uno,99999999,,Departamento de Ejemplo"),
    });
    expect(r.importables[0].scopusId).toBeNull();
    expect(cuenta(r, "identificador_multiple")).toBe(1);
  });

  it("acepta el mismo Scopus ID escrito dos veces en el archivo de Scopus (nombre invertido)", () => {
    const r = validarProfesores({
      completo: completo(fila("BRAVO LUNA", "DIEGO")),
      scopus: scopusCsv(",Diego Bravo Luna,90000001,,Departamento de Ejemplo", ",Bravo Luna Diego,90000001,,Departamento de Ejemplo"),
    });
    expect(r.importables[0]).toMatchObject({ scopusId: "90000001", departamento: "Departamento de Ejemplo" });
  });

  it("excluye por completo a quien solo aparece en el archivo de Scopus", () => {
    const r = validarProfesores({
      completo: completo(fila("UNO", "ANA")),
      scopus: scopusCsv(",Nadia Paloma Esther Quiroz Vela,\"90000002, 90000003\",,Departamento de Ejemplo"),
    });
    expect(r.importables).toHaveLength(1);
    expect(r.excluidas).toEqual([{ nombre: "Nadia Paloma Esther Quiroz Vela", motivo: "solo_en_scopus" }]);
  });

  it("deja sin departamento a quien tiene dos distintos y lo anota", () => {
    const r = validarProfesores({
      completo: completo(fila("UNO", "ANA")),
      scopus: scopusCsv(",Ana Uno,,,Departamento A", ",Ana Uno,,,Departamento B"),
    });
    expect(r.importables[0].departamento).toBeNull();
    expect(tipos(r)).toContain("departamento_contradictorio");
  });

  it("anota como informativo a quien no está en el archivo de Scopus", () => {
    const r = validarProfesores({ completo: completo(fila("UNO", "ANA")), scopus: scopusCsv() });
    expect(cuenta(r, "sin_departamento")).toBe(1);
    expect(r.importables).toHaveLength(1);
  });
});

describe("informes", () => {
  const r = validarProfesores({
    completo: completo(fila("UNO", "ANA", "#VALUE!"), fila("DOS", "BETO")),
    scopus: scopusCsv(",Ana Uno,,,Departamento A"),
  });

  it("el resumen anónimo no contiene nombres de personas", () => {
    const texto = resumenAnonimo(r);
    expect(texto).not.toMatch(/UNO|DOS|ANA|BETO/);
    expect(texto).toContain("scholar_error_excel");
  });

  it("el informe detallado sí los lista", () => {
    expect(informeDetallado(r)).toContain("UNO, ANA");
  });
});
