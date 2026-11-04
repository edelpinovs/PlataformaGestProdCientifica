import { describe, expect, it } from "vitest";
import { cargaResultados, formatoDeArchivo, nombreSeguro, rutaArchivo, TAMANO_MAXIMO } from "./carga";

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const esquema = cargaResultados(2026);
const valida = {
  programa: "SNII",
  anio: "2026",
  nombreArchivo: "Resultados SNII 2026.pdf",
  tipo: "application/pdf",
  tamano: 12 * 1024 * 1024,
};

function mensajes(datos: unknown) {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? [] : resultado.error.issues.map((i) => i.message);
}

describe("cargaResultados (RF-016)", () => {
  it("acepta un PDF de SNII y convierte el año a número", () => {
    const resultado = esquema.parse(valida);
    expect(resultado.anio).toBe(2026);
    expect(resultado.programa).toBe("SNII");
  });

  it("acepta un Excel de PRODEP", () => {
    expect(
      esquema.safeParse({ ...valida, programa: "PRODEP", nombreArchivo: "prodep.xlsx", tipo: MIME_XLSX }).success,
    ).toBe(true);
  });

  it("acepta un PDF grande de cientos de páginas hasta 50 MB", () => {
    expect(esquema.safeParse({ ...valida, tamano: TAMANO_MAXIMO }).success).toBe(true);
  });

  it("rechaza un archivo de más de 50 MB", () => {
    expect(mensajes({ ...valida, tamano: TAMANO_MAXIMO + 1 })).toContain("El archivo pesa más de 50 MB.");
  });

  it("rechaza un archivo vacío", () => {
    expect(mensajes({ ...valida, tamano: 0 })).toContain("El archivo está vacío.");
  });

  it("rechaza formatos que no son PDF ni Excel", () => {
    for (const nombreArchivo of ["resultados.docx", "resultados.xls", "resultados.csv", "resultados"]) {
      expect(mensajes({ ...valida, nombreArchivo, tipo: "" }), nombreArchivo).toContain(
        "El archivo debe ser PDF (.pdf) o Excel (.xlsx).",
      );
    }
  });

  it("rechaza un programa distinto de SNII o PRODEP", () => {
    expect(mensajes({ ...valida, programa: "CONACYT" })).toContain("Elige si la convocatoria es SNII o PRODEP.");
  });

  it("rechaza años fuera de rango o no enteros", () => {
    expect(mensajes({ ...valida, anio: "1999" })).toContain("El año debe ser 2000 o posterior.");
    expect(mensajes({ ...valida, anio: "2028" })).toContain("El año no puede ser posterior a 2027.");
    expect(mensajes({ ...valida, anio: "2025.5" })).toContain("El año debe ser un número entero.");
  });

  it("permite el año siguiente, para convocatorias que se publican por adelantado", () => {
    expect(esquema.safeParse({ ...valida, anio: "2027" }).success).toBe(true);
  });

  it("exige elegir un archivo", () => {
    expect(mensajes({ ...valida, nombreArchivo: "  " })).toContain("Elige el archivo de resultados.");
  });
});

describe("formatoDeArchivo (RF-016)", () => {
  it("reconoce PDF y Excel por extensión y tipo", () => {
    expect(formatoDeArchivo("a.pdf", "application/pdf")).toBe("pdf");
    expect(formatoDeArchivo("a.XLSX", MIME_XLSX)).toBe("xlsx");
  });

  it("confía en la extensión si el navegador no informa el tipo", () => {
    expect(formatoDeArchivo("a.pdf", "")).toBe("pdf");
    expect(formatoDeArchivo("a.xlsx", "application/octet-stream")).toBe("xlsx");
  });

  it("rechaza un archivo renombrado cuyo tipo no coincide", () => {
    expect(formatoDeArchivo("virus.pdf", "application/x-msdownload")).toBeNull();
    expect(formatoDeArchivo("hoja.xlsx", "application/pdf")).toBeNull();
  });
});

describe("rutaArchivo (RF-016)", () => {
  const fecha = new Date("2026-10-18T16:05:09.123Z");

  it("ordena por programa y año y no pisa cargas anteriores", () => {
    expect(rutaArchivo("SNII", 2026, "Resultados SNII 2026.pdf", fecha)).toBe(
      "snii/2026/20261018T160509-resultados-snii-2026.pdf",
    );
  });

  it("quita acentos, espacios y símbolos del nombre", () => {
    expect(nombreSeguro("Resultados Convocatoria PRODEP (Versión Final) #2.XLSX")).toBe(
      "resultados-convocatoria-prodep-version-final-2.xlsx",
    );
  });

  it("usa un nombre genérico si no queda nada", () => {
    expect(nombreSeguro("###.pdf")).toBe("resultados.pdf");
  });
});
