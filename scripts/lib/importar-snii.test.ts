import { describe, expect, it } from "vitest";
import {
  contarPorNivelYEstado,
  crearBitacoraSnii,
  estadoDelPeriodo,
  informePlanSnii,
  planSnii,
  prepararReversionSnii,
  resumenAnonimo,
  tipoParticipacion,
  type PlanSnii,
  type ProfesorBaseSnii,
  type ProfesorPaquete,
  type RegistroSnii,
  type SniiExistente,
} from "./importar-snii";

// Todo es ficticio: nombres, códigos, CVU y fechas inventados para las pruebas.
const HOY = "2026-12-01";
const base: ProfesorBaseSnii[] = [
  { id: 1, codigo: "9000001", cvu: "100001" },
  { id: 2, codigo: "9000002", cvu: "100002" },
  { id: 3, codigo: "9000003", cvu: null }, // sin CVU en la base
];
const paquete: ProfesorPaquete[] = [
  { id: "p1", codigo_udg: "9000001", nombre_completo: "ZULEMA QUINTANAR" },
  { id: "p2", codigo_udg: "9000002", nombre_completo: "ALDO PRIETO" },
  { id: "p3", codigo_udg: "9000003", nombre_completo: "BEATRIZ OCHOA" },
  { id: "p4", codigo_udg: "9000004", nombre_completo: "CARLA MENA" }, // no está en la base
  { id: "p5", codigo_udg: null, nombre_completo: "DIEGO SOLIS" }, // sin código
];

function registro(parcial: Partial<RegistroSnii> = {}): RegistroSnii {
  return {
    profesor_id: "p1",
    nivel: "I",
    fecha_inicio: "2027-01-01",
    fecha_fin: "2030-12-31",
    nivel_anterior: null,
    resultado_convocatoria: "INGRESO",
    estatus_observacion: "PARTICIPO_CONVOCATORIA_2026",
    ...parcial,
  };
}

const plan = (registros: RegistroSnii[], existentes: SniiExistente[] = [], opciones = {}) =>
  planSnii(base, existentes, registros, paquete, { hoy: HOY, ...opciones });
const motivos = (p: PlanSnii) => p.omitidos.map((o) => o.motivo);

describe("tipoParticipacion (P7, D-284)", () => {
  const r = (parcial: Partial<RegistroSnii>) => registro(parcial);
  it("INGRESO es nuevo ingreso", () => {
    expect(tipoParticipacion(r({ resultado_convocatoria: "INGRESO" }), "CANDIDATO")).toBe("NUEVO_INGRESO");
  });
  it("PROMOVIDO es renovación, haya participado o no", () => {
    expect(tipoParticipacion(r({ resultado_convocatoria: "PROMOVIDO" }), "NIVEL_1")).toBe("RENOVACION");
    expect(tipoParticipacion(r({ resultado_convocatoria: "PROMOVIDO", estatus_observacion: null }), "NIVEL_1")).toBe("RENOVACION");
  });
  it("quien se mantuvo y participó en 2026 es renovación", () => {
    expect(
      tipoParticipacion(r({ resultado_convocatoria: "SE_MANTUVO", estatus_observacion: "PARTICIPO_CONVOCATORIA_2026" }), "NIVEL_1"),
    ).toBe("RENOVACION");
  });
  it("quien se mantuvo sin participar no trae tipo: con solo_con_tipo es null", () => {
    expect(tipoParticipacion(r({ resultado_convocatoria: "SE_MANTUVO", estatus_observacion: null }), "NIVEL_1")).toBeNull();
    expect(tipoParticipacion(r({ resultado_convocatoria: null, estatus_observacion: null }), "NIVEL_1")).toBeNull();
  });
  it("la estrategia inferir (opción A) solo se usa en pruebas: Candidato no renueva y con periodo previo se renueva", () => {
    const sinTipo = r({ resultado_convocatoria: "SE_MANTUVO", estatus_observacion: null, nivel_anterior: "I" });
    expect(tipoParticipacion(sinTipo, "NIVEL_1", "inferir")).toBe("RENOVACION");
    expect(tipoParticipacion(sinTipo, "CANDIDATO", "inferir")).toBe("NUEVO_INGRESO");
    expect(tipoParticipacion({ ...sinTipo, nivel_anterior: null }, "NIVEL_1", "inferir")).toBe("NUEVO_INGRESO");
  });
});

