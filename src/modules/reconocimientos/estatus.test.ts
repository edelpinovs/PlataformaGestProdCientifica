import { describe, expect, it } from "vitest";
import { calcularSemaforo } from "@/modules/reportes/semaforo";
import { condicionEstatus, ESTATUS, estatusReconocimiento } from "./estatus";

// Issue 248: estatus de vigencia en los listados de SNII y PRODEP con la regla del reporte de
// vigencias (RF-026, D-226), sin duplicarla. Fechas inventadas.
const dia = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
const hoy = dia("2026-11-27");

/** Aplica a una fecha de fin la condición de Prisma que arma condicionEstatus. */
function cumple(condicion: ReturnType<typeof condicionEstatus>, fin: Date, resultado = "APROBADO") {
  const { gte, lt, lte, gt } = condicion.fin as { gte?: Date; lt?: Date; lte?: Date; gt?: Date };
  return (condicion.resultado as { in: string[] }).in.includes(resultado)
    && (!gte || fin >= gte) && (!lt || fin < lt) && (!lte || fin <= lte) && (!gt || fin > gt);
}

describe("estatusReconocimiento", () => {
  it("usa el semáforo del reporte de vigencias: vigente, por vencer o vencido", () => {
    expect(estatusReconocimiento("APROBADO", dia("2029-12-31"), hoy)).toBe("VERDE");
    expect(estatusReconocimiento("APROBADO", dia("2027-06-30"), hoy)).toBe("AMARILLO");
    expect(estatusReconocimiento("EN_RECONSIDERACION", dia("2026-01-31"), hoy)).toBe("ROJO");
  });

  it("un no aprobado no tiene vigencia (D-104)", () => {
    expect(estatusReconocimiento("NO_APROBADO", dia("2029-12-31"), hoy)).toBeNull();
  });
});

describe("condicionEstatus (filtro de la consulta)", () => {
  it("coincide con calcularSemaforo en las fechas límite, para que el filtro y la columna no discrepen", () => {
    const fechas = ["2026-11-26", "2026-11-27", "2026-11-28", "2027-11-26", "2027-11-27", "2027-11-28", "2031-12-31"].map(dia);
    for (const fin of fechas) {
      for (const estatus of ESTATUS) {
        expect(cumple(condicionEstatus(estatus, hoy), fin), `${estatus} ${fin.toISOString()}`).toBe(calcularSemaforo(fin, hoy) === estatus);
      }
    }
  });

  it("deja fuera a los no aprobados en cualquier estatus", () => {
    for (const estatus of ESTATUS) expect(cumple(condicionEstatus(estatus, hoy), dia("2027-06-30"), "NO_APROBADO")).toBe(false);
  });
});
