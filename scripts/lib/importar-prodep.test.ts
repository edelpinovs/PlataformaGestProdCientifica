import { describe, expect, it } from "vitest";
import {
  contarPorTipoYEstado,
  crearBitacoraProdep,
  duracionDelPaquete,
  informePlanProdep,
  planProdep,
  prepararReversionProdep,
  resumenAnonimo,
  tipoSolicitudDelPerfil,
  type PlanProdep,
  type ProdepActual,
  type ProdepExistente,
  type ProfesorBaseProdep,
  type ProfesorPaqueteProdep,
  type RegistroProdep,
} from "./importar-prodep";

// Todo es ficticio: nombres, códigos y fechas inventados para las pruebas.
const HOY = "2026-12-01";
const base: ProfesorBaseProdep[] = [
  { id: 1, codigo: "9000001", tipoContratacion: "TIEMPO_COMPLETO" },
  { id: 2, codigo: "9000002", tipoContratacion: "TIEMPO_COMPLETO" },
  { id: 3, codigo: "9000003", tipoContratacion: "ASIGNATURA" },
  { id: 4, codigo: "9000004", tipoContratacion: "PENDIENTE" },
];
const paquete: ProfesorPaqueteProdep[] = [
  { id: "p1", codigo_udg: "9000001", nombre_completo: "ZULEMA QUINTANAR" },
  { id: "p2", codigo_udg: "9000002", nombre_completo: "ALDO PRIETO" },
  { id: "p3", codigo_udg: "9000003", nombre_completo: "BEATRIZ OCHOA" },
  { id: "p4", codigo_udg: "9000004", nombre_completo: "CARLA MENA" },
  { id: "p5", codigo_udg: "9000005", nombre_completo: "DIEGO SOLIS" }, // no está en la base
  { id: "p6", codigo_udg: null, nombre_completo: "ELENA ROBLES" }, // sin código
];

// Un Perfil de 3 años: del 16 de julio de 2026 al 15 de julio de 2029.
function registro(parcial: Partial<RegistroProdep> = {}): RegistroProdep {
  return { profesor_id: "p1", fecha_inicio: "2026-07-16", fecha_fin: "2029-07-15", ...parcial };
}

const plan = (registros: RegistroProdep[], existentes: ProdepExistente[] = [], opciones = {}) =>
  planProdep(base, existentes, registros, paquete, { hoy: HOY, ...opciones });
const motivos = (p: PlanProdep) => p.omitidos.map((o) => o.motivo);
const fecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const previo = (parcial: Omit<Partial<ProdepExistente>, "inicio" | "fin"> & { inicio: string; fin: string }): ProdepExistente => ({
  profesorId: 1,
  tipoSolicitud: "RENOVACION",
  resultado: "APROBADO",
  ...parcial,
  inicio: fecha(parcial.inicio),
  fin: fecha(parcial.fin),
});

// Historial que consolida (D-232): primer reconocimiento y renovación aprobados, contiguos, antes del 2026-07-16.
const historialConsolidado: ProdepExistente[] = [
  previo({ tipoSolicitud: "PRIMER_RECONOCIMIENTO", inicio: "2020-07-16", fin: "2023-07-15" }),
  previo({ tipoSolicitud: "RENOVACION", inicio: "2023-07-16", fin: "2026-07-15" }),
];
const seisAnios = registro({ fecha_fin: "2032-07-15" });

describe("duración y tipo de solicitud (P8, D-285)", () => {
  it("reconoce 3 y 6 años por las fechas; otra cosa es null", () => {
    expect(duracionDelPaquete("2026-07-16", "2029-07-15")).toBe(3);
    expect(duracionDelPaquete("2026-07-16", "2032-07-15")).toBe(6);
    expect(duracionDelPaquete("2026-07-16", "2028-07-15")).toBeNull();
    expect(duracionDelPaquete("2026-13-40", "2029-07-15")).toBeNull();
  });
  it("los de 6 años son renovación; los de 3 años no traen tipo por omisión", () => {
    expect(tipoSolicitudDelPerfil(6)).toBe("RENOVACION");
    expect(tipoSolicitudDelPerfil(3)).toBeNull();
    expect(tipoSolicitudDelPerfil(3, "PRIMER_RECONOCIMIENTO")).toBe("PRIMER_RECONOCIMIENTO");
  });
});