describe("planSnii · niveles y periodos válidos", () => {
  it("convierte los cinco niveles", () => {
    const niveles = [
      ["C", "CANDIDATO"],
      ["I", "NIVEL_1"],
      ["II", "NIVEL_2"],
      ["III", "NIVEL_3"],
      ["E", "EMERITO"],
    ] as const;
    for (const [codigo, esperado] of niveles) {
      const p = plan([registro({ nivel: codigo, resultado_convocatoria: "INGRESO" })]);
      expect(p.crear[0]?.nivel).toBe(esperado);
    }
  });

  it("omite un nivel que no se reconoce", () => {
    const p = plan([registro({ nivel: "IV" })]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["nivel_desconocido"]);
  });

  it("crea un periodo válido con su tipo, sus fechas y su estado", () => {
    const p = plan([registro()]);
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toEqual([
      {
        profesorId: 1,
        etiqueta: "ZULEMA QUINTANAR",
        nivel: "NIVEL_1",
        tipoParticipacion: "NUEVO_INGRESO",
        inicio: "2027-01-01",
        fin: "2030-12-31",
        estado: "POR_INICIAR",
      },
    ]);
  });

  it("omite con motivo a quien no tiene tipo de participación (D-284)", () => {
    const p = plan([registro({ resultado_convocatoria: "SE_MANTUVO", estatus_observacion: null, fecha_inicio: "2024-01-01", fecha_fin: "2028-12-31" })]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["sin_tipo"]);
  });

  it("con inferir (solo pruebas) sí carga el periodo sin tipo", () => {
    const p = plan(
      [registro({ resultado_convocatoria: "SE_MANTUVO", estatus_observacion: null, nivel_anterior: "I", fecha_inicio: "2024-01-01", fecha_fin: "2028-12-31" })],
      [],
      { estrategia: "inferir" },
    );
    expect(p.crear).toHaveLength(1);
    expect(p.crear[0].tipoParticipacion).toBe("RENOVACION");
  });
});

describe("planSnii · profesor", () => {
  it("omite al profesor que no está en la base, sin código o sin registro en el paquete", () => {
    const p = plan([
      registro({ profesor_id: "p4" }),
      registro({ profesor_id: "p5" }),
      registro({ profesor_id: "p9" }),
    ]);
    expect(p.crear).toEqual([]);
    expect(motivos(p).sort()).toEqual(["fuera_de_la_base", "profesor_sin_registro", "sin_codigo"]);
  });

  it("omite al profesor sin CVU en la base (el formulario SNII lo exige) y no lo escribe", () => {
    const p = plan([registro({ profesor_id: "p3" })]);
    expect(p.crear).toEqual([]);
    expect(p.omitidos[0]).toMatchObject({ motivo: "sin_cvu" });
  });
});

describe("planSnii · reglas del formulario", () => {
  it("rechaza Candidato con Renovación (D-225) con el mensaje en español", () => {
    const p = plan([registro({ nivel: "C", resultado_convocatoria: "PROMOVIDO" })]);
    expect(p.crear).toEqual([]);
    expect(p.omitidos[0]).toMatchObject({ motivo: "dato_invalido", detalle: "El nivel Candidato no admite renovación." });
  });

  it("rechaza fechas con el fin anterior al inicio", () => {
    const p = plan([registro({ fecha_inicio: "2030-01-01", fecha_fin: "2027-01-01" })]);
    expect(p.omitidos[0]).toMatchObject({
      motivo: "dato_invalido",
      detalle: "La fecha de fin debe ser posterior a la fecha de inicio.",
    });
  });

  it("rechaza una fecha inválida", () => {
    const p = plan([registro({ fecha_inicio: "2027-02-31" })]);
    expect(p.omitidos[0]).toMatchObject({ motivo: "dato_invalido", detalle: "Ingresa una fecha válida." });
  });
});

describe("planSnii · traslapes y existentes", () => {
  const existente = (profesorId: number, inicio: string, fin: string): SniiExistente => ({
    profesorId,
    inicio: new Date(`${inicio}T00:00:00.000Z`),
    fin: new Date(`${fin}T00:00:00.000Z`),
  });

  it("omite un periodo que se traslapa con uno ya existente en la base (D-103)", () => {
    const p = plan([registro()], [existente(1, "2025-01-01", "2027-06-30")]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["traslape"]);
  });

  it("omite el segundo de dos periodos del lote que se traslapan", () => {
    const p = plan([
      registro({ fecha_inicio: "2027-01-01", fecha_fin: "2030-12-31" }),
      registro({ fecha_inicio: "2029-01-01", fecha_fin: "2032-12-31", resultado_convocatoria: "PROMOVIDO" }),
    ]);
    expect(p.crear).toHaveLength(1);
    expect(motivos(p)).toEqual(["traslape"]);
  });

  it("admite el periodo de 2026 y el que lo reemplaza cuando no se traslapan", () => {
    const p = plan(
      [
        registro({ fecha_inicio: "2022-01-01", fecha_fin: "2026-12-31", resultado_convocatoria: "PROMOVIDO", nivel: "I" }),
        registro({ fecha_inicio: "2027-01-01", fecha_fin: "2030-12-31", resultado_convocatoria: "PROMOVIDO", nivel: "II" }),
      ],
      [],
    );
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toHaveLength(2);
  });

  it("no vuelve a crear un periodo que ya existe con las mismas fechas (idempotencia)", () => {
    const primero = plan([registro()]);
    expect(primero.crear).toHaveLength(1);

    const despues = primero.crear.map((c) => existente(c.profesorId, c.inicio, c.fin));
    const segundo = plan([registro()], despues);
    expect(segundo.crear).toEqual([]);
    expect(segundo.existentes).toBe(1);
    expect(segundo.omitidos).toEqual([]);
  });

  it("el periodo de otro profesor no cuenta como traslape", () => {
    const p = plan([registro({ profesor_id: "p2" })], [existente(1, "2027-01-01", "2030-12-31")]);
    expect(p.crear).toHaveLength(1);
  });
});

