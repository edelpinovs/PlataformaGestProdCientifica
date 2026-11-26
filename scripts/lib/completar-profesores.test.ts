import { describe, expect, it } from "vitest";
import {
  convertirContratacion,
  convertirGenero,
  crearBitacora,
  informePlanCompletar,
  nomenclaturaDepartamento,
  nomenclaturaGrado,
  planCompletar,
  prepararReversion,
  resumenAnonimo,
  type Catalogos,
  type EstadoActual,
  type PlanCompletar,
  type ProfesorBase,
  type RegistroPaquete,
} from "./completar-profesores";
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
    { id: 12, nomenclatura: "DCCOM" },
  ],
};

let siguienteId = 1;
function pendiente(nombres: string, apellidos: string, parcial: Partial<ProfesorBase> = {}): ProfesorBase {
  const id = siguienteId++;
  return {
    id,
    codigo: `PEND${String(id).padStart(4, "0")}`,
    correo: `pend-${String(id).padStart(4, "0")}@pendiente.invalid`,
    nombres,
    apellidos,
    nombreNormalizado: generarNombreNormalizado(nombres, apellidos),
    genero: "PENDIENTE",
    tipoContratacion: "PENDIENTE",
    gradoId: null,
    departamentoId: null,
    cvu: null,
    ...parcial,
  };
}

function registro(nombres: string, apellidos: string, parcial: Partial<RegistroPaquete> = {}): RegistroPaquete {
  return {
    nombres,
    apellidos,
    codigo_udg: "9000001",
    correo_institucional: "persona.uno@ejemplo.invalid",
    cvu: "100001",
    sexo: "H",
    nombramiento_tipo: "PROFESOR_INVESTIGADOR",
    grado: "DR.",
    departamento: "CCI",
    ...parcial,
  };
}

const valor = (plan: PlanCompletar, id: number, campo: string) =>
  plan.actualizar.find((p) => p.id === id)?.cambios.find((c) => c.campo === campo)?.despues;

describe("conversiones del formato del Excel", () => {
  it("convierte el género: H→M y M→F (en el Excel M es mujer; en el repo M es Masculino)", () => {
    expect(convertirGenero("H")).toBe("M");
    expect(convertirGenero("M")).toBe("F");
    expect(convertirGenero(" h ")).toBe("M");
    expect(convertirGenero("")).toBeNull();
    expect(convertirGenero(null)).toBeNull();
    expect(convertirGenero("X")).toBeNull();
  });

  it("convierte la contratación y deja en PENDIENTE (null) lo demás", () => {
    expect(convertirContratacion("PROFESOR_INVESTIGADOR")).toBe("TIEMPO_COMPLETO");
    expect(convertirContratacion("PROFESOR_DOCENTE")).toBe("TIEMPO_COMPLETO");
    expect(convertirContratacion("PROFESOR_ASIGNATURA")).toBe("ASIGNATURA");
    expect(convertirContratacion("TECNICO_ACADEMICO")).toBeNull();
    expect(convertirContratacion("CONVENIO_SECIHTI")).toBeNull();
    expect(convertirContratacion("OTRO")).toBeNull();
    expect(convertirContratacion(undefined)).toBeNull();
  });

  it("convierte grado y departamento a su nomenclatura", () => {
    expect(nomenclaturaGrado("DR.")).toBe("DR");
    expect(nomenclaturaGrado("DRA.")).toBe("DR");
    expect(nomenclaturaGrado("MTRO.")).toBe("MTRO");
    expect(nomenclaturaGrado("MTRA.")).toBe("MTRO");
    expect(nomenclaturaGrado("M.C.")).toBe("MTRO");
    expect(nomenclaturaGrado("LIC.")).toBeNull();
    expect(nomenclaturaDepartamento("CCI")).toBe("DCCI");
    expect(nomenclaturaDepartamento("CNE")).toBe("DCNE");
    expect(nomenclaturaDepartamento("CSH")).toBe("DCSH");
    expect(nomenclaturaDepartamento("CEA")).toBe("DCEA");
    expect(nomenclaturaDepartamento("CS")).toBe("DCS");
    expect(nomenclaturaDepartamento("CC")).toBe("DCCOM");
    expect(nomenclaturaDepartamento("ZZ")).toBeNull();
  });
});

