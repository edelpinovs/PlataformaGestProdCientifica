import { describe, expect, it } from "vitest";
import { clasificarDictamen } from "@/modules/reportes/convocatoria";
import { clasificarCarga, type RenglonRevision } from "./balance";

// RF-019: datos inventados. La clasificación debe coincidir con la del reporte anual (RF-028).
const renglon = (id: number, datos: Partial<RenglonRevision> = {}): RenglonRevision => ({
  id, numero: id + 1, nombre: `PERSONA ${id}`, profesorId: null, criterio: "SIN_COINCIDENCIA", nivel: null, ...datos,
});
const base = { programa: "SNII" as const, anio: 2026, historialSnii: [], historialProdep: [], participantes: [] };
const clase = (r: ReturnType<typeof clasificarCarga>, renglonId: number) => r.filas.find((f) => f.renglonId === renglonId)?.clasificacion;

describe("clasificarCarga (RF-019)", () => {
  it("marca el renglón que repite a un profesor con el número del primero en que aparece", () => {
    const r = clasificarCarga({ ...base, renglones: [
      renglon(1, { profesorId: 10, criterio: "CVU" }),
      renglon(2),
      renglon(3, { profesorId: 10, criterio: "CVU" }),
    ] });
    expect(r.filas.map((f) => f.repiteRenglon)).toEqual([null, null, 2]);
  });

  it("SNII: sin reconocimiento anterior es nuevo ingreso", () => {
    const r = clasificarCarga({ ...base, renglones: [renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_1" })] });
    expect(clase(r, 1)).toBe("NUEVO_INGRESO");
  });

  it("SNII: sube de nivel es promoción; mismo nivel o nivel desconocido, renovación", () => {
    const historialSnii = [{ id: 1, profesorId: 10, nivel: "NIVEL_1", inicio: "2022-01-01" }, { id: 2, profesorId: 20, nivel: "NIVEL_1", inicio: "2022-01-01" },
      { id: 3, profesorId: 30, nivel: "NIVEL_2", inicio: "2022-01-01" }];
    const r = clasificarCarga({ ...base, historialSnii, renglones: [
      renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_2" }),
      renglon(2, { profesorId: 20, criterio: "NOMBRE", nivel: "NIVEL_1" }),
      renglon(3, { profesorId: 30, criterio: "CODIGO", nivel: null }),
    ] });
    expect([clase(r, 1), clase(r, 2), clase(r, 3)]).toEqual(["PROMOCION", "RENOVACION", "RENOVACION"]);
  });

  it("un reconocimiento que empieza después del año de la convocatoria no cuenta como anterior", () => {
    const r = clasificarCarga({ ...base, historialSnii: [{ id: 1, profesorId: 10, nivel: "NIVEL_1", inicio: "2027-01-01" }],
      renglones: [renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_2" })] });
    expect(clase(r, 1)).toBe("NUEVO_INGRESO");
  });

  it("PRODEP: sin reconocimiento anterior es nuevo ingreso; con él, renovación", () => {
    const r = clasificarCarga({ ...base, programa: "PRODEP", historialProdep: [{ id: 1, profesorId: 20, inicio: "2023-01-01" }], renglones: [
      renglon(1, { profesorId: 10, criterio: "CVU" }), renglon(2, { profesorId: 20, criterio: "CVU" }),
    ] });
    expect([clase(r, 1), clase(r, 2)]).toEqual(["NUEVO_INGRESO", "RENOVACION"]);
  });

  it("los dudosos y sin coincidencia van aparte; una asignación manual cuenta como coincidencia", () => {
    const r = clasificarCarga({ ...base, renglones: [
      renglon(1, { criterio: "AMBIGUO" }), renglon(2), renglon(3, { profesorId: 10, criterio: "MANUAL", nivel: "NIVEL_1" }),
    ] });
    expect([clase(r, 1), clase(r, 2), clase(r, 3)]).toEqual(["DUDOSO", "SIN_COINCIDENCIA", "NUEVO_INGRESO"]);
    expect(r.balance).toMatchObject({ DUDOSO: 1, SIN_COINCIDENCIA: 1, NUEVO_INGRESO: 1 });
  });

  it("el participante registrado que no aparece es una fila No aprobado sin renglón", () => {
    const r = clasificarCarga({ ...base, participantes: [10, 40], renglones: [renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_1" })] });
    expect(r.filas.filter((f) => f.clasificacion === "NO_APROBADO")).toEqual([
      { clave: "p40", renglonId: null, numero: null, nombreListado: null, profesorId: 40, criterio: null, clasificacion: "NO_APROBADO", repiteRenglon: null },
    ]);
    expect(r.balance.NO_APROBADO).toBe(1);
  });

  it("un profesor en dos renglones cuenta una vez en el balance", () => {
    const r = clasificarCarga({ ...base, renglones: [
      renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_1" }), renglon(2, { profesorId: 10, criterio: "NOMBRE", nivel: "NIVEL_1" }),
    ] });
    expect(r.filas).toHaveLength(2);
    expect(r.balance.NUEVO_INGRESO).toBe(1);
  });

  it("clasifica igual que clasificarDictamen del reporte anual", () => {
    const historialSnii = [{ id: 1, profesorId: 10, nivel: "NIVEL_1", inicio: "2022-01-01" }];
    const r = clasificarCarga({ ...base, historialSnii, renglones: [renglon(1, { profesorId: 10, criterio: "CVU", nivel: "NIVEL_3" })] });
    const reporte = clasificarDictamen({
      id: -1, profesorId: 10, programa: "SNII", anio: 2026, departamento: null, genero: "F",
      resultado: "APROBADO", tipo: "RENOVACION", nivel: "NIVEL_3", inicio: "2026-12-31",
    }, historialSnii);
    expect(reporte).toBe("promocion");
    expect(clase(r, 1)).toBe("PROMOCION");
  });
});
