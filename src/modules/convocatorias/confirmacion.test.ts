import { describe, expect, it } from "vitest";
import { MENSAJE_PRODEP_CONTRATACION_PENDIENTE, MENSAJE_PRODEP_REQUIERE_TIEMPO_COMPLETO } from "@/modules/reconocimientos/prodep";
import { planearConfirmacion, VIGENCIA_SNII_CONFIRMADA, vigenciaSnii, type EntradaConfirmacion, type RenglonConfirmacion } from "./confirmacion";

// RF-019: qué crea en M3 la confirmación de una carga. Personas y fechas inventadas.
const renglon = (id: number, datos: Partial<RenglonConfirmacion> = {}): RenglonConfirmacion => ({
  id, numero: id + 1, nombre: `PERSONA ${id}`, profesorId: id * 10, criterio: "CVU", nivel: "NIVEL_1",
  vigenciaInicio: null, vigenciaFin: null, ...datos,
});
const snii = (datos: Partial<EntradaConfirmacion> = {}): EntradaConfirmacion => ({
  programa: "SNII", anio: 2026, renglones: [], contratacion: {}, historialSnii: [], historialProdep: [], ...datos,
});
const prodep = (datos: Partial<EntradaConfirmacion> = {}) => snii({ programa: "PRODEP", ...datos });
const motivos = (plan: ReturnType<typeof planearConfirmacion>) => plan.omitidos.map((o) => o.motivo);
// Las reglas de SNII se prueban como quedarán cuando la Coordinación confirme D-292.
const planearConVigencia = (e: EntradaConfirmacion) => planearConfirmacion(e, { vigenciaSniiConfirmada: true });

describe("vigenciaSnii (D-224, opción a)", () => {
  it("empieza el 1 de enero del año siguiente y termina el 31 de diciembre: 4 años Candidato, 5 los niveles", () => {
    expect(vigenciaSnii("CANDIDATO", 2026)).toEqual({ inicio: "2027-01-01", fin: "2030-12-31" });
    expect(vigenciaSnii("NIVEL_1", 2026)).toEqual({ inicio: "2027-01-01", fin: "2031-12-31" });
    expect(vigenciaSnii("NIVEL_3", 2026)).toEqual({ inicio: "2027-01-01", fin: "2031-12-31" });
  });

  it("no inventa la vigencia de Emérito", () => {
    expect(vigenciaSnii("EMERITO", 2026)).toBeNull();
  });
});

describe("planearConfirmacion: SNII (RF-019)", () => {
  it("mientras D-292 no esté confirmada, no inventa la vigencia: omite el SNII que el listado trae sin ella", () => {
    expect(VIGENCIA_SNII_CONFIRMADA).toBe(false);
    const plan = planearConfirmacion(snii({
      renglones: [renglon(1), renglon(2, { vigenciaInicio: "2027-01-01", vigenciaFin: "2031-12-31" })],
    }));
    expect(plan.snii.map((s) => s.renglonId)).toEqual([2]);
    expect(motivos(plan)).toEqual(["El listado no trae la vigencia y falta confirmar la regla de la Coordinación (D-292)."]);
  });

  it("sin periodo anterior es nuevo ingreso; con uno, renovación", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1, { nivel: "CANDIDATO" }), renglon(2, { nivel: "NIVEL_2" })],
      historialSnii: [{ id: 1, profesorId: 20, resultado: "APROBADO", inicio: "2022-01-01", fin: "2026-12-31" }],
    }));
    expect(plan.bloqueo).toBeNull();
    expect(plan.snii).toEqual([
      { renglonId: 1, numero: 2, profesorId: 10, nivel: "CANDIDATO", tipoParticipacion: "NUEVO_INGRESO", inicio: "2027-01-01", fin: "2030-12-31" },
      { renglonId: 2, numero: 3, profesorId: 20, nivel: "NIVEL_2", tipoParticipacion: "RENOVACION", inicio: "2027-01-01", fin: "2031-12-31" },
    ]);
    expect(plan.omitidos).toEqual([]);
  });

  it("usa la vigencia del archivo cuando la trae", () => {
    const plan = planearConVigencia(snii({ renglones: [renglon(1, { vigenciaInicio: "2027-01-01", vigenciaFin: "2029-12-31" })] }));
    expect(plan.snii[0]).toMatchObject({ inicio: "2027-01-01", fin: "2029-12-31" });
  });

  it("un periodo anterior no aprobado no cuenta para la renovación", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1)],
      historialSnii: [{ id: 1, profesorId: 10, resultado: "NO_APROBADO", inicio: "2022-01-01", fin: "2025-12-31" }],
    }));
    expect(plan.snii[0].tipoParticipacion).toBe("NUEVO_INGRESO");
  });

  it("omite al Candidato que renovaría en el mismo nivel (D-225)", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1, { nivel: "CANDIDATO" })],
      historialSnii: [{ id: 1, profesorId: 10, resultado: "APROBADO", inicio: "2023-01-01", fin: "2026-12-31" }],
    }));
    expect(plan.snii).toEqual([]);
    expect(motivos(plan)).toEqual(["El nivel Candidato no admite renovación (D-225); regístralo a mano en SNII y PRODEP."]);
  });

  it("omite el periodo que se traslapa con uno registrado (D-103)", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1)],
      historialSnii: [{ id: 1, profesorId: 10, resultado: "APROBADO", inicio: "2025-01-01", fin: "2028-12-31" }],
    }));
    expect(plan.snii).toEqual([]);
    expect(motivos(plan)).toEqual(["Se traslapa con el periodo registrado del 2025-01-01 al 2028-12-31."]);
  });

  it("omite el renglón sin nivel, el Emérito y el profesor repetido", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1, { nivel: null }), renglon(2, { nivel: "EMERITO" }), renglon(3), renglon(4, { profesorId: 30 })],
    }));
    expect(plan.snii.map((s) => s.renglonId)).toEqual([3]);
    expect(motivos(plan)).toEqual([
      "El listado no trae un nivel reconocible.",
      "La vigencia de Emérito aún no está definida (D-224).",
      "El profesor ya está en el renglón 4.",
    ]);
  });

  it("no puede confirmarse con renglones dudosos sin resolver; los sin coincidencia no cuentan", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1), renglon(2, { profesorId: null, criterio: "AMBIGUO" }), renglon(3, { profesorId: null, criterio: "SIN_COINCIDENCIA" })],
    }));
    expect(plan.bloqueo).toBe("Resuelve el renglón dudoso antes de confirmar: asígnale su profesor.");
    expect(planearConVigencia(snii({ renglones: [renglon(3, { profesorId: null, criterio: "SIN_COINCIDENCIA" })] })))
      .toEqual({ bloqueo: null, snii: [], prodep: [], omitidos: [] });
  });

  it("el aviso de dudosos dice cuántos son", () => {
    const plan = planearConVigencia(snii({
      renglones: [renglon(1, { profesorId: null, criterio: "AMBIGUO" }), renglon(2, { profesorId: null, criterio: "AMBIGUO" })],
    }));
    expect(plan.bloqueo).toBe("Resuelve los 2 renglones dudosos antes de confirmar: asígnales su profesor.");
  });
});

