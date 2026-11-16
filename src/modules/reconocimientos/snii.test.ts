import { describe, expect, it } from "vitest";
import { reconocimientoSnii, resultadoSnii } from "./snii";

const reconocimiento = {
  profesorId: 1,
  cvu: "12345678",
  nivel: "NIVEL_1",
  tipoParticipacion: "NUEVO_INGRESO",
  fechaInicio: "2026-01-01",
  fechaFin: "2029-12-31",
  enRecursoReconsideracion: false,
} as const;

describe("reconocimientoSnii (RF-007)", () => {
  it("acepta un nombramiento válido", () => {
    expect(reconocimientoSnii.safeParse(reconocimiento).success).toBe(true);
  });

  it.each(["alta", "edición"])("rechaza una renovación de Candidato durante %s", () => {
    const resultado = reconocimientoSnii.safeParse({
      ...reconocimiento,
      nivel: "CANDIDATO",
      tipoParticipacion: "RENOVACION",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(["tipoParticipacion"]);
      expect(resultado.error.issues[0]?.message).toBe("El nivel Candidato no admite renovación.");
    }
  });

  it.each(["NUEVO_INGRESO", "REINGRESO_NO_VIGENTE"])("permite Candidato con tipo de participación %s", (tipoParticipacion) => {
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, nivel: "CANDIDATO", tipoParticipacion }).success).toBe(true);
  });

  it.each(["NIVEL_1", "NIVEL_2", "NIVEL_3", "EMERITO"])("permite renovar el nivel %s", (nivel) => {
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, nivel, tipoParticipacion: "RENOVACION" }).success).toBe(true);
  });

  it("normaliza espacios del CVU y acepta fechas límite válidas", () => {
    const resultado = reconocimientoSnii.parse({
      ...reconocimiento,
      cvu: "  12345678  ",
      fechaInicio: "2000-02-29",
      fechaFin: "2000-03-01",
    });
    expect(resultado.cvu).toBe("12345678");
  });

  it("rechaza fechas iguales o en orden inverso", () => {
    for (const [fechaInicio, fechaFin] of [["2026-01-01", "2026-01-01"], ["2027-01-01", "2026-01-01"]]) {
      const resultado = reconocimientoSnii.safeParse({ ...reconocimiento, fechaInicio, fechaFin });
      expect(resultado.success).toBe(false);
      if (!resultado.success) expect(resultado.error.issues[0]?.message).toContain("posterior");
    }
  });

  it("rechaza días inexistentes, formatos distintos y años bisiestos inválidos", () => {
    for (const fechaInicio of ["2026-02-29", "2026-13-01", "01-01-2026"]) {
      expect(reconocimientoSnii.safeParse({ ...reconocimiento, fechaInicio }).success).toBe(false);
    }
  });

  it("rechaza asociaciones, CVU y valores obligatorios inválidos", () => {
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, profesorId: 0 }).success).toBe(false);
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, cvu: " " }).success).toBe(false);
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, cvu: "1234ABCD" }).success).toBe(false);
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, nivel: "NIVEL_4" }).success).toBe(false);
    expect(reconocimientoSnii.safeParse({ ...reconocimiento, enRecursoReconsideracion: "false" }).success).toBe(false);
  });

  it("muestra el mensaje en español para identificadores de profesor inválidos", () => {
    for (const profesorId of [Number.NaN, 1.5]) {
      const resultado = reconocimientoSnii.safeParse({ ...reconocimiento, profesorId });
      expect(resultado.success).toBe(false);
      if (!resultado.success) expect(resultado.error.issues[0]?.message).toBe("Selecciona un profesor.");
    }
  });

  it("mapea el nivel y la reconsideración al dictamen existente", () => {
    expect(resultadoSnii("NIVEL_1", false)).toBe("APROBADO");
    expect(resultadoSnii("NO_APROBADO", false)).toBe("NO_APROBADO");
    expect(resultadoSnii("NO_APROBADO", true)).toBe("EN_RECONSIDERACION");
  });
});