describe("planCompletar · cruce por nombre", () => {
  it("cruza una persona con un solo candidato y completa todos sus campos", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("ZULEMA", "QUINTANAR OVALLE", { sexo: "M", departamento: "CNE" })], catalogos);

    expect(plan.conflictos).toEqual([]);
    expect(plan.actualizar).toHaveLength(1);
    expect(valor(plan, p.id, "codigo")).toBe("9000001");
    expect(valor(plan, p.id, "correo")).toBe("persona.uno@ejemplo.invalid");
    expect(valor(plan, p.id, "genero")).toBe("F");
    expect(valor(plan, p.id, "tipoContratacion")).toBe("TIEMPO_COMPLETO");
    expect(valor(plan, p.id, "gradoId")).toBe(2);
    expect(valor(plan, p.id, "departamentoId")).toBe(11);
    expect(valor(plan, p.id, "cvu")).toBe("100001");
  });

  it("cruza aunque el paquete separe distinto nombres y apellidos (mismas palabras)", () => {
    const p = pendiente("Ariel Tomás", "Bustos");
    const plan = planCompletar([p], [registro("Ariel", "Tomás Bustos")], catalogos);
    expect(plan.conflictos).toEqual([]);
    expect(plan.actualizar).toHaveLength(1);
  });

  it("ignora acentos y mayúsculas al cruzar", () => {
    const p = pendiente("Íñigo", "Ñandú Rojas");
    const plan = planCompletar([p], [registro("INIGO", "NANDU ROJAS")], catalogos);
    expect(plan.actualizar).toHaveLength(1);
  });

  it("con 0 candidatos en el paquete es conflicto y no se toca", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Otra", "Persona Distinta")], catalogos);
    expect(plan.actualizar).toEqual([]);
    expect(plan.conflictos).toEqual([expect.objectContaining({ id: p.id, campo: "cruce" })]);
  });

  it("con más de 1 candidato en el paquete es conflicto y no se toca", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar(
      [p],
      [registro("Zulema", "Quintanar Ovalle"), registro("ZULEMA", "QUINTANAR OVALLE", { codigo_udg: "9000002" })],
      catalogos,
    );
    expect(plan.actualizar).toEqual([]);
    expect(plan.conflictos[0]).toMatchObject({ campo: "cruce" });
    expect(plan.conflictos[0].motivo).toContain("2 registros");
  });

  it("si dos personas de la base cruzan con el mismo registro, ninguna se toca", () => {
    const a = pendiente("Zulema", "Quintanar Ovalle");
    const b = pendiente("Quintanar", "Zulema Ovalle"); // mismas palabras, otro reparto
    const plan = planCompletar([a, b], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(plan.actualizar).toEqual([]);
    expect(plan.conflictos.map((c) => c.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("no toca a quien ya no tiene código PEND", () => {
    const real = pendiente("Zulema", "Quintanar Ovalle", { codigo: "1234567" });
    const plan = planCompletar([real], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(plan.candidatos).toBe(0);
    expect(plan.actualizar).toEqual([]);
  });
});

describe("planCompletar · no sobrescribe lo que alguien ya editó", () => {
  it("deja el correo, el género, la contratación, el grado, el departamento y el CVU ya capturados", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle", {
      correo: "zulema.real@ejemplo.invalid",
      genero: "F",
      tipoContratacion: "ASIGNATURA",
      gradoId: 1,
      departamentoId: 12,
      cvu: "555",
    });
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { sexo: "H", departamento: "CCI" })], catalogos);

    // Solo el código conserva su marcador PEND.
    expect(plan.actualizar).toHaveLength(1);
    expect(plan.actualizar[0].cambios.map((c) => c.campo)).toEqual(["codigo"]);
  });

  it("no cambia el código si ya es el real, aunque el correo siga pendiente", () => {
    // Un código real deja de ser candidato: no se toca nada.
    const p = pendiente("Zulema", "Quintanar Ovalle", { codigo: "2222222" });
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(plan.actualizar).toEqual([]);
  });

  it("deja en PENDIENTE el género y la contratación cuando el paquete no los trae o no son claros", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar(
      [p],
      [registro("Zulema", "Quintanar Ovalle", { sexo: null, nombramiento_tipo: "TECNICO_ACADEMICO" })],
      catalogos,
    );
    expect(valor(plan, p.id, "genero")).toBeUndefined();
    expect(valor(plan, p.id, "tipoContratacion")).toBeUndefined();
    expect(valor(plan, p.id, "codigo")).toBe("9000001");
  });
});

