import { describe, expect, it } from "vitest";
import { resumenPerfil } from "./perfil";

const base = {
  correo: "ana.demo@demo.invalid",
  rol: "COORDINADOR" as const,
  creadoEn: new Date("2026-03-05T18:30:00.000Z"),
  profesor: null,
};

describe("resumenPerfil", () => {
  it("muestra el rol con su etiqueta y la fecha de alta en español", () => {
    const r = resumenPerfil(base);
    expect(r.correo).toBe("ana.demo@demo.invalid");
    expect(r.rol).toBe("Coordinación de Investigación");
    expect(r.alta).toBe("5 de marzo de 2026");
  });

  it("la fecha de alta no cambia por la zona horaria del servidor", () => {
    // 04:00 UTC del día 6: en México aún es el día 5, pero se muestra la fecha UTC guardada.
    const r = resumenPerfil({ ...base, creadoEn: new Date("2026-03-06T04:00:00.000Z") });
    expect(r.alta).toBe("6 de marzo de 2026");
  });

  it("sin profesor vinculado no inventa datos", () => {
    expect(resumenPerfil(base).profesor).toBeNull();
  });

  it("con profesor vinculado muestra nombre completo y departamento", () => {
    const r = resumenPerfil({
      ...base,
      rol: "DOCENTE",
      profesor: { nombres: "Ana María", apellidos: "Pérez Soto", departamento: { nombre: "Ciencias Exactas" } },
    });
    expect(r.rol).toBe("Docente");
    expect(r.profesor).toEqual({ nombre: "Ana María Pérez Soto", departamento: "Ciencias Exactas" });
  });

  it("un profesor sin departamento queda con el departamento en null", () => {
    const r = resumenPerfil({
      ...base,
      profesor: { nombres: "Luis", apellidos: "Ruiz", departamento: null },
    });
    expect(r.profesor).toEqual({ nombre: "Luis Ruiz", departamento: null });
  });
});
