import { describe, expect, it } from "vitest";
import {
  claveEncabezado,
  esFilaEncabezado,
  interpretarListado,
  leerVigencia,
  limpiarCvu,
  traducirNivel,
} from "./lectura";

// Datos inventados con la forma del listado oficial del SNII; los CVU 90xxxx son de los profesores demo.
const ENCABEZADO_SNII = ["CVU", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRES", "NIVEL OTORGADO"];
const snii = "SNII" as const;
const prodep = "PRODEP" as const;
const rango = (inicio: string, fin: string) => ({ inicio: new Date(`${inicio}T00:00:00Z`), fin: new Date(`${fin}T00:00:00Z`) });

function leer(filas: string[][], programa: Parameters<typeof interpretarListado>[1] = snii) {
  const resultado = interpretarListado(filas, programa);
  if (!resultado.ok) throw new Error(`Se esperaba una lectura válida: ${resultado.error}`);
  return resultado;
}

describe("traducirNivel (RF-017)", () => {
  it("reconoce Candidato con o sin abreviar", () => {
    expect(traducirNivel("Candidato")).toBe("CANDIDATO");
    expect(traducirNivel("C")).toBe("CANDIDATO");
    expect(traducirNivel("Candidata a Investigadora Nacional")).toBe("CANDIDATO");
  });

  it("reconoce los niveles I, II y III en romano o arábigo, con o sin el prefijo", () => {
    for (const texto of ["Investigador Nacional Nivel I", "Nivel 1", "I", "1", "nivel i"]) {
      expect(traducirNivel(texto), texto).toBe("NIVEL_1");
    }
    expect(traducirNivel("Investigador Nacional Nivel II")).toBe("NIVEL_2");
    expect(traducirNivel("Investigadora Nacional Nivel 2")).toBe("NIVEL_2");
    expect(traducirNivel("Investigador Nacional Nivel III")).toBe("NIVEL_3");
    expect(traducirNivel("III")).toBe("NIVEL_3");
  });

  it("reconoce Emérito con y sin acento", () => {
    expect(traducirNivel("Emérito")).toBe("EMERITO");
    expect(traducirNivel("EMERITO")).toBe("EMERITO");
    expect(traducirNivel("Investigadora Nacional Emérita")).toBe("EMERITO");
  });

  it("no inventa un nivel que no existe", () => {
    expect(traducirNivel("Nivel IV")).toBeNull();
    expect(traducirNivel("")).toBeNull();
    expect(traducirNivel("Perfil deseable")).toBeNull();
  });
});

describe("limpiarCvu (RF-017)", () => {
  it("deja solo los dígitos del CVU", () => {
    expect(limpiarCvu(" 900001 ")).toBe("900001");
    expect(limpiarCvu("7880")).toBe("7880");
  });

  it("distingue un CVU vacío de uno inválido", () => {
    expect(limpiarCvu("")).toBeNull();
    expect(limpiarCvu("   ")).toBeNull();
    expect(limpiarCvu("12A4")).toBe("invalido");
    expect(limpiarCvu("123456789")).toBe("invalido");
  });
});

describe("leerVigencia (RF-017)", () => {
  it("lee rangos con los separadores habituales", () => {
    const esperado = rango("2024-12-16", "2027-12-15");
    expect(leerVigencia("16/12/2024 a 15/12/2027")).toEqual(esperado);
    expect(leerVigencia("2024-12-16 al 2027-12-15")).toEqual(esperado);
    expect(leerVigencia("16/12/2024 - 15/12/2027")).toEqual(esperado);
    expect(leerVigencia({ inicio: "2024-12-16", fin: "2027-12-15" })).toEqual(esperado);
  });

  it("rechaza rangos invertidos o ilegibles", () => {
    expect(leerVigencia("15/12/2027 a 16/12/2024")).toBeNull();
    expect(leerVigencia("pronto")).toBeNull();
    expect(leerVigencia("31/02/2025 a 15/12/2027")).toBeNull();
    expect(leerVigencia({ inicio: "", fin: "2027-12-15" })).toBeNull();
  });
});

describe("encabezados (RF-017)", () => {
  it("compara sin acentos, mayúsculas, puntos ni espacios de más", () => {
    expect(claveEncabezado("  Código ")).toBe("CODIGO");
    expect(claveEncabezado("No. CVU")).toBe("NO CVU");
    expect(claveEncabezado("Nivel   otorgado")).toBe("NIVEL OTORGADO");
  });

  it("reconoce la fila de encabezados del SNII y de PRODEP", () => {
    expect(esFilaEncabezado(ENCABEZADO_SNII)).toBe(true);
    expect(esFilaEncabezado(["Código", "Nombre(s)", "Nivel otorgado"])).toBe(true);
    expect(esFilaEncabezado(["NOMBRE COMPLETO", "VIGENCIA"])).toBe(true);
    expect(esFilaEncabezado(["900001", "ACEVES", "AVILA", "CARLA", "Candidato"])).toBe(false);
    expect(esFilaEncabezado(["RESULTADOS DE LA CONVOCATORIA 2025"])).toBe(false);
  });
});

describe("interpretarListado con un listado SNII (RF-017)", () => {
  const filas = [
    ["Subsecretaría de Ciencias y Humanidades"],
    ["RESULTADOS DE LA CONVOCATORIA 2025"],
    ["Por acuerdo del Consejo General se comunican los resultados."],
    ENCABEZADO_SNII,
    ["900001", "ZUÑIGA", "PEREZ", "JOSE JAIME", "Candidato"],
    ["900002", "ACEVES", "", "CARLA  DELFINA", "Investigador Nacional Nivel I"],
    ["Página 1 de 2"],
    ["", "Av. Insurgentes Sur 1582", "", "", ""],
    ENCABEZADO_SNII,
    ["900003", "ROBLES", "DIAZ", "ANA", "Investigador Nacional Nivel III"],
  ];

  it("ignora el membrete, los encabezados repetidos y el pie de página", () => {
    const { renglones } = leer(filas);
    expect(renglones.map((r) => r.cvu)).toEqual(["900001", "900002", "900003"]);
  });

  it("numera cada renglón según su fila en el archivo", () => {
    expect(leer(filas).renglones.map((r) => r.numero)).toEqual([5, 6, 10]);
  });

  it("separa apellidos y nombres, y deja vacío el materno ausente", () => {
    const [primero, segundo] = leer(filas).renglones;
    expect(primero).toMatchObject({ apellidoPaterno: "ZUÑIGA", apellidoMaterno: "PEREZ", nombres: "JOSE JAIME" });
    expect(segundo).toMatchObject({ apellidoPaterno: "ACEVES", apellidoMaterno: null, nombres: "CARLA DELFINA" });
  });

  it("traduce el nivel y conserva el texto original", () => {
    const [primero, , tercero] = leer(filas).renglones;
    expect(primero).toMatchObject({ nivel: "CANDIDATO", nivelTexto: "Candidato" });
    expect(tercero).toMatchObject({ nivel: "NIVEL_3", nivelTexto: "Investigador Nacional Nivel III" });
  });

  it("deja vacíos la vigencia y el código cuando el archivo no los trae, sin avisos", () => {
    const { renglones, resumen } = leer(filas);
    for (const renglon of renglones) {
      expect(renglon.vigenciaInicio).toBeNull();
      expect(renglon.vigenciaFin).toBeNull();
      expect(renglon.codigo).toBeNull();
    }
    expect(resumen.totalAvisos).toBe(0);
  });

  it("resume lo leído", () => {
    expect(leer(filas).resumen).toEqual({
      renglones: 3,
      conCvu: 3,
      porNivel: { CANDIDATO: 1, NIVEL_1: 1, NIVEL_3: 1 },
      conVigencia: 0,
      avisos: [],
      totalAvisos: 0,
    });
  });
});

describe("interpretarListado: avisos (RF-017)", () => {
  it("guarda sin CVU el renglón con un CVU inválido y lo avisa", () => {
    const { renglones, resumen } = leer([ENCABEZADO_SNII, ["12A4", "LUNA", "SOL", "MAR", "Candidato"]]);
    expect(renglones[0].cvu).toBeNull();
    expect(resumen.conCvu).toBe(0);
    expect(resumen.avisos).toEqual([{ renglon: 2, mensaje: "Renglón 2: el CVU «12A4» no es válido; se guardó sin CVU." }]);
  });

  it("avisa un CVU repetido y guarda ambos renglones", () => {
    const { renglones, resumen } = leer([
      ENCABEZADO_SNII,
      ["900001", "LUNA", "SOL", "MAR", "Candidato"],
      ["900001", "LUNA", "SOL", "MAR", "Candidato"],
    ]);
    expect(renglones).toHaveLength(2);
    expect(resumen.avisos).toEqual([{ renglon: 3, mensaje: "Renglón 3: el CVU 900001 ya aparece en el renglón 2." }]);
  });

  it("guarda el nivel desconocido tal como viene y lo avisa", () => {
    const { renglones, resumen } = leer([ENCABEZADO_SNII, ["900001", "LUNA", "SOL", "MAR", "Nivel IV"]]);
    expect(renglones[0]).toMatchObject({ nivel: null, nivelTexto: "Nivel IV" });
    expect(resumen.porNivel).toEqual({ "Nivel IV": 1 });
    expect(resumen.avisos[0].mensaje).toBe("Renglón 2: no se reconoce el nivel «Nivel IV».");
  });

  it("guarda solo los primeros 50 avisos y cuenta todos", () => {
    const filas = [ENCABEZADO_SNII];
    for (let i = 0; i < 60; i++) filas.push(["X" + i, "LUNA", "SOL", `MAR ${i}`, "Candidato"]);
    const { resumen } = leer(filas);
    expect(resumen.avisos).toHaveLength(50);
    expect(resumen.totalAvisos).toBe(60);
    expect(resumen.renglones).toBe(60);
  });
});

describe("interpretarListado con un listado PRODEP (RF-017)", () => {
  it("acepta el nombre en una sola columna y no inventa un nivel", () => {
    const { renglones } = leer(
      [["NOMBRE COMPLETO", "VIGENCIA"], ["Ana María Núñez Robles", "16/12/2024 a 15/12/2027"]],
      prodep,
    );
    expect(renglones[0]).toMatchObject({
      apellidoPaterno: null,
      apellidoMaterno: null,
      nombres: "Ana María Núñez Robles",
      nivelTexto: null,
      nivel: null,
      cvu: null,
    });
  });

  it("usa la vigencia del archivo y la cuenta en el resumen", () => {
    const { renglones, resumen } = leer(
      [["NOMBRE COMPLETO", "VIGENCIA"], ["Ana Núñez", "16/12/2024 a 15/12/2027"]],
      prodep,
    );
    expect(renglones[0].vigenciaInicio).toEqual(new Date(Date.UTC(2024, 11, 16)));
    expect(renglones[0].vigenciaFin).toEqual(new Date(Date.UTC(2027, 11, 15)));
    expect(resumen.conVigencia).toBe(1);
  });

  it("acepta la vigencia en columnas de inicio y fin", () => {
    const { renglones } = leer(
      [["Código", "Nombre", "Fecha de inicio", "Fecha de fin"], ["2950001", "Ana Núñez", "2024-12-16", "2027-12-15"]],
      prodep,
    );
    expect(renglones[0]).toMatchObject({ codigo: "2950001", vigenciaInicio: new Date(Date.UTC(2024, 11, 16)) });
  });

  it("guarda sin vigencia el renglón con una vigencia ilegible y lo avisa", () => {
    const { renglones, resumen } = leer([["NOMBRE COMPLETO", "VIGENCIA"], ["Ana Núñez", "pronto"]], prodep);
    expect(renglones[0]).toMatchObject({ vigenciaInicio: null, vigenciaFin: null });
    expect(resumen.conVigencia).toBe(0);
    expect(resumen.avisos[0].mensaje).toBe("Renglón 2: la vigencia «pronto» no es válida; se guardó sin vigencia.");
  });

  it("no descarta a una persona con la celda de vigencia vacía", () => {
    const { renglones, resumen } = leer(
      [["NOMBRE COMPLETO", "VIGENCIA"], ["Ana Núñez", "16/12/2024 a 15/12/2027"], ["Luis Mar", ""]],
      prodep,
    );
    expect(renglones.map((r) => r.nombres)).toEqual(["Ana Núñez", "Luis Mar"]);
    expect(renglones[1]).toMatchObject({ vigenciaInicio: null, vigenciaFin: null });
    expect(resumen.totalAvisos).toBe(0);
  });

  it("guarda el nivel de PRODEP tal como viene si el archivo lo trae", () => {
    const { renglones } = leer([["NOMBRE", "NIVEL"], ["Ana Núñez", "Perfil deseable"]], prodep);
    expect(renglones[0]).toMatchObject({ nivel: null, nivelTexto: "Perfil deseable" });
  });
});

describe("interpretarListado: archivos que no se pueden leer (RF-017)", () => {
  it("explica qué columnas faltan en un listado SNII", () => {
    expect(interpretarListado([["CVU", "NOMBRES"], ["900001", "ANA"]], snii)).toEqual({
      ok: false,
      error: "No se encontraron las columnas de nombre y nivel otorgado en el archivo.",
    });
    expect(interpretarListado([], snii)).toEqual({
      ok: false,
      error: "No se encontraron las columnas de nombre y nivel otorgado en el archivo.",
    });
  });

  it("explica que falta el nombre en un listado PRODEP", () => {
    expect(interpretarListado([["CVU", "VIGENCIA"], ["900001", "2024"]], prodep)).toEqual({
      ok: false,
      error: "No se encontró la columna de nombre en el archivo.",
    });
  });

  it("rechaza un listado con encabezados pero sin personas", () => {
    expect(interpretarListado([ENCABEZADO_SNII, ["Página 1 de 1"]], snii)).toEqual({
      ok: false,
      error: "El archivo no tiene ningún renglón con nombre.",
    });
  });
});
