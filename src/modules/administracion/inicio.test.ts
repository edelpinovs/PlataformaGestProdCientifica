import { describe, expect, it } from "vitest";
import { calcularSemaforo } from "@/modules/reportes/semaforo";
import { finDeCuerpo, inicioDelDiaUtc } from "@/modules/reportes/vigencias";
import { aniosCuerpoPorVencer, rangoPorVencer, requiereAtencion, RESULTADOS_EN_SEMAFORO } from "./inicio";

const HOY = inicioDelDiaUtc(new Date("2026-11-24T15:00:00Z"));
const cero = { sinPerfil: 0, cuerposSinLider: 0, porVencer: 0, pendientesValidar: 0 };

describe("inicio del panel: vigencias por vencer (#276)", () => {
  it("el rango coincide con el amarillo del semáforo de Reportes en sus bordes", () => {
    const { desde, hasta } = rangoPorVencer(HOY);
    const unMs = (fecha: Date, ms: number) => new Date(fecha.getTime() + ms);
    expect(calcularSemaforo(desde, HOY)).toBe("AMARILLO");
    expect(calcularSemaforo(unMs(desde, -1), HOY)).toBe("ROJO");
    expect(calcularSemaforo(hasta, HOY)).toBe("AMARILLO");
    expect(calcularSemaforo(unMs(hasta, 1), HOY)).toBe("VERDE");
  });

  it("solo cuentan los resultados que entran al semáforo: aprobado y en reconsideración", () => {
    expect(RESULTADOS_EN_SEMAFORO).toEqual(["APROBADO", "EN_RECONSIDERACION"]);
  });

  it("un cuerpo académico vence el 31 de diciembre de su año: hoy cuenta este año, no el siguiente", () => {
    expect(aniosCuerpoPorVencer(rangoPorVencer(HOY))).toEqual([2026]);
  });

  it("en enero cuentan el año en curso y, al acercarse, también el siguiente", () => {
    expect(aniosCuerpoPorVencer(rangoPorVencer(new Date("2026-01-15T00:00:00Z")))).toEqual([2026]);
    expect(aniosCuerpoPorVencer(rangoPorVencer(new Date("2026-01-01T00:00:00Z")))).toEqual([2026]);
    const finDeAnio = rangoPorVencer(new Date("2025-12-31T00:00:00Z"));
    expect(aniosCuerpoPorVencer(finDeAnio)).toEqual([2025, 2026]);
    expect(calcularSemaforo(finDeCuerpo(2026), new Date("2025-12-31T00:00:00Z"))).toBe("AMARILLO");
  });
});

describe("inicio del panel: «Requiere atención» (#276)", () => {
  it("sin nada pendiente la lista queda vacía", () => {
    expect(requiereAtencion(cero)).toEqual([]);
  });

  it("solo aparece lo que tiene casos, en orden fijo y con su enlace", () => {
    const puntos = requiereAtencion({ ...cero, pendientesValidar: 3, sinPerfil: 2 });
    expect(puntos.map((p) => p.clave)).toEqual(["sinPerfil", "pendientesValidar"]);
    expect(puntos[0]).toEqual({
      clave: "sinPerfil", cifra: 2, texto: "2 profesores activos no tienen perfil de acceso",
      enlace: "/administracion/calidad?regla=SIN_PERFIL",
    });
    expect(puntos[1].enlace).toBe("/validacion");
  });

  it("usa singular con un caso y plural con varios", () => {
    const uno = requiereAtencion({ sinPerfil: 1, cuerposSinLider: 1, porVencer: 1, pendientesValidar: 1 });
    expect(uno.map((p) => p.texto)).toEqual([
      "1 profesor activo no tiene perfil de acceso",
      "1 cuerpo académico no tiene líder",
      "1 vigencia vence en los próximos 12 meses",
      "1 publicación espera validación",
    ]);
    const varios = requiereAtencion({ sinPerfil: 0, cuerposSinLider: 4, porVencer: 7, pendientesValidar: 0 });
    expect(varios.map((p) => p.texto)).toEqual([
      "4 cuerpos académicos no tienen líder",
      "7 vigencias vencen en los próximos 12 meses",
    ]);
  });

  it("las cifras grandes llevan separador de miles", () => {
    expect(requiereAtencion({ ...cero, pendientesValidar: 1250 })[0].texto).toBe("1,250 publicaciones esperan validación");
  });

  it("enlaza a donde se atiende cada punto", () => {
    const puntos = requiereAtencion({ sinPerfil: 1, cuerposSinLider: 1, porVencer: 1, pendientesValidar: 1 });
    expect(Object.fromEntries(puntos.map((p) => [p.clave, p.enlace]))).toEqual({
      sinPerfil: "/administracion/calidad?regla=SIN_PERFIL",
      cuerposSinLider: "/administracion/calidad?regla=CA_SIN_LIDER",
      porVencer: "/reportes?semaforo=AMARILLO",
      pendientesValidar: "/validacion",
    });
  });
});
