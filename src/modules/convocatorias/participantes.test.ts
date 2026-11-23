import { describe, expect, it } from "vitest";
import { calcularParticipaciones, motivoNoEliminable, participante, type Participacion } from "./participantes";

const p = (id: number, profesorId: number, origen: "MANUAL" | "LISTADO", resultado: Participacion["resultado"] = null): Participacion =>
  ({ id, profesorId, origen, resultado });

describe("calcularParticipaciones (RF-018)", () => {
  it("participante en el listado queda Aprobado; el que no aparece, No Aprobado", () => {
    expect(calcularParticipaciones([p(1, 10, "MANUAL"), p(2, 20, "MANUAL")], new Set([10]))).toEqual({
      crear: [], borrar: [], aprobar: [1], noAprobar: [2], limpiar: [],
    });
  });

  it("quien aparece en el listado sin estar registrado se agrega como participante", () => {
    expect(calcularParticipaciones([], new Set([30])).crear).toEqual([30]);
  });

  it("una participación del listado cuyo profesor ya no aparece se borra", () => {
    expect(calcularParticipaciones([p(3, 30, "LISTADO", "APROBADO")], new Set()).borrar).toEqual([3]);
  });

  it("sin carga leída se borran las del listado y se limpian los resultados", () => {
    expect(calcularParticipaciones([p(1, 10, "MANUAL", "NO_APROBADO"), p(2, 20, "MANUAL"), p(3, 30, "LISTADO", "APROBADO")], null))
      .toEqual({ crear: [], borrar: [3], aprobar: [], noAprobar: [], limpiar: [1] });
  });

  it("no propone cambios si nada cambió", () => {
    expect(calcularParticipaciones([p(1, 10, "MANUAL", "APROBADO"), p(2, 20, "MANUAL", "NO_APROBADO")], new Set([10])))
      .toEqual({ crear: [], borrar: [], aprobar: [], noAprobar: [], limpiar: [] });
  });
});

describe("motivoNoEliminable", () => {
  it("no deja quitar a quien sale en el listado ni cambiar una convocatoria confirmada", () => {
    expect(motivoNoEliminable({ enListado: true, confirmada: false, convocatoria: "SNII 2026" }))
      .toBe("Aparece en el listado oficial de SNII 2026; para quitarlo, elimina o vuelve a leer la carga.");
    expect(motivoNoEliminable({ enListado: false, confirmada: true, convocatoria: "SNII 2026" }))
      .toBe("La convocatoria SNII 2026 ya se confirmó; no se pueden cambiar sus participantes.");
    expect(motivoNoEliminable({ enListado: false, confirmada: false, convocatoria: "SNII 2026" })).toBeNull();
  });
});

describe("participante (esquema)", () => {
  const esquema = participante(2026);
  const error = (datos: unknown) => {
    const r = esquema.safeParse(datos);
    return r.success ? null : r.error.issues[0].message;
  };

  it("acepta programa y año válidos", () => {
    expect(esquema.parse({ programa: "SNII", anio: "2026" })).toEqual({ programa: "SNII", anio: 2026 });
  });

  it("da mensajes en español para valores atípicos", () => {
    expect(error({ programa: "OTRO", anio: "2026" })).toBe("Elige si la convocatoria es SNII o PRODEP.");
    expect(error({ programa: "SNII", anio: "1999" })).toBe("El año debe ser 2000 o posterior.");
    expect(error({ programa: "SNII", anio: "2028" })).toBe("El año no puede ser posterior a 2027.");
    expect(error({ programa: "SNII", anio: "abc" })).toBe("Escribe el año de la convocatoria.");
    expect(error({ programa: "SNII", anio: "2026.5" })).toBe("El año debe ser un número entero.");
  });
});