describe("planearConfirmacion: PRODEP (RF-019)", () => {
  const conVigencia = (id: number, inicio: string, fin: string | null = null) =>
    renglon(id, { nivel: null, vigenciaInicio: inicio, vigenciaFin: fin });

  it("primer reconocimiento de tiempo completo: tres años desde el inicio del archivo (RF-010)", () => {
    const plan = planearConfirmacion(prodep({ renglones: [conVigencia(1, "2026-08-01", "2029-07-31")], contratacion: { 10: "TIEMPO_COMPLETO" } }));
    expect(plan.prodep).toEqual([{ renglonId: 1, numero: 2, profesorId: 10, tipoSolicitud: "PRIMER_RECONOCIMIENTO", inicio: "2026-08-01", fin: "2029-07-31" }]);
    expect(plan.omitidos).toEqual([]);
  });

  it("la renovación que consolida el historial lleva seis años (RF-010, D-232)", () => {
    const plan = planearConfirmacion(prodep({
      renglones: [conVigencia(1, "2026-08-01")],
      contratacion: { 10: "TIEMPO_COMPLETO" },
      historialProdep: [
        { id: 1, profesorId: 10, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", inicio: "2020-08-01", fin: "2023-07-31" },
        { id: 2, profesorId: 10, tipoSolicitud: "RENOVACION", resultado: "APROBADO", inicio: "2023-08-01", fin: "2026-07-31" },
      ],
    }));
    expect(plan.prodep[0]).toMatchObject({ tipoSolicitud: "RENOVACION", inicio: "2026-08-01", fin: "2032-07-31" });
  });

  it("solo tiempo completo: omite asignatura y contratación pendiente con el mensaje de M3", () => {
    const plan = planearConfirmacion(prodep({
      renglones: [conVigencia(1, "2026-08-01"), conVigencia(2, "2026-08-01")],
      contratacion: { 10: "ASIGNATURA", 20: "PENDIENTE" },
    }));
    expect(plan.prodep).toEqual([]);
    expect(motivos(plan)).toEqual([MENSAJE_PRODEP_REQUIERE_TIEMPO_COMPLETO, MENSAJE_PRODEP_CONTRATACION_PENDIENTE]);
  });

  it("omite a quien el listado trae sin vigencia y no ajusta un fin que no coincide con RF-010", () => {
    const plan = planearConfirmacion(prodep({
      renglones: [renglon(1, { nivel: null }), conVigencia(2, "2026-08-01", "2030-07-31")],
      contratacion: { 10: "TIEMPO_COMPLETO", 20: "TIEMPO_COMPLETO" },
    }));
    expect(plan.prodep).toEqual([]);
    expect(motivos(plan)).toEqual([
      "El listado no trae la vigencia de esta persona.",
      "La fecha de fin del listado (2030-07-31) no coincide con la vigencia de RF-010 (2029-07-31).",
    ]);
  });

  it("omite el periodo que se traslapa (RF-011)", () => {
    const plan = planearConfirmacion(prodep({
      renglones: [conVigencia(1, "2026-08-01")],
      contratacion: { 10: "TIEMPO_COMPLETO" },
      historialProdep: [{ id: 1, profesorId: 10, tipoSolicitud: "PRIMER_RECONOCIMIENTO", resultado: "APROBADO", inicio: "2025-01-01", fin: "2027-12-31" }],
    }));
    expect(plan.prodep).toEqual([]);
    expect(motivos(plan)).toEqual(["Se traslapa con el periodo registrado del 2025-01-01 al 2027-12-31."]);
  });
});
