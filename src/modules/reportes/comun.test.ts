import { describe, expect, it } from "vitest";
import {
  columnasSinDatosPersonales,
  coincideDepartamento,
  CORREO_PENDIENTE,
  incluyeBusqueda,
  leerDepartamento,
  mismaSeleccion,
  textoCorreo,
  textoCvu,
} from "./comun";

describe("piezas comunes de reportes", () => {
  it("acepta un departamento del catálogo y el valor sin departamento", () => {
    expect(leerDepartamento("2", [1, 2]).id).toBe(2);
    expect(leerDepartamento("sin", [1]).id).toBe("sin");
    expect(leerDepartamento("", [1]).id).toBeNull();
    expect(leerDepartamento("9", [1]).error).toBe("Elige un departamento que exista.");
    expect(leerDepartamento(["1", "2"], [1]).error).toBe("Elige un solo departamento.");
  });

  it("aísla las filas sin departamento y no las mezcla con un id", () => {
    expect(coincideDepartamento(null, "sin")).toBe(true);
    expect(coincideDepartamento(1, "sin")).toBe(false);
    expect(coincideDepartamento(null, 1)).toBe(false);
    expect(coincideDepartamento(1, null)).toBe(true);
  });

  it("un correo marcador se muestra como pendiente y el CVU vacío no se inventa", () => {
    expect(textoCorreo("pend-0001@pendiente.invalid", "Sin correo")).toBe(CORREO_PENDIENTE);
    expect(textoCorreo("  Ada@Pendiente.Invalid ", "Sin correo")).toBe(CORREO_PENDIENTE);
    expect(textoCorreo("ada@demo.invalid", "Sin correo")).toBe("ada@demo.invalid");
    expect(textoCorreo("  ", "Sin correo")).toBe("Sin correo");
    expect(textoCvu("  ", "Sin CVU")).toBe("Sin CVU");
    expect(textoCvu("100200", "Sin CVU")).toBe("100200");
  });

  it("al entrar, el correo y el CVU no vienen elegidos", () => {
    const iniciales = columnasSinDatosPersonales(["nombre", "correo", "cvu", "fin"] as const);
    expect(iniciales).toEqual(["nombre", "fin"]);
    expect(mismaSeleccion(iniciales, ["nombre", "fin"])).toBe(true);
    expect(mismaSeleccion(["nombre", "correo"], iniciales)).toBe(false);
  });

  it("buscar activo no incluye a quien no está activo", () => {
    expect(incluyeBusqueda("No activo", "activo")).toBe(false);
    expect(incluyeBusqueda("Activo", "activo")).toBe(true);
    expect(incluyeBusqueda("No activo", "no activo")).toBe(true);
  });
});