describe("planCompletar · género invertido", () => {
  it("H→M y M→F en el plan", () => {
    const hombre = pendiente("Aldo", "Prieto Lima");
    const mujer = pendiente("Beatriz", "Ochoa Ruiz");
    const plan = planCompletar(
      [hombre, mujer],
      [
        registro("Aldo", "Prieto Lima", { sexo: "H", codigo_udg: "9000010", correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
        registro("Beatriz", "Ochoa Ruiz", { sexo: "M", codigo_udg: "9000011", correo_institucional: "bea@ejemplo.invalid", cvu: "11" }),
      ],
      catalogos,
    );
    expect(valor(plan, hombre.id, "genero")).toBe("M");
    expect(valor(plan, mujer.id, "genero")).toBe("F");
  });
});

describe("planCompletar · choques de campos únicos", () => {
  it("si el código del paquete ya es de otra persona, no lo escribe pero completa el resto", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const otra = pendiente("Otra", "Persona Real", { codigo: "9000001", correo: "otra@ejemplo.invalid" });
    const plan = planCompletar([p, otra], [registro("Zulema", "Quintanar Ovalle")], catalogos);

    expect(valor(plan, p.id, "codigo")).toBeUndefined();
    expect(valor(plan, p.id, "correo")).toBe("persona.uno@ejemplo.invalid");
    expect(plan.conflictos).toEqual([expect.objectContaining({ id: p.id, campo: "codigo" })]);
  });

  it("si el correo del paquete ya es de otra persona (sin importar mayúsculas), no lo escribe", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const otra = pendiente("Otra", "Persona Real", { codigo: "7777777", correo: "PERSONA.UNO@ejemplo.invalid" });
    const plan = planCompletar([p, otra], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(valor(plan, p.id, "correo")).toBeUndefined();
    expect(plan.conflictos).toEqual([expect.objectContaining({ id: p.id, campo: "correo" })]);
  });

  it("si el CVU del paquete ya es de otra persona, no lo escribe", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const otra = pendiente("Otra", "Persona Real", { codigo: "7777777", cvu: "100001" });
    const plan = planCompletar([p, otra], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    expect(valor(plan, p.id, "cvu")).toBeUndefined();
    expect(plan.conflictos).toEqual([expect.objectContaining({ id: p.id, campo: "cvu" })]);
  });

  it("si dos personas del lote reciben el mismo código, ninguna lo recibe", () => {
    const a = pendiente("Aldo", "Prieto Lima");
    const b = pendiente("Beatriz", "Ochoa Ruiz");
    const plan = planCompletar(
      [a, b],
      [
        registro("Aldo", "Prieto Lima", { correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
        registro("Beatriz", "Ochoa Ruiz", { correo_institucional: "bea@ejemplo.invalid", cvu: "11" }),
      ],
      catalogos,
    );
    expect(valor(plan, a.id, "codigo")).toBeUndefined();
    expect(valor(plan, b.id, "codigo")).toBeUndefined();
    expect(plan.conflictos.filter((c) => c.campo === "codigo")).toHaveLength(2);
    expect(valor(plan, a.id, "correo")).toBe("aldo@ejemplo.invalid");
  });

  it("un CVU con letras no se escribe y el mensaje va en español", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { cvu: "12A4" })], catalogos);
    expect(valor(plan, p.id, "cvu")).toBeUndefined();
    const c = plan.conflictos.find((x) => x.campo === "cvu");
    expect(c?.motivo).toBe("El CVU del paquete debe tener solo dígitos; se deja vacío.");
  });

  it("un correo inválido lo rechaza el esquema del formulario, con mensaje en español", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { correo_institucional: "sin-arroba" })], catalogos);
    expect(valor(plan, p.id, "correo")).toBeUndefined();
    expect(plan.conflictos.find((x) => x.campo === "correo")?.motivo).toBe("El correo no tiene un formato válido.");
  });

  it("un código con símbolos lo rechaza el esquema del formulario", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { codigo_udg: "12-34" })], catalogos);
    expect(valor(plan, p.id, "codigo")).toBeUndefined();
    expect(plan.conflictos.find((x) => x.campo === "codigo")?.motivo).toBe(
      "El código solo debe contener letras y números, sin espacios.",
    );
  });
});

