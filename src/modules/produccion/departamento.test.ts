import { describe, expect, it } from "vitest";
import { condicionDepartamento, departamentoEsquema, opcionesDepartamento, SIN_DEPARTAMENTO, textoDepartamento } from "./departamento";

const departamentos = [{ id: 3, nombre: "Departamento Ficticio", nomenclatura: "DFI" }];

describe("filtro por departamento (Escanear y Publicaciones)", () => {
  it("acepta vacío, «sin» y un id; rechaza lo demás con un mensaje en español", () => {
    for (const valor of ["", SIN_DEPARTAMENTO, "3"]) expect(departamentoEsquema.safeParse(valor).success).toBe(true);
    for (const valor of ["0", "-1", "abc", "3.5", "99999999999", 3]) {
      const resultado = departamentoEsquema.safeParse(valor);
      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0].message).toBe("Selecciona un departamento válido.");
    }
  });

  it("traduce el valor a la condición del profesor", () => {
    expect(condicionDepartamento("")).toBeUndefined();
    expect(condicionDepartamento(undefined)).toBeUndefined();
    expect(condicionDepartamento(SIN_DEPARTAMENTO)).toEqual({ departamentoId: null });
    expect(condicionDepartamento("3")).toEqual({ departamentoId: 3 });
  });

  it("ofrece los departamentos con su nomenclatura y «Sin departamento» al final", () => {
    expect(opcionesDepartamento(departamentos)).toEqual([
      { valor: "3", texto: "Departamento Ficticio (DFI)" },
      { valor: SIN_DEPARTAMENTO, texto: "Sin departamento" },
    ]);
  });

  it("nombra el departamento elegido para los resúmenes", () => {
    expect(textoDepartamento("3", departamentos)).toBe("Departamento Ficticio (DFI)");
    expect(textoDepartamento(SIN_DEPARTAMENTO, departamentos)).toBe("sin departamento");
    expect(textoDepartamento("9", departamentos)).toBe("el departamento #9");
  });
});