describe("planProdep · fechas y profesor", () => {
  it("omite el Perfil sin fecha de inicio o de fin", () => {
    const p = plan([
      registro({ fecha_inicio: null, fecha_fin: null }),
      registro({ profesor_id: "p2", fecha_inicio: "", fecha_fin: "2029-07-15" }),
      registro({ profesor_id: "p2", fecha_inicio: "2026-07-16", fecha_fin: undefined }),
    ]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["sin_fechas", "sin_fechas", "sin_fechas"]);
  });

  it("omite al profesor que no está en la base, sin código o sin registro en el paquete", () => {
    const p = plan([
      registro({ profesor_id: "p5" }),
      registro({ profesor_id: "p6" }),
      registro({ profesor_id: "p99" }),
    ]);
    expect(motivos(p).sort()).toEqual(["fuera_de_la_base", "profesor_sin_registro", "sin_codigo"]);
  });
});

describe("planProdep · tiempo completo (P9)", () => {
  it("omite a quien tiene nombramiento de asignatura, con el mensaje de la pantalla", () => {
    const p = plan([registro({ profesor_id: "p3" })], [], { tipoSolicitud3Anios: "RENOVACION" });
    expect(p.crear).toEqual([]);
    expect(p.omitidos).toHaveLength(1);
    expect(p.omitidos[0]).toMatchObject({ motivo: "sin_tiempo_completo", detalle: "El Perfil Deseable PRODEP requiere Tiempo Completo." });
  });

  it("distingue la contratación pendiente de la que no es de tiempo completo", () => {
    const p = plan([registro({ profesor_id: "p4" })], [], { tipoSolicitud3Anios: "RENOVACION" });
    expect(motivos(p)).toEqual(["contratacion_pendiente"]);
    expect(p.omitidos[0]?.detalle).toContain("Primero registra el tipo de contratación");
  });
});

describe("planProdep · tipo de solicitud y vigencia", () => {
  it("no carga un Perfil de 3 años sin tipo de solicitud (D-285)", () => {
    const p = plan([registro()]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["sin_tipo"]);
  });

  it("carga el de 3 años cuando se indica el tipo (solo pruebas o una decisión futura)", () => {
    const p = plan([registro()], [], { tipoSolicitud3Anios: "PRIMER_RECONOCIMIENTO" });
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toEqual([
      {
        profesorId: 1,
        etiqueta: "ZULEMA QUINTANAR",
        tipoSolicitud: "PRIMER_RECONOCIMIENTO",
        duracionAnios: 3,
        inicio: "2026-07-16",
        fin: "2029-07-15",
        estado: "VIGENTE",
      },
    ]);
  });

  it("carga el de 6 años como Renovación cuando el historial en la base lo consolida (RF-010, D-232)", () => {
    const p = plan([seisAnios], historialConsolidado);
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toHaveLength(1);
    expect(p.crear[0]).toMatchObject({ tipoSolicitud: "RENOVACION", duracionAnios: 6, fin: "2032-07-15" });
  });

  it("NO ajusta la fecha: el de 6 años sin historial que lo consolide se reporta", () => {
    const p = plan([seisAnios]);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["fecha_fin_distinta"]);
    // Dice qué trae el Excel y qué calcula el repo.
    expect(p.omitidos[0]?.detalle).toContain("2032-07-15");
    expect(p.omitidos[0]?.detalle).toContain("2029-07-15");
    expect(p.omitidos[0]?.detalle).toContain("3 años");
  });

  it("un historial con una brecha no consolida los 6 años", () => {
    const conBrecha = [historialConsolidado[0]!, previo({ inicio: "2023-08-01", fin: "2026-07-31" })];
    expect(motivos(plan([seisAnios], conBrecha))).toEqual(["fecha_fin_distinta"]);
  });

  it("un historial no aprobado no consolida los 6 años", () => {
    const noAprobado = [historialConsolidado[0]!, { ...historialConsolidado[1]!, resultado: "NO_APROBADO" as const }];
    expect(motivos(plan([seisAnios], noAprobado))).toEqual(["fecha_fin_distinta"]);
  });

  it("omite una vigencia que no es de 3 ni de 6 años", () => {
    const p = plan([registro({ fecha_fin: "2028-07-15" })]);
    expect(motivos(p)).toEqual(["duracion_desconocida"]);
  });

  it("omite el de 3 años cuyo fin es el día del aniversario, un día después de lo que calcula el repo", () => {
    const p = plan([registro({ fecha_fin: "2029-07-16" })], [], { tipoSolicitud3Anios: "PRIMER_RECONOCIMIENTO" });
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["fecha_fin_distinta"]);
    expect(p.omitidos[0]?.detalle).toContain("El Excel trae 2029-07-16");
    expect(p.omitidos[0]?.detalle).toContain("2029-07-15");
  });

  it("omite con motivo la fecha de fin de 3 años que no es la que calcula el repo", () => {
    // 3 años y 40 días: sigue siendo «3 años» para el paquete, pero no es la fecha del repo.
    const p = plan([registro({ fecha_fin: "2029-08-24" })], [], { tipoSolicitud3Anios: "RENOVACION" });
    expect(motivos(p)).toEqual(["fecha_fin_distinta"]);
    expect(p.omitidos[0]?.detalle).toContain("2029-07-15");
  });
});

