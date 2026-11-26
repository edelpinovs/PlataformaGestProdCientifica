import { describe, expect, it } from "vitest";
import {
  crearBitacoraCuerpos,
  informePlanCuerpos,
  planCuerpos,
  prepararReversionCuerpos,
  resumenAnonimo,
  type CuerpoActual,
  type DepartamentoBase,
  type PlanCuerpos,
  type ProfesorBaseCa,
  type ProfesorPaqueteCa,
  type RegistroCuerpo,
  type RegistroIntegrante,
  type RegistroLgac,
} from "./importar-cuerpos";

// Todo es ficticio: nombres, códigos y claves inventados para las pruebas.
const departamentos: DepartamentoBase[] = [
  { id: 10, nombre: "Departamento de Ciencias Computacionales", nomenclatura: "DCCI" },
  { id: 11, nombre: "Departamento de Computación", nomenclatura: "DCCOM" },
];

function profesor(id: number, parcial: Partial<ProfesorBaseCa> = {}): ProfesorBaseCa {
  return {
    id,
    codigo: `900000${id}`,
    nombres: `Nombre${id}`,
    apellidos: `Apellido${id}`,
    tipoContratacion: "TIEMPO_COMPLETO",
    estatusLaboral: "ACTIVO",
    prodepActivo: false,
    ...parcial,
  };
}
const base: ProfesorBaseCa[] = [
  profesor(1, { prodepActivo: true }),
  profesor(2),
  profesor(3),
  profesor(4, { tipoContratacion: "ASIGNATURA" }),
  profesor(5, { tipoContratacion: "PENDIENTE" }),
  profesor(6, { estatusLaboral: "BAJA" }),
  profesor(7, { prodepActivo: true }),
];
const paquete: ProfesorPaqueteCa[] = [
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `p${n}`, codigo_udg: `900000${n}`, nombre_completo: `PERSONA FICTICIA ${n}` })),
  { id: "p8", codigo_udg: "9000008", nombre_completo: "PERSONA FUERA DE LA BASE" },
  { id: "p9", codigo_udg: null, nombre_completo: "PERSONA SIN CODIGO" },
];

function cuerpo(parcial: Partial<RegistroCuerpo> = {}): RegistroCuerpo {
  return {
    id: "c1",
    clave: "UDG-CA-9001",
    nombre: "Cuerpo académico de prueba",
    nivel_vigente_2027: "CAEC",
    area_prodep_original: "Ingeniería y Tecnología",
    disciplina: "Computación",
    anio_registro: 2015,
    proxima_evaluacion: 2027,
    lider_profesor_id: "p1",
    departamento: "CCI",
    ...parcial,
  };
}
const integ = (profesor_id: string, orden: number | null, parcial: Partial<RegistroIntegrante> = {}): RegistroIntegrante => ({
  ca_id: "c1",
  profesor_id,
  orden,
  estado: "ACTIVO",
  ...parcial,
});
const lgac = (texto: string | null, orden: number, ca_id = "c1"): RegistroLgac => ({ ca_id, orden, lgac: texto });

const plan = (
  cuerpos: RegistroCuerpo[],
  integrantes: RegistroIntegrante[] = [integ("p1", 1)],
  lgacs: RegistroLgac[] = [lgac("Inteligencia artificial", 1)],
  existentes: string[] = [],
  opciones = {},
) => planCuerpos(base, departamentos, existentes, cuerpos, integrantes, lgacs, paquete, opciones);
const motivosCuerpo = (p: PlanCuerpos) => p.cuerposOmitidos.map((o) => o.motivo);
const motivosIntegrante = (p: PlanCuerpos) => p.integrantesOmitidos.map((o) => o.motivo);

