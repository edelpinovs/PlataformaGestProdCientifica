import { describe, expect, it } from "vitest";
import { decidirCierre, resultadoAlta, valoresAlta } from "./modal-alta-logica";

describe("contrato de ModalAlta (#161)", () => {
  it("bloquea el cierre durante el envío y pide confirmación solo con cambios", () => {
    expect(decidirCierre(true, false)).toBe("esperar");
    expect(decidirCierre(true, true)).toBe("esperar");
    expect(decidirCierre(false, true)).toBe("confirmar");
    expect(decidirCierre(false, false)).toBe("cerrar");
  });

  it("un error conserva campos vacíos y múltiples, sin metadatos internos de React", () => {
    const datos = new FormData();
    datos.set("nombre", ""); datos.append("programas", "1"); datos.append("programas", "2"); datos.set("$ACTION_ID", "interno");
    expect(valoresAlta(datos)).toEqual({ nombre: "", programas: ["1", "2"] });
    expect(resultadoAlta({ error: "Escribe el nombre.", campo: "nombre" }, datos)).toEqual({ error: "Escribe el nombre.", campo: "nombre", valores: { nombre: "", programas: ["1", "2"] } });
  });

  it("un resultado vacío o contradictorio no cierra el formulario como si estuviera guardado", () => {
    const datos = new FormData(); datos.set("nombre", "Registro ficticio");
    expect(resultadoAlta({}, datos)).toEqual({ error: "No se confirmó el guardado. Revisa los datos e inténtalo de nuevo.", valores: { nombre: "Registro ficticio" } });
    expect(resultadoAlta({ exito: "Guardado", error: "Ya existe." }, datos)).not.toHaveProperty("exito");
    expect(resultadoAlta({ exito: "Registro guardado." }, datos)).toEqual({ exito: "Registro guardado." });
  });
});