describe("planProdep · traslapes y existentes (RF-011)", () => {
  const opciones = { tipoSolicitud3Anios: "RENOVACION" as const };

  it("omite un Perfil que se traslapa con uno ya existente en la base", () => {
    const p = plan([registro()], [previo({ inicio: "2025-01-01", fin: "2027-12-31", tipoSolicitud: "PRIMER_RECONOCIMIENTO" })], opciones);
    expect(p.crear).toEqual([]);
    expect(motivos(p)).toEqual(["traslape"]);
  });

  it("el día límite compartido también es traslape", () => {
    const p = plan([registro()], [previo({ inicio: "2023-07-16", fin: "2026-07-16" })], opciones);
    expect(motivos(p)).toEqual(["traslape"]);
  });

  it("un periodo contiguo sin días compartidos no es traslape", () => {
    const p = plan([registro()], [previo({ inicio: "2023-07-16", fin: "2026-07-15" })], opciones);
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toHaveLength(1);
  });

  it("un dictamen no aprobado en la base no cuenta para el traslape (D-104)", () => {
    const p = plan([registro()], [previo({ inicio: "2026-01-01", fin: "2028-12-31", resultado: "NO_APROBADO" })], opciones);
    expect(p.omitidos).toEqual([]);
    expect(p.crear).toHaveLength(1);
  });

  it("el Perfil de otro profesor no cuenta como traslape", () => {
    const p = plan([registro()], [previo({ profesorId: 2, inicio: "2025-01-01", fin: "2027-12-31" })], opciones);
    expect(p.crear).toHaveLength(1);
  });

  it("no vuelve a crear un Perfil que ya existe con las mismas fechas (idempotencia)", () => {
    const existente = previo({ inicio: "2026-07-16", fin: "2029-07-15" });
    const p = plan([registro()], [existente], opciones);
    expect(p.crear).toEqual([]);
    expect(p.existentes).toBe(1);
    expect(p.omitidos).toEqual([]);
  });

  it("un Perfil de 6 años ya cargado cuenta como existente aunque no tenga historial", () => {
    const p = plan([seisAnios], [previo({ inicio: "2026-07-16", fin: "2032-07-15" })]);
    expect(p.existentes).toBe(1);
    expect(p.omitidos).toEqual([]);
  });

  it("dos Perfiles del mismo profesor que se traslapan: solo entra el primero", () => {
    const p = plan([registro(), registro({ fecha_inicio: "2027-07-16", fecha_fin: "2030-07-15" })], [], opciones);
    expect(p.crear).toHaveLength(1);
    expect(motivos(p)).toEqual(["traslape"]);
  });
});

