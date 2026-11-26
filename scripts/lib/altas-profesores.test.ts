import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  crearBitacoraAltas,
  informePlanAltas,
  planAltas,
  prepararReversionAltas,
  resumenAnonimo,
  type PlanAltas,
  type ProfesorEnBase,
} from "./altas-profesores";
import { SIN_USO_PROFESOR } from "./cargar-profesores";
import type { Catalogos, RegistroPaquete } from "./completar-profesores";
import { generarNombreNormalizado } from "../../src/modules/profesores/profesores";

// Todo es ficticio: nombres, códigos, correos y CVU inventados para las pruebas.
const catalogos: Catalogos = {
  grados: [
    { id: 1, nomenclatura: "MTRO" },
    { id: 2, nomenclatura: "DR" },
  ],
  departamentos: [
    { id: 10, nomenclatura: "DCCI" },
    { id: 11, nomenclatura: "DCNE" },
  ],
};

function enBase(nombres: string, apellidos: string, parcial: Partial<ProfesorEnBase> = {}): ProfesorEnBase {
  return {
    codigo: "1111111",
    correo: "existente@ejemplo.invalid",
    nombreNormalizado: generarNombreNormalizado(nombres, apellidos),
    cvu: null,
    ...parcial,
  };
}

function registro(nombres: string, apellidos: string, parcial: Partial<RegistroPaquete> = {}): RegistroPaquete {
  return {
    nombres,
    apellidos,
    codigo_udg: "9000001",
    correo_institucional: "nueva.persona@ejemplo.invalid",
    cvu: "100001",
    sexo: "M",
    nombramiento_tipo: "PROFESOR_INVESTIGADOR",
    grado: "DRA.",
    departamento: "CNE",
    ...parcial,
  };
}

const motivos = (plan: PlanAltas) => plan.omitidos.map((o) => o.motivo);

