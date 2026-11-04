import { describe, expect, it } from "vitest";
import { cuerpoAcademico, motivoNoEliminable, revisarCuerpo } from "./cuerpo";

const valido = {
  nombre: "Cuerpo Académico de Computación",
  clave: "CA-001",
  nivel: "EN_FORMACION",
  areaProdep: "Ingeniería y Tecnología",
  disciplina: "Ciencias de la Computación",
  departamentoId: "1",
  anioRegistro: "2024",
  anioVencimiento: "2027",
};

const departamentos = [{ id: 1, nombre: "Departamento DEP-A1" }];
const cuerpos = [{ clave: "CA-001" }];

describe("cuerpoAcademico (RF-012)", () => {
  it("exige los campos del registro", () => {
    const resultado = cuerpoAcademico.safeParse({
      nombre: "  ",
      clave: "",
      nivel: "",
      areaProdep: "",
      disciplina: "",
      departamentoId: "",
      anioRegistro: "",
      anioVencimiento: "",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const campos = resultado.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(
        expect.arrayContaining(["nombre", "clave", "nivel", "areaProdep", "disciplina", "departamentoId"]),
      );
    }
  });

  it("limpia espacios y guarda la clave en mayúsculas", () => {
    expect(
      cuerpoAcademico.parse({
        ...valido,
        nombre: "  cuerpo académico de  computación ",
        clave: " ca-002 ",
        areaProdep: "  Ingeniería  y Tecnología ",
      }),
    ).toEqual({
      nombre: "Cuerpo académico de computación",
      clave: "CA-002",
      nivel: "EN_FORMACION",
      areaProdep: "Ingeniería y Tecnología",
      disciplina: "Ciencias de la Computación",
      departamentoId: 1,
      anioRegistro: 2024,
      anioVencimiento: 2027,
    });
  });

  it("acepta los tres niveles de consolidación", () => {
    for (const nivel of ["EN_FORMACION", "EN_CONSOLIDACION", "CONSOLIDADO"]) {
      expect(cuerpoAcademico.safeParse({ ...valido, nivel }).success, nivel).toBe(true);
    }
  });

  it("rechaza un nivel que no está en el catálogo", () => {
    expect(cuerpoAcademico.safeParse({ ...valido, nivel: "OTRO" }).success).toBe(false);
  });

  it("guarda la clave con números y guiones", () => {
    expect(cuerpoAcademico.parse({ ...valido, clave: "uv-ca-12" }).clave).toBe("UV-CA-12");
  });

  it("rechaza claves de una letra, que empiezan con número o con espacios y símbolos", () => {
    for (const clave of ["c", "1CA", "CA 1", "CA.1", "CA_1", "A".repeat(21)]) {
      expect(cuerpoAcademico.safeParse({ ...valido, clave }).success, clave).toBe(false);
    }
  });

  it("rechaza nombres con números, símbolos o muy cortos", () => {
    for (const nombre of ["CA 1", "123", "-- Cuerpo", "CA"]) {
      expect(cuerpoAcademico.safeParse({ ...valido, nombre }).success, nombre).toBe(false);
    }
  });

  it("rechaza un año de vencimiento anterior al de registro", () => {
    const resultado = cuerpoAcademico.safeParse({ ...valido, anioRegistro: "2026", anioVencimiento: "2024" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]).toMatchObject({
        path: ["anioVencimiento"],
        message: "El año de vencimiento no puede ser anterior al de registro.",
      });
    }
  });

  it("acepta el mismo año de registro y vencimiento", () => {
    expect(cuerpoAcademico.safeParse({ ...valido, anioRegistro: "2026", anioVencimiento: "2026" }).success).toBe(true);
  });
});

describe("revisarCuerpo (RF-012)", () => {
  const nuevo = cuerpoAcademico.parse({ ...valido, clave: "CA-002" });

  it("acepta un cuerpo académico nuevo", () => {
    expect(revisarCuerpo(nuevo, { departamentos, cuerpos })).toBeNull();
  });

  it("rechaza un departamento que no existe", () => {
    expect(revisarCuerpo({ ...nuevo, departamentoId: 99 }, { departamentos, cuerpos })).toEqual({
      campo: "departamentoId",
      mensaje: "El departamento elegido no existe. Recarga la página y elige otro.",
    });
  });

  it("rechaza una clave existente sin importar mayúsculas", () => {
    expect(revisarCuerpo(cuerpoAcademico.parse(valido), { departamentos, cuerpos })).toEqual({
      campo: "clave",
      mensaje: "Ya existe un cuerpo académico con la clave «CA-001».",
    });
  });
});

describe("revisarCuerpo al editar (#59)", () => {
  const conId = [{ id: 1, clave: "CA-001" }, { id: 2, clave: "CA-002" }];
  const propio = cuerpoAcademico.parse(valido);

  it("un cuerpo puede conservar su propia clave", () => {
    expect(revisarCuerpo(propio, { departamentos, cuerpos: conId }, 1)).toBeNull();
  });

  it("no puede tomar la clave de otro cuerpo", () => {
    expect(revisarCuerpo(cuerpoAcademico.parse({ ...valido, clave: "ca-002" }), { departamentos, cuerpos: conId }, 1)).toEqual({
      campo: "clave",
      mensaje: "Ya existe un cuerpo académico con la clave «CA-002».",
    });
  });
});

describe("motivoNoEliminable (#59)", () => {
  it("permite eliminar un CA sin integrantes ni LGAC", () => {
    expect(motivoNoEliminable("Cuerpo de Ejemplo", 0, 0)).toBeNull();
  });

  it("explica por qué no se elimina un CA con integrantes", () => {
    expect(motivoNoEliminable("Cuerpo de Ejemplo", 2, 0)).toBe(
      "No se puede eliminar «Cuerpo de Ejemplo»: tiene 2 integrantes. Quítalos antes de eliminarlo.",
    );
  });

  it("usa el singular con una LGAC", () => {
    expect(motivoNoEliminable("Cuerpo de Ejemplo", 0, 1)).toBe(
      "No se puede eliminar «Cuerpo de Ejemplo»: tiene 1 LGAC. Quítalos antes de eliminarlo.",
    );
  });

  it("junta integrantes y LGAC", () => {
    expect(motivoNoEliminable("Cuerpo de Ejemplo", 1, 3)).toBe(
      "No se puede eliminar «Cuerpo de Ejemplo»: tiene 1 integrante y 3 LGAC. Quítalos antes de eliminarlo.",
    );
  });
});