describe("planCuerpos · el CA", () => {
  it("convierte los tres niveles de consolidación", () => {
    for (const [codigo, esperado] of [
      ["CAEF", "EN_FORMACION"],
      ["CAEC", "EN_CONSOLIDACION"],
      ["CAC", "CONSOLIDADO"],
    ] as const) {
      expect(plan([cuerpo({ nivel_vigente_2027: codigo })]).crear[0]?.nivel).toBe(esperado);
    }
  });

  it("crea un CA válido con departamento por nomenclatura y año de vencimiento = próxima evaluación (D-287)", () => {
    const p = plan([cuerpo({ proxima_evaluacion: 2028, departamento: "CC" })]);
    expect(p.cuerposOmitidos).toEqual([]);
    expect(p.crear[0]).toMatchObject({
      clave: "UDG-CA-9001",
      nivel: "EN_CONSOLIDACION",
      departamentoId: 11,
      anioRegistro: 2015,
      anioVencimiento: 2028,
      areaProdep: "Ingeniería y Tecnología",
    });
  });

  it("omite un nivel que no se reconoce y un departamento que no existe", () => {
    const p = plan([cuerpo({ nivel_vigente_2027: "XX" }), cuerpo({ id: "c2", clave: "UDG-CA-9002", departamento: "ZZ" })]);
    expect(p.crear).toEqual([]);
    expect(motivosCuerpo(p).sort()).toEqual(["nivel_desconocido", "sin_departamento"]);
  });

  it("rechaza un vencimiento anterior al registro con el mensaje en español", () => {
    const p = plan([cuerpo({ anio_registro: 2030, proxima_evaluacion: 2027 })]);
    expect(motivosCuerpo(p)).toEqual(["dato_invalido"]);
    expect(p.cuerposOmitidos[0]?.detalle).toBe("El año de vencimiento no puede ser anterior al de registro.");
  });

  it("rechaza un año ausente sin mensajes en inglés", () => {
    const p = plan([cuerpo({ proxima_evaluacion: null })]);
    expect(motivosCuerpo(p)).toEqual(["dato_invalido"]);
    expect(p.cuerposOmitidos[0]?.detalle).toBe("Indica un año entre 1990 y 2100.");
  });

  it("no modifica un CA cuya clave ya existe en la base, sin importar mayúsculas", () => {
    const p = plan([cuerpo()], [integ("p1", 1)], [], ["udg-ca-9001"]);
    expect(p.crear).toEqual([]);
    expect(p.existentes).toBe(1);
    expect(p.cuerposOmitidos).toEqual([]);
  });

  it("de dos CA con la misma clave en el paquete solo entra el primero", () => {
    const p = plan([cuerpo(), cuerpo({ id: "c2" })], [integ("p1", 1), integ("p1", 1, { ca_id: "c2" })]);
    expect(p.crear).toHaveLength(1);
    expect(motivosCuerpo(p)).toEqual(["clave_repetida"]);
  });
});

