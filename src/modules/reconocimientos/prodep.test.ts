import { describe, expect, it } from "vitest";
import {
  calcularVigenciaProdep,
  crearEsquemaReconocimientoProdep,
  filtrarReconocimientosProdep,
  ordenarReconocimientosProdep,
  type RegistroHistorialProdep,
} from "./prodep";

const historialConsolidado: RegistroHistorialProdep[] = [
  {
    tipoSolicitud: "PRIMER_RECONOCIMIENTO",
    resultado: "APROBADO",
    fechaInicio: "2020-01-01",
    fechaFin: "2022-12-31",
  },
  {
    tipoSolicitud: "RENOVACION",
    resultado: "APROBADO",
    fechaInicio: "2023-01-01",
    fechaFin: "2025-12-31",
  },
];

const datosBase = {
  profesorId: 7,
  tipoSolicitud: "PRIMER_RECONOCIMIENTO",
  resultado: "APROBADO",
  fechaInicio: "2026-01-01",
  fechaFin: "2028-12-31",
} as const;

describe("calcularVigenciaProdep (RF-010)", () => {
  it("asigna tres años al primer reconocimiento", () => {
    expect(calcularVigenciaProdep({
      tipoSolicitud: "PRIMER_RECONOCIMIENTO",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    })).toEqual({
      duracionAnios: 3,
      fechaFin: "2028-12-31",
      motivo: "primer-reconocimiento",
    });
  });

  describe("listado PRODEP", () => {
    it("busca por dictamen o fecha y ordena usando solo columnas declaradas", () => {
      const consulta = (q: string) => ({
        pagina: 1,
        q,
        orden: "fin",
        dir: "desc" as const,
        filtros: { resultado: "" },
      });

      const porDictamen = filtrarReconocimientosProdep(consulta("No aprobado"));
      expect(porDictamen.OR).toContainEqual({ resultado: "NO_APROBADO" });

      const porFecha = filtrarReconocimientosProdep(consulta("2026-01-01"));
      expect(porFecha.OR).toContainEqual({ inicio: new Date("2026-01-01T00:00:00.000Z") });

      expect(ordenarReconocimientosProdep(consulta(""))[0]).toEqual({ fin: "desc" });
    });
  });

  it("asigna tres años a una renovación sin historial consolidado suficiente", () => {
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    })).toMatchObject({ duracionAnios: 3, fechaFin: "2028-12-31" });

    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    }, [historialConsolidado[1]])).toMatchObject({ duracionAnios: 3 });

    const ordenInverso: RegistroHistorialProdep[] = [
      { ...historialConsolidado[0], tipoSolicitud: "RENOVACION", fechaInicio: "2020-01-01", fechaFin: "2022-12-31" },
      { ...historialConsolidado[1], tipoSolicitud: "PRIMER_RECONOCIMIENTO", fechaInicio: "2023-01-01", fechaFin: "2025-12-31" },
    ];
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    }, ordenInverso).duracionAnios).toBe(3);
  });

  it("asigna seis años al renovar después de un primer reconocimiento y una renovación aprobados y continuos", () => {
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    }, historialConsolidado)).toEqual({
      duracionAnios: 6,
      fechaFin: "2031-12-31",
      motivo: "renovacion-consolidada",
    });

    const historialBisiesto: RegistroHistorialProdep[] = [
      {
        tipoSolicitud: "PRIMER_RECONOCIMIENTO",
        resultado: "APROBADO",
        fechaInicio: "2018-03-01",
        fechaFin: "2021-02-28",
      },
      {
        tipoSolicitud: "RENOVACION",
        resultado: "APROBADO",
        fechaInicio: "2021-03-01",
        fechaFin: "2024-02-28",
      },
    ];
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2024-02-29",
    }, historialBisiesto)).toMatchObject({ duracionAnios: 6, fechaFin: "2030-02-27" });
  });

  it("no consolida una brecha, un dictamen no aprobado ni uno en reconsideración", () => {
    const renovacionTrasBrecha = {
      tipoSolicitud: "RENOVACION" as const,
      resultado: "APROBADO" as const,
      fechaInicio: "2026-01-01",
    };
    const conBrecha = historialConsolidado.map((registro) => ({ ...registro }));
    conBrecha[1] = { ...conBrecha[1], fechaInicio: "2023-01-02" };
    const conNoAprobado = [
      ...historialConsolidado,
      {
        tipoSolicitud: "RENOVACION" as const,
        resultado: "NO_APROBADO" as const,
        fechaInicio: "2026-01-01",
        fechaFin: "2028-12-31",
      },
    ];
    const enReconsideracion = [
      ...historialConsolidado,
      {
        tipoSolicitud: "RENOVACION" as const,
        resultado: "EN_RECONSIDERACION" as const,
        fechaInicio: "2026-01-01",
        fechaFin: "2028-12-31",
      },
    ];

    expect(calcularVigenciaProdep(renovacionTrasBrecha, conBrecha).duracionAnios).toBe(3);
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2029-01-01",
    }, conNoAprobado).duracionAnios).toBe(3);
    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2029-01-01",
    }, enReconsideracion).duracionAnios).toBe(3);
    expect(calcularVigenciaProdep({
      ...renovacionTrasBrecha,
      resultado: "EN_RECONSIDERACION",
    }, historialConsolidado)).toMatchObject({ duracionAnios: 3, motivo: "dictamen-pendiente" });
  });

  it("calcula el fin de periodo en fechas bisiestas y al cerrar cada duración", () => {
    expect(calcularVigenciaProdep({
      tipoSolicitud: "PRIMER_RECONOCIMIENTO",
      resultado: "APROBADO",
      fechaInicio: "2024-02-29",
    }).fechaFin).toBe("2027-02-27");

    expect(calcularVigenciaProdep({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
      fechaInicio: "2026-01-01",
    }, historialConsolidado).fechaFin).toBe("2031-12-31");
  });

  it("valida en el esquema Zod la fecha de fin que corresponde a los antecedentes", () => {
    const esquema = crearEsquemaReconocimientoProdep(historialConsolidado);
    expect(esquema.safeParse({
      ...datosBase,
      tipoSolicitud: "RENOVACION",
      fechaFin: "2031-12-31",
    }).success).toBe(true);

    const resultado = esquema.safeParse({
      ...datosBase,
      tipoSolicitud: "RENOVACION",
      fechaFin: "2028-12-31",
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.find((incidencia) => incidencia.path[0] === "fechaFin")?.message)
        .toBe("La fecha de fin debe ser 2031-12-31 para una vigencia de 6 años.");
    }

    const fechaInvalida = crearEsquemaReconocimientoProdep().safeParse({
      ...datosBase,
      fechaInicio: "2026-02-29",
    });
    expect(fechaInvalida.success).toBe(false);
    if (!fechaInvalida.success) {
      expect(fechaInvalida.error.issues.find((incidencia) => incidencia.path[0] === "fechaInicio")?.message)
        .toBe("Ingresa una fecha válida.");
    }

    const tipoInvalido = crearEsquemaReconocimientoProdep().safeParse({
      ...datosBase,
      tipoSolicitud: "OTRO",
    });
    expect(tipoInvalido.success).toBe(false);
    if (!tipoInvalido.success) {
      expect(tipoInvalido.error.issues[0]?.message).toBe("Selecciona un tipo de solicitud válido.");
    }
  });

  it("rechaza datos atípicos con mensajes en español", () => {
    const resultado = crearEsquemaReconocimientoProdep().safeParse({
      ...datosBase,
      profesorId: Number.NaN,
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]?.message).toBe("Selecciona un profesor.");
  });
});