describe("planAltas · alta válida", () => {
  it("da de alta a quien tiene código y correo y no existe, con todos sus campos", () => {
    const plan = planAltas([], [registro("ZULEMA", "QUINTANAR OVALLE")], catalogos);

    expect(plan.omitidos).toEqual([]);
    expect(plan.crear).toEqual([
      {
        codigo: "9000001",
        correo: "nueva.persona@ejemplo.invalid",
        nombres: "Zulema",
        apellidos: "Quintanar Ovalle",
        nombreNormalizado: generarNombreNormalizado("Zulema", "Quintanar Ovalle"),
        genero: "F", // el Excel dice M (mujer) → en el repo es F
        tipoContratacion: "TIEMPO_COMPLETO",
        gradoId: 2,
        departamentoId: 11,
        cvu: "100001",
      },
    ]);
  });

  it("convierte el género: H→M y M→F", () => {
    const plan = planAltas(
      [],
      [
        registro("Aldo", "Prieto Lima", { sexo: "H", codigo_udg: "9000010", correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
        registro("Beatriz", "Ochoa Ruiz", { sexo: "M", codigo_udg: "9000011", correo_institucional: "bea@ejemplo.invalid", cvu: "11" }),
      ],
      catalogos,
    );
    expect(plan.crear.find((p) => p.nombres === "Aldo")?.genero).toBe("M");
    expect(plan.crear.find((p) => p.nombres === "Beatriz")?.genero).toBe("F");
  });

  it("deja PENDIENTE el género y la contratación cuando no son claros (como la primera carga)", () => {
    const plan = planAltas(
      [],
      [registro("Zulema", "Quintanar Ovalle", { sexo: null, nombramiento_tipo: "TECNICO_ACADEMICO" })],
      catalogos,
    );
    expect(plan.crear[0]).toMatchObject({ genero: "PENDIENTE", tipoContratacion: "PENDIENTE" });
  });

  it("escribe nombres y apellidos en nombre propio", () => {
    const plan = planAltas([], [registro("MARÍA DEL ROSARIO", "DE LA TORRE GÓMORA")], catalogos);
    expect(plan.crear[0]).toMatchObject({ nombres: "María del Rosario", apellidos: "De la Torre Gómora" });
  });

  it("no escribe ORCID, Scopus ni Scholar (el repo los excluyó a propósito)", () => {
    const plan = planAltas([], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(Object.keys(plan.crear[0])).not.toEqual(expect.arrayContaining(["orcid"]));
    expect(Object.keys(plan.crear[0])).not.toEqual(expect.arrayContaining(["scopusId"]));
    expect(Object.keys(plan.crear[0])).not.toEqual(expect.arrayContaining(["scholarId"]));
  });
});

describe("planAltas · quién no se crea", () => {
  it("omite a quien no trae código UdeG (P6) y a quien trae un código PEND", () => {
    const plan = planAltas(
      [],
      [
        registro("Aldo", "Prieto Lima", { codigo_udg: null }),
        registro("Beatriz", "Ochoa Ruiz", { codigo_udg: "PEND0007", correo_institucional: "bea@ejemplo.invalid" }),
      ],
      catalogos,
    );
    expect(plan.crear).toEqual([]);
    expect(motivos(plan)).toEqual(["sin_codigo", "sin_codigo"]);
  });

  it("omite a quien no trae correo institucional", () => {
    const plan = planAltas([], [registro("Zulema", "Quintanar Ovalle", { correo_institucional: null })], catalogos);
    expect(plan.crear).toEqual([]);
    expect(motivos(plan)).toEqual(["sin_correo"]);
  });

  it("no vuelve a crear a quien ya existe por nombre (exacto, sin acentos ni mayúsculas)", () => {
    const plan = planAltas(
      [enBase("Íñigo", "Ñandú Rojas")],
      [registro("INIGO", "NANDU ROJAS")],
      catalogos,
    );
    expect(plan.crear).toEqual([]);
    expect(plan.existentes).toBe(1);
    expect(plan.omitidos).toEqual([]);
  });

  it("no vuelve a crear a quien ya existe con las mismas palabras en otro orden", () => {
    const plan = planAltas([enBase("Ariel Tomás", "Bustos")], [registro("Ariel", "Tomás Bustos")], catalogos);
    expect(plan.crear).toEqual([]);
    expect(plan.existentes).toBe(1);
  });

  it("una persona sin código que ya existe por nombre cuenta como existente, no como omitida", () => {
    const plan = planAltas([enBase("Zulema", "Quintanar Ovalle")], [registro("Zulema", "Quintanar Ovalle", { codigo_udg: null })], catalogos);
    expect(plan.existentes).toBe(1);
    expect(plan.omitidos).toEqual([]);
  });

  it("omite a las personas cuyo nombre viene repetido en el paquete", () => {
    const plan = planAltas(
      [],
      [
        registro("Zulema", "Quintanar Ovalle"),
        registro("ZULEMA", "QUINTANAR OVALLE", { codigo_udg: "9000002", correo_institucional: "otra@ejemplo.invalid" }),
      ],
      catalogos,
    );
    expect(plan.crear).toEqual([]);
    expect(motivos(plan)).toEqual(["nombre_repetido_en_paquete", "nombre_repetido_en_paquete"]);
  });

  it("omite si el código ya lo tiene otra persona de la base con otro nombre", () => {
    const plan = planAltas([enBase("Otra", "Persona Real", { codigo: "9000001" })], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(plan.crear).toEqual([]);
    expect(motivos(plan)).toEqual(["codigo_en_uso"]);
  });

  it("omite si el correo ya lo tiene otra persona (sin importar mayúsculas)", () => {
    const plan = planAltas(
      [enBase("Otra", "Persona Real", { correo: "NUEVA.PERSONA@ejemplo.invalid" })],
      [registro("Zulema", "Quintanar Ovalle")],
      catalogos,
    );
    expect(plan.crear).toEqual([]);
    expect(motivos(plan)).toEqual(["correo_en_uso"]);
  });

  it("omite si el código o el correo vienen repetidos para varias personas del paquete", () => {
    const plan = planAltas(
      [],
      [
        registro("Aldo", "Prieto Lima", { correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
        registro("Beatriz", "Ochoa Ruiz", { correo_institucional: "aldo@ejemplo.invalid", codigo_udg: "9000002", cvu: "11" }),
        registro("Carla", "Mena Salas", { correo_institucional: "carla@ejemplo.invalid", codigo_udg: "9000002", cvu: "12" }),
      ],
      catalogos,
    );
    expect(plan.crear).toEqual([]);
    // Cada persona se omite por el primer motivo que le toca: Aldo por el correo; Beatriz y Carla por el código.
    expect(plan.omitidos.map((o) => o.motivo).sort()).toEqual(
      ["codigo_repetido_en_paquete", "codigo_repetido_en_paquete", "correo_repetido_en_paquete"],
    );
  });

  it("omite con mensaje en español un dato obligatorio que no pasa las reglas del formulario", () => {
    const plan = planAltas([], [registro("Zulema", "Quintanar Ovalle", { codigo_udg: "12-34" })], catalogos);
    expect(plan.crear).toEqual([]);
    expect(plan.omitidos[0]).toMatchObject({
      motivo: "dato_invalido",
      detalle: "El código solo debe contener letras y números, sin espacios.",
    });

    const mal = planAltas([], [registro("Zulema", "Quintanar Ovalle", { correo_institucional: "sin-arroba" })], catalogos);
    expect(mal.omitidos[0].detalle).toBe("El correo no tiene un formato válido.");
  });
});

describe("planAltas · campos opcionales", () => {
  it("si solo choca el CVU, crea a la persona sin CVU y lo anota", () => {
    const plan = planAltas([enBase("Otra", "Persona Real", { cvu: "100001" })], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(plan.crear).toHaveLength(1);
    expect(plan.crear[0].cvu).toBeNull();
    expect(plan.ajustes).toEqual([expect.objectContaining({ campo: "cvu" })]);
  });

  it("un CVU con letras no se escribe, con mensaje en español", () => {
    const plan = planAltas([], [registro("Zulema", "Quintanar Ovalle", { cvu: "12A4" })], catalogos);
    expect(plan.crear[0].cvu).toBeNull();
    expect(plan.ajustes[0].detalle).toBe("El CVU del paquete debe tener solo dígitos; se deja vacío.");
  });

  it("un grado o un departamento sin equivalente se anotan y la persona se crea igual", () => {
    const plan = planAltas([], [registro("Zulema", "Quintanar Ovalle", { grado: "LIC.", departamento: "ZZ" })], catalogos);
    expect(plan.crear).toHaveLength(1);
    expect(plan.crear[0]).toMatchObject({ gradoId: null, departamentoId: null });
    expect(plan.ajustes.map((a) => a.campo).sort()).toEqual(["departamentoId", "gradoId"]);
  });
});

describe("planAltas · idempotencia y avisos", () => {
  it("después de crear a la persona, calcular el plan otra vez da 0 a crear", () => {
    const paquete = [registro("Zulema", "Quintanar Ovalle")];
    const primero = planAltas([], paquete, catalogos);
    expect(primero.crear).toHaveLength(1);

    const despues: ProfesorEnBase[] = primero.crear.map((p) => ({
      codigo: p.codigo,
      correo: p.correo,
      nombreNormalizado: p.nombreNormalizado,
      cvu: p.cvu,
    }));
    const segundo = planAltas(despues, paquete, catalogos);
    expect(segundo.crear).toEqual([]);
    expect(segundo.existentes).toBe(1);
  });

  it("avisa cuántos profesores PEND siguen en la base", () => {
    const plan = planAltas([enBase("Aldo", "Prieto Lima", { codigo: "PEND0001" }), enBase("Beatriz", "Ochoa Ruiz")], [], catalogos);
    expect(plan.pendientesEnBase).toBe(1);
    expect(resumenAnonimo(plan)).toContain("PEND que siguen en la base: 1");
  });
});

describe("informes", () => {
  it("el resumen impreso no lleva nombres, solo conteos", () => {
    const plan = planAltas(
      [],
      [
        registro("Zulema", "Quintanar Ovalle"),
        registro("Aldo", "Prieto Lima", { codigo_udg: null, correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
      ],
      catalogos,
    );
    const resumen = resumenAnonimo(plan);
    expect(resumen).toContain("A dar de alta:                 1");
    expect(resumen).toContain("Sin código UdeG real");
    expect(resumen).not.toMatch(/Zulema|Quintanar|Aldo|Prieto/);
    // El informe sí lleva nombres: se escribe solo en datos-reales/, que git ignora.
    expect(informePlanAltas(plan)).toContain("Quintanar Ovalle, Zulema");
  });
});

describe("bitácora y reversión", () => {
  const bitacora = crearBitacoraAltas(
    [
      { id: 101, codigo: "9000001", correo: "uno@ejemplo.invalid" },
      { id: 102, codigo: "9000002", correo: "dos@ejemplo.invalid" },
      { id: 103, codigo: "9000003", correo: "tres@ejemplo.invalid" },
    ],
    new Date("2026-12-01T00:00:00Z"),
    "127.0.0.1:54322/postgres",
  );

  it("registra cada persona creada", () => {
    expect(bitacora.fase).toBe("altas");
    expect(bitacora.host).toBe("127.0.0.1:54322/postgres");
    expect(bitacora.creados).toHaveLength(3);
  });

  it("solo borra a quien conserva el código y el correo, y reporta el resto", () => {
    const actuales = new Map([
      [101, { codigo: "9000001", correo: "uno@ejemplo.invalid" }], // intacta
      [102, { codigo: "9000002", correo: "editado@ejemplo.invalid" }], // alguien cambió el correo
      // 103 ya no existe
    ]);
    const { borrar, conflictos } = prepararReversionAltas(bitacora, actuales);
    expect(borrar.map((c) => c.id)).toEqual([101]);
    expect(conflictos).toEqual([
      { id: 102, motivo: "El código o el correo cambió después de la alta; no se toca." },
      { id: 103, motivo: "La persona ya no existe en la base." },
    ]);
  });
});

describe("SIN_USO_PROFESOR", () => {
  it("cubre todas las relaciones que cuelgan de Profesor en el esquema", () => {
    const esquema = readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
    const bloque = /model Profesor \{([\s\S]*?)\n\}/.exec(esquema)?.[1] ?? "";
    const escalares = new Set(["String", "Int", "Boolean", "DateTime", "Float", "Decimal", "Json", "BigInt", "Bytes"]);
    const enums = new Set(["Genero", "TipoContratacion", "EstatusLaboral"]);

    const dependientes = bloque
      .split("\n")
      .filter((linea) => !linea.includes("@relation(fields")) // grado y departamento son del propio profesor
      .map((linea) => /^\s+(\w+)\s+(\w+)(\[\]|\?)/.exec(linea))
      .filter((m): m is RegExpExecArray => m !== null)
      .filter(([, , tipo]) => !escalares.has(tipo) && !enums.has(tipo))
      .map(([, campo]) => campo);

    expect(dependientes.length).toBeGreaterThan(5);
    expect(Object.keys(SIN_USO_PROFESOR).sort()).toEqual([...dependientes].sort());
  });
});