describe("planCuerpos · integrantes (D-108, D-109)", () => {
  it("carga a los integrantes en el orden del Excel", () => {
    const p = plan([cuerpo()], [integ("p3", 3), integ("p1", 1), integ("p2", 2)]);
    expect(p.crear[0]?.integrantes.map((i) => i.profesorId)).toEqual([1, 2, 3]);
  });

  it("omite a quien no es de tiempo completo, tiene la contratación pendiente o no está activo (D-108)", () => {
    const p = plan([cuerpo()], [integ("p1", 1), integ("p4", 2), integ("p5", 3), integ("p6", 4)]);
    expect(p.crear[0]?.integrantes.map((i) => i.profesorId)).toEqual([1]);
    expect(motivosIntegrante(p)).toEqual(["sin_tiempo_completo", "contratacion_pendiente", "no_activo"]);
    expect(p.integrantesOmitidos[0]?.detalle).toBe("Apellido4 Nombre4 (9000004) no es de tiempo completo. Elige a otra persona.");
    expect(p.integrantesOmitidos[2]?.detalle).toBe("Apellido6 Nombre6 (9000006) no está en estatus laboral activo. Elige a otra persona.");
  });

  it("el primer integrante necesita PRODEP vigente (D-109): quien lo tiene entra primero y luego entran los demás", () => {
    // p2 y p3 no tienen PRODEP; p7 sí y viene después. Con el orden del Excel p2 y p3 esperan y entran tras p7.
    const p = plan([cuerpo({ lider_profesor_id: "p7" })], [integ("p2", 1), integ("p3", 2), integ("p7", 3)]);
    expect(p.integrantesOmitidos).toEqual([]);
    expect(p.crear[0]?.integrantes.map((i) => i.profesorId)).toEqual([7, 2, 3]);
  });

  it("sin nadie con PRODEP el CA no se crea y todos quedan en el informe", () => {
    const p = plan([cuerpo({ lider_profesor_id: "p2" })], [integ("p2", 1), integ("p3", 2)]);
    expect(p.crear).toEqual([]);
    expect(motivosCuerpo(p)).toEqual(["sin_integrantes"]);
    expect(motivosIntegrante(p)).toEqual(["sin_prodep", "sin_prodep"]);
    expect(p.integrantesOmitidos[0]?.detalle).toBe("Al menos un integrante debe tener Perfil Deseable PRODEP activo.");
  });

  it("con crearSinIntegrantes (solo pruebas) el CA se crea vacío y sin líder", () => {
    const p = plan([cuerpo({ lider_profesor_id: "p2" })], [integ("p2", 1)], [], [], { crearSinIntegrantes: true });
    expect(p.crear).toHaveLength(1);
    expect(p.crear[0]).toMatchObject({ integrantes: [], liderId: null });
  });

  it("no carga las altas ni las bajas solicitadas en 2026 (D-252)", () => {
    const p = plan([cuerpo()], [integ("p1", 1), integ("p2", 2, { estado: "ALTA_SOLICITADA_2026" }), integ("p3", 3, { estado: "BAJA_SOLICITADA_2026" })]);
    expect(p.crear[0]?.integrantes.map((i) => i.profesorId)).toEqual([1]);
    expect(motivosIntegrante(p)).toEqual(["estado_no_activo", "estado_no_activo"]);
  });

  it("omite a quien no está en la base, no tiene código o no aparece en el paquete", () => {
    const p = plan([cuerpo()], [integ("p1", 1), integ("p8", 2), integ("p9", 3), integ("p99", 4)]);
    expect(motivosIntegrante(p)).toEqual(["fuera_de_la_base", "sin_codigo", "profesor_sin_registro"]);
  });

  it("no repite a una persona que aparece dos veces en el mismo CA", () => {
    const p = plan([cuerpo()], [integ("p1", 1), integ("p1", 2)]);
    expect(p.crear[0]?.integrantes).toHaveLength(1);
    expect(motivosIntegrante(p)).toEqual(["repetido"]);
  });
});

describe("planCuerpos · líder (D-111)", () => {
  it("asigna al líder cuando quedó como integrante", () => {
    expect(plan([cuerpo({ lider_profesor_id: "p1" })]).crear[0]?.liderId).toBe(1);
  });

  it("no asigna al líder que no pasó las reglas de integrante y lo informa", () => {
    const p = plan([cuerpo({ lider_profesor_id: "p4" })], [integ("p1", 1), integ("p4", 2)]);
    expect(p.crear[0]?.liderId).toBeNull();
    expect(motivosIntegrante(p)).toEqual(["sin_tiempo_completo", "lider_no_integrante"]);
  });

  it("no asigna a un líder que no está en la base", () => {
    const p = plan([cuerpo({ lider_profesor_id: "p8" })]);
    expect(p.crear[0]?.liderId).toBeNull();
    expect(motivosIntegrante(p)).toEqual(["lider_no_integrante"]);
  });

  it("un CA sin líder en el Excel se crea sin líder y sin aviso", () => {
    const p = plan([cuerpo({ lider_profesor_id: null })]);
    expect(p.crear[0]?.liderId).toBeNull();
    expect(p.integrantesOmitidos).toEqual([]);
  });
});

describe("planCuerpos · LGAC", () => {
  it("crea una LGAC por renglón, en orden y sin profesores", () => {
    const p = plan([cuerpo()], [integ("p1", 1)], [lgac("Segunda línea", 2), lgac("Primera línea", 1)]);
    expect(p.crear[0]?.lgacs).toEqual(["Primera línea", "Segunda línea"]);
  });

  it("omite la LGAC vacía, demasiado larga o repetida en el mismo CA", () => {
    const p = plan([cuerpo()], [integ("p1", 1)], [lgac("Línea uno", 1), lgac("  línea UNO ", 2), lgac("", 3), lgac("x".repeat(201), 4)]);
    expect(p.crear[0]?.lgacs).toEqual(["Línea uno"]);
    expect(p.lgacOmitidas.map((l) => l.motivo)).toEqual(["lgac_repetida", "lgac_invalida", "lgac_invalida"]);
    expect(p.lgacOmitidas[1]?.detalle).toBe("El nombre es obligatorio.");
  });

  it("la LGAC de otro CA no se mezcla", () => {
    const p = plan([cuerpo()], [integ("p1", 1)], [lgac("Línea del otro", 1, "c2")]);
    expect(p.crear[0]?.lgacs).toEqual([]);
  });
});