describe("planCompletar · catálogos", () => {
  it("un grado sin equivalente o un departamento inexistente se anota y el resto se completa", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { grado: "LIC.", departamento: "ZZ" })], catalogos);
    expect(valor(plan, p.id, "gradoId")).toBeUndefined();
    expect(valor(plan, p.id, "departamentoId")).toBeUndefined();
    expect(plan.conflictos.map((c) => c.campo).sort()).toEqual(["departamentoId", "gradoId"]);
    expect(valor(plan, p.id, "codigo")).toBe("9000001");
  });

  it("si la nomenclatura existe en el mapa pero no en el catálogo, tampoco se asigna", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle", { departamento: "CS" })], catalogos);
    expect(valor(plan, p.id, "departamentoId")).toBeUndefined();
    expect(plan.conflictos[0].campo).toBe("departamentoId");
  });
});

describe("planCompletar · idempotencia", () => {
  it("después de aplicar el plan, calcularlo otra vez da 0 cambios", () => {
    const base = [pendiente("Aldo", "Prieto Lima"), pendiente("Beatriz", "Ochoa Ruiz")];
    const paquete = [
      registro("Aldo", "Prieto Lima", { sexo: "H", codigo_udg: "9000010", correo_institucional: "aldo@ejemplo.invalid", cvu: "10" }),
      registro("Beatriz", "Ochoa Ruiz", { sexo: "M", codigo_udg: "9000011", correo_institucional: "bea@ejemplo.invalid", cvu: "11" }),
    ];
    const primero = planCompletar(base, paquete, catalogos);
    expect(primero.actualizar).toHaveLength(2);

    const despues = base.map((p) => {
      const cambios = primero.actualizar.find((a) => a.id === p.id)?.cambios ?? [];
      return { ...p, ...Object.fromEntries(cambios.map((c) => [c.campo, c.despues])) } as ProfesorBase;
    });
    const segundo = planCompletar(despues, paquete, catalogos);
    expect(segundo.actualizar).toEqual([]);
    expect(segundo.conflictos).toEqual([]);
    expect(segundo.candidatos).toBe(0);
  });
});

describe("informes", () => {
  it("el resumen impreso no lleva nombres, solo conteos", () => {
    const p = pendiente("Zulema", "Quintanar Ovalle");
    const plan = planCompletar([p], [registro("Zulema", "Quintanar Ovalle")], catalogos);
    const resumen = resumenAnonimo(plan);
    expect(resumen).toContain("A actualizar:                1");
    expect(resumen).not.toMatch(/Zulema|Quintanar/);
    // El informe sí lleva nombres: se escribe solo en datos-reales/, que git ignora.
    expect(informePlanCompletar(plan)).toContain("Quintanar Ovalle, Zulema");
  });
});

describe("bitácora y reversión", () => {
  const base = [pendiente("Zulema", "Quintanar Ovalle")];
  const plan = planCompletar(base, [registro("Zulema", "Quintanar Ovalle")], catalogos);
  const bitacora = crearBitacora(plan, new Date("2026-12-01T00:00:00Z"), "127.0.0.1:54322/postgres");

  it("registra cada campo con su valor anterior y el nuevo", () => {
    expect(bitacora.fase).toBe("completar");
    expect(bitacora.host).toBe("127.0.0.1:54322/postgres");
    const codigo = bitacora.cambios.find((c) => c.campo === "codigo");
    expect(codigo).toMatchObject({ id: base[0].id, antes: base[0].codigo, despues: "9000001" });
  });

  it("revierte lo que conserva el valor puesto y reporta lo que cambió después", () => {
    const actual: EstadoActual = new Map([
      [
        base[0].id,
        {
          codigo: "9000001", // intacto
          correo: "editado.despues@ejemplo.invalid", // alguien lo cambió
          genero: "M",
          tipoContratacion: "TIEMPO_COMPLETO",
          gradoId: 2,
          departamentoId: 10,
          cvu: "100001",
        },
      ],
    ]);
    const { revertir, conflictos } = prepararReversion(bitacora, actual);
    expect(revertir.map((c) => c.campo)).not.toContain("correo");
    expect(revertir.map((c) => c.campo)).toContain("codigo");
    expect(conflictos).toEqual([
      expect.objectContaining({ campo: "correo", motivo: "El valor cambió después de la carga; no se toca." }),
    ]);
  });

  it("reporta a quien ya no existe", () => {
    const { revertir, conflictos } = prepararReversion(bitacora, new Map());
    expect(revertir).toEqual([]);
    expect(conflictos.length).toBe(bitacora.cambios.length);
    expect(conflictos[0].motivo).toBe("La persona ya no existe en la base.");
  });
});