describe("estado y conteos", () => {
  it("cuenta lo que se crea por tipo y estado", () => {
    const p = plan(
      [
        registro(),
        registro({ profesor_id: "p2", fecha_inicio: "2027-02-01", fecha_fin: "2030-01-31" }),
        registro({ profesor_id: "p2", fecha_inicio: "2020-01-01", fecha_fin: "2022-12-31" }),
      ],
      [],
      { tipoSolicitud3Anios: "RENOVACION" },
    );
    expect(contarPorTipoYEstado(p)).toEqual(
      new Map([
        ["RENOVACION (3 años) · POR_INICIAR", 1],
        ["RENOVACION (3 años) · VENCIDO", 1],
        ["RENOVACION (3 años) · VIGENTE", 1],
      ]),
    );
  });
});

describe("informes", () => {
  const completo = plan([registro({ profesor_id: "p3" }), registro({ profesor_id: "p2" }), registro({ fecha_inicio: null })], [], {
    tipoSolicitud3Anios: "RENOVACION",
  });

  it("el resumen impreso no lleva nombres, solo conteos", () => {
    const texto = resumenAnonimo(completo);
    expect(texto).toContain("Perfiles en el paquete:      3");
    expect(texto).toContain("A crear:                     1");
    expect(texto).not.toMatch(/ZULEMA|ALDO|BEATRIZ|9000/);
  });

  it("el informe con nombres es el único que los trae", () => {
    const texto = informePlanProdep(completo);
    expect(texto).toContain("CONTIENE DATOS PERSONALES");
    expect(texto).toContain("BEATRIZ OCHOA");
    expect(texto).toContain("ZULEMA QUINTANAR");
  });
});

describe("bitácora y reversión", () => {
  const creados = [
    { id: 10, profesorId: 1, tipoSolicitud: "RENOVACION", inicio: "2026-07-16", fin: "2029-07-15" },
    { id: 11, profesorId: 2, tipoSolicitud: "RENOVACION", inicio: "2026-07-16", fin: "2029-07-15" },
    { id: 12, profesorId: 3, tipoSolicitud: "RENOVACION", inicio: "2026-07-16", fin: "2029-07-15" },
    { id: 13, profesorId: 4, tipoSolicitud: "RENOVACION", inicio: "2026-07-16", fin: "2029-07-15" },
    { id: 14, profesorId: 5, tipoSolicitud: "RENOVACION", inicio: "2026-07-16", fin: "2029-07-15" },
  ];
  const intacto = (c: (typeof creados)[number]): ProdepActual => ({
    profesorId: c.profesorId,
    tipoSolicitud: c.tipoSolicitud,
    resultado: "APROBADO",
    inicio: c.inicio,
    fin: c.fin,
    convocatoriaId: null,
  });

  it("registra cada Perfil creado", () => {
    const b = crearBitacoraProdep(creados, new Date("2026-12-02T10:00:00Z"), "127.0.0.1:54322/postgres");
    expect(b).toMatchObject({ fase: "prodep", host: "127.0.0.1:54322/postgres" });
    expect(b.creados).toHaveLength(5);
  });

  it("borra lo intacto y reporta lo editado, lo que ya tiene convocatoria, lo no aprobado y lo que no existe", () => {
    const b = crearBitacoraProdep(creados, new Date(), "x");
    const actuales = new Map<number, ProdepActual>([
      [10, intacto(creados[0]!)],
      [11, { ...intacto(creados[1]!), fin: "2030-01-01" }], // alguien lo editó
      [12, { ...intacto(creados[2]!), convocatoriaId: 7 }], // resultado oficial (D-107)
      [13, { ...intacto(creados[3]!), resultado: "NO_APROBADO" }], // cambió de resultado
      // 14 ya no existe
    ]);
    const { borrar, conflictos } = prepararReversionProdep(b, actuales);
    expect(borrar.map((c) => c.id)).toEqual([10]);
    expect(conflictos.map((c) => c.id)).toEqual([11, 12, 13, 14]);
    expect(conflictos[1]?.motivo).toContain("D-107");
  });
});