describe("informes", () => {
  const completo = plan(
    [cuerpo(), cuerpo({ id: "c2", clave: "UDG-CA-9002", lider_profesor_id: "p2" })],
    [integ("p1", 1), integ("p4", 2), integ("p2", 1, { ca_id: "c2" })],
    [lgac("Línea uno", 1), lgac("Línea dos", 2)],
  );

  it("el resumen impreso no lleva nombres ni claves, solo conteos", () => {
    const texto = resumenAnonimo(completo);
    expect(texto).toContain("Cuerpos académicos en el paquete:  2");
    expect(texto).toContain("A crear:                           1");
    expect(texto).not.toMatch(/PERSONA|UDG-CA|Línea|900000/);
  });

  it("el informe con nombres es el único que los trae", () => {
    const texto = informePlanCuerpos(completo);
    expect(texto).toContain("CONTIENE DATOS PERSONALES");
    expect(texto).toContain("UDG-CA-9002");
    expect(texto).toContain("PERSONA FICTICIA 4");
  });

  it("la idempotencia: con la clave ya en la base no hay nada que crear", () => {
    const p = plan([cuerpo()], [integ("p1", 1)], [lgac("Línea uno", 1)], ["UDG-CA-9001"]);
    expect(p.crear).toEqual([]);
    expect(p.existentes).toBe(1);
  });
});

describe("bitácora y reversión", () => {
  const creados = [
    { id: 20, clave: "A", profesorIds: [1, 2], lgacIds: [100, 101], liderId: 1 },
    { id: 21, clave: "B", profesorIds: [3], lgacIds: [102], liderId: null },
    { id: 22, clave: "C", profesorIds: [4], lgacIds: [], liderId: 4 },
    { id: 23, clave: "D", profesorIds: [5], lgacIds: [], liderId: 5 },
    { id: 24, clave: "E", profesorIds: [6], lgacIds: [103], liderId: null },
    { id: 25, clave: "F", profesorIds: [7], lgacIds: [], liderId: null },
  ];
  const intacto = (c: (typeof creados)[number]): CuerpoActual => ({
    clave: c.clave,
    profesorIds: c.profesorIds,
    lgacs: c.lgacIds.map((id) => ({ id, profesores: 0 })),
    liderId: c.liderId,
  });

  it("registra cada CA creado", () => {
    const b = crearBitacoraCuerpos(creados, new Date("2026-12-02T10:00:00Z"), "127.0.0.1:54322/postgres");
    expect(b).toMatchObject({ fase: "cuerpos", host: "127.0.0.1:54322/postgres" });
    expect(b.creados).toHaveLength(6);
  });

  it("borra lo intacto y reporta lo que cambió o ya no existe", () => {
    const b = crearBitacoraCuerpos(creados, new Date(), "x");
    const actuales = new Map<number, CuerpoActual>([
      [20, intacto(creados[0]!)],
      [21, { ...intacto(creados[1]!), profesorIds: [3, 9] }], // alguien agregó un integrante
      [22, { ...intacto(creados[2]!), liderId: null }], // cambió el líder
      [23, { ...intacto(creados[3]!), clave: "OTRA" }],
      [24, { ...intacto(creados[4]!), lgacs: [{ id: 103, profesores: 2 }] }], // una LGAC ya tiene profesores
      // 25 ya no existe
    ]);
    const { borrar, conflictos } = prepararReversionCuerpos(b, actuales);
    expect(borrar.map((c) => c.id)).toEqual([20]);
    expect(conflictos.map((c) => c.id)).toEqual([21, 22, 23, 24, 25]);
  });

  it("una LGAC agregada después de la carga también impide borrar el CA", () => {
    const b = crearBitacoraCuerpos([creados[0]!], new Date(), "x");
    const actual = { ...intacto(creados[0]!), lgacs: [...intacto(creados[0]!).lgacs, { id: 999, profesores: 0 }] };
    expect(prepararReversionCuerpos(b, new Map([[20, actual]])).borrar).toEqual([]);
  });
});
