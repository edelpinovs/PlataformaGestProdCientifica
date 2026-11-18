import { describe, expect, it } from "vitest";
import {
  accesosFrecuentes,
  debeRegistrar,
  modulosDelRol,
  moduloRegistrable,
  textoVisitas,
  VENTANA_VISITA_MS,
} from "./accesos";

const HOY = new Date("2026-11-17T12:00:00.000Z");
const dias = (n: number) => new Date(HOY.getTime() - n * 86_400_000);

describe("moduloRegistrable", () => {
  it("acepta un módulo del registro al que el rol tiene acceso", () => {
    expect(moduloRegistrable("profesores", "COORDINADOR")?.slug).toBe("profesores");
    expect(moduloRegistrable("validacion", "DOCENTE")?.slug).toBe("validacion");
  });

  it("rechaza un módulo al que el rol no tiene acceso", () => {
    expect(moduloRegistrable("catalogos", "COORDINADOR")).toBeNull();
    expect(moduloRegistrable("reportes", "DOCENTE")).toBeNull();
  });

  it("rechaza lo que no es un módulo (inicio, cuenta, texto libre, valores que no son texto)", () => {
    for (const valor of ["inicio", "cuenta", "", "../etc", "PROFESORES", null, undefined, 7, {}]) {
      expect(moduloRegistrable(valor, "ADMINISTRADOR")).toBeNull();
    }
  });
});

describe("debeRegistrar", () => {
  const ahora = HOY.getTime();

  it("registra la primera visita", () => {
    expect(debeRegistrar(null, ahora)).toBe(true);
  });

  it("no vuelve a registrar dentro de la ventana de 30 minutos", () => {
    expect(debeRegistrar(ahora - 60_000, ahora)).toBe(false);
    expect(debeRegistrar(ahora - (VENTANA_VISITA_MS - 1), ahora)).toBe(false);
  });

  it("registra al cumplirse la ventana", () => {
    expect(VENTANA_VISITA_MS).toBe(30 * 60 * 1000);
    expect(debeRegistrar(ahora - VENTANA_VISITA_MS, ahora)).toBe(true);
    expect(debeRegistrar(ahora - 3 * VENTANA_VISITA_MS, ahora)).toBe(true);
  });

  it("una marca en el futuro o inválida se ignora y se registra", () => {
    expect(debeRegistrar(ahora + 60_000, ahora)).toBe(true);
    expect(debeRegistrar(Number.NaN, ahora)).toBe(true);
  });
});

describe("accesosFrecuentes", () => {
  const filas = [
    { modulo: "profesores", conteo: 12, ultimoAcceso: dias(1) },
    { modulo: "reportes", conteo: 30, ultimoAcceso: dias(3) },
    { modulo: "validacion", conteo: 5, ultimoAcceso: dias(2) },
    { modulo: "reconocimientos", conteo: 5, ultimoAcceso: dias(0) },
    { modulo: "convocatorias", conteo: 2, ultimoAcceso: dias(9) },
    { modulo: "produccion", conteo: 1, ultimoAcceso: dias(20) },
  ];

  it("ordena por conteo y desempata por el acceso más reciente", () => {
    const r = accesosFrecuentes(filas, "ADMINISTRADOR");
    expect(r.map((a) => a.slug)).toEqual(["reportes", "profesores", "reconocimientos", "validacion"]);
  });

  it("muestra como máximo 4 por omisión y respeta un límite distinto", () => {
    expect(accesosFrecuentes(filas, "ADMINISTRADOR")).toHaveLength(4);
    expect(accesosFrecuentes(filas, "ADMINISTRADOR", 2)).toHaveLength(2);
  });

  it("filtra por el rol actual: no muestra módulos que el rol ya no puede abrir", () => {
    const r = accesosFrecuentes(filas, "DOCENTE");
    expect(r.map((a) => a.slug)).toEqual(["validacion"]);
  });

  it("ignora slugs que ya no existen en el registro", () => {
    const r = accesosFrecuentes([{ modulo: "viejo", conteo: 99, ultimoAcceso: dias(1) }, ...filas], "ADMINISTRADOR");
    expect(r.map((a) => a.slug)).not.toContain("viejo");
  });

  it("cada acceso trae nombre, descripción, enlace y conteo", () => {
    const [primero] = accesosFrecuentes(filas, "ADMINISTRADOR");
    expect(primero).toMatchObject({
      slug: "reportes",
      nombre: "Vigencias y reportes",
      href: "/reportes",
      conteo: 30,
    });
    expect(primero.descripcion.length).toBeGreaterThan(0);
  });

  it("sin historial devuelve una lista vacía", () => {
    expect(accesosFrecuentes([], "ADMINISTRADOR")).toEqual([]);
  });

  it("desempata por slug cuando conteo y fecha coinciden, para que el orden sea estable", () => {
    const iguales = [
      { modulo: "reportes", conteo: 3, ultimoAcceso: dias(1) },
      { modulo: "profesores", conteo: 3, ultimoAcceso: dias(1) },
    ];
    expect(accesosFrecuentes(iguales, "ADMINISTRADOR").map((a) => a.slug)).toEqual(["profesores", "reportes"]);
  });
});

describe("modulosDelRol", () => {
  it("lista solo los módulos del rol", () => {
    expect(modulosDelRol("DOCENTE").map((m) => m.slug)).toEqual(["validacion"]);
    expect(modulosDelRol("ADMINISTRADOR").length).toBeGreaterThan(modulosDelRol("COORDINADOR").length);
  });
});

describe("textoVisitas", () => {
  it("concuerda el singular y el plural", () => {
    expect(textoVisitas(1)).toBe("1 visita");
    expect(textoVisitas(2)).toBe("2 visitas");
    expect(textoVisitas(1234)).toBe("1,234 visitas");
  });
});