describe("estado del periodo", () => {
  it("distingue vigente, por iniciar y vencido con la fecha de hoy", () => {
    expect(estadoDelPeriodo("2024-01-01", "2028-12-31", HOY)).toBe("VIGENTE");
    expect(estadoDelPeriodo("2027-01-01", "2030-12-31", HOY)).toBe("POR_INICIAR");
    expect(estadoDelPeriodo("2020-01-01", "2026-11-30", HOY)).toBe("VENCIDO");
    expect(estadoDelPeriodo("2026-12-01", "2030-12-31", HOY)).toBe("VIGENTE");
    expect(estadoDelPeriodo("2022-01-01", "2026-12-01", HOY)).toBe("VIGENTE");
  });

  it("cuenta lo que se crea por nivel y estado", () => {
    const p = plan([
      registro({ profesor_id: "p1", fecha_inicio: "2024-01-01", fecha_fin: "2028-12-31", resultado_convocatoria: "PROMOVIDO" }),
      registro({ profesor_id: "p2", fecha_inicio: "2027-01-01", fecha_fin: "2030-12-31" }),
    ]);
    expect([...contarPorNivelYEstado(p)]).toEqual([
      ["NIVEL_1 · POR_INICIAR", 1],
      ["NIVEL_1 · VIGENTE", 1],
    ]);
  });
});

describe("informes", () => {
  it("el resumen impreso no lleva nombres, solo conteos", () => {
    const p = plan([registro(), registro({ profesor_id: "p4" })]);
    const resumen = resumenAnonimo(p);
    expect(resumen).toContain("A crear:                     1");
    expect(resumen).toContain("Profesor que no está en la base");
    expect(resumen).not.toMatch(/ZULEMA|QUINTANAR|CARLA|MENA/);
    // El informe sí lleva nombres: se escribe solo en datos-reales/, que git ignora.
    expect(informePlanSnii(p)).toContain("ZULEMA QUINTANAR");
  });
});

describe("bitácora y reversión", () => {
  const creados = [
    { id: 11, profesorId: 1, nivel: "NIVEL_1", inicio: "2027-01-01", fin: "2030-12-31" },
    { id: 12, profesorId: 2, nivel: "NIVEL_1", inicio: "2027-01-01", fin: "2030-12-31" },
    { id: 13, profesorId: 2, nivel: "NIVEL_2", inicio: "2031-01-01", fin: "2034-12-31" },
    { id: 14, profesorId: 1, nivel: "CANDIDATO", inicio: "2022-01-01", fin: "2026-12-31" },
  ];
  const bitacora = crearBitacoraSnii(creados, new Date("2026-12-01T00:00:00Z"), "127.0.0.1:54322/postgres");

  it("registra cada periodo creado", () => {
    expect(bitacora.fase).toBe("snii");
    expect(bitacora.creados).toHaveLength(4);
  });

  it("borra lo intacto y reporta lo editado, lo que ya tiene convocatoria y lo que no existe", () => {
    const { borrar, conflictos } = prepararReversionSnii(
      bitacora,
      new Map([
        [11, { profesorId: 1, nivel: "NIVEL_1", inicio: "2027-01-01", fin: "2030-12-31", convocatoriaId: null }], // intacto
        [12, { profesorId: 2, nivel: "NIVEL_2", inicio: "2027-01-01", fin: "2030-12-31", convocatoriaId: null }], // cambió de nivel
        [13, { profesorId: 2, nivel: "NIVEL_2", inicio: "2031-01-01", fin: "2034-12-31", convocatoriaId: 5 }], // ya es oficial
        // 14 ya no existe
      ]),
    );
    expect(borrar.map((c) => c.id)).toEqual([11]);
    expect(conflictos).toEqual([
      { id: 12, motivo: "El reconocimiento cambió después de la carga; no se toca." },
      { id: 13, motivo: "Ya forma parte de un resultado de convocatoria (D-107); no se borra." },
      { id: 14, motivo: "El reconocimiento ya no existe en la base." },
    ]);
  });
});
