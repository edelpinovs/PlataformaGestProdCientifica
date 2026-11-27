import { describe, expect, it } from "vitest";
import { ETIQUETAS_FUENTE, ETIQUETAS_TIPO } from "@/modules/produccion/consulta";
import {
  ACTIVIDAD_NO_ACTIVA,
  analizarResultados,
  anioDePublicacion,
  consultarResultados,
  filaResultados,
  FUENTES_REPORTE,
  SIN_ANIO,
  SIN_OBRAS,
  TIPOS_REPORTE,
  type CatalogoResultados,
  type CorteObras,
  type DatosResultado,
  type ObraResultado,
} from "./publicaciones";

const catalogo: CatalogoResultados = { departamentos: [1, 2], anios: [2023, 2024], haySinAnio: true };
const sinCorte: CorteObras = { anio: null, tipo: null, fuente: null };

function obra(parcial: Partial<ObraResultado> & Pick<ObraResultado, "publicacionId" | "estado">): ObraResultado {
  return { tipo: "ARTICULO", fuente: "SCOPUS", anio: 2024, ...parcial };
}

function persona(id: number, nombres: string, estatus: DatosResultado["estatusLaboral"], obras: ObraResultado[], departamentoId = 1): DatosResultado {
  return {
    id,
    codigo: `P-${id}`,
    nombres,
    apellidos: "López",
    estatusLaboral: estatus,
    departamento: { id: departamentoId, nombre: departamentoId === 1 ? "Computación" : "Salud" },
    obras,
  };
}

describe("resultados de publicaciones (D-304)", () => {
  it("usa los tipos y las fuentes que ya tiene Producción", () => {
    expect([...TIPOS_REPORTE].sort()).toEqual(Object.keys(ETIQUETAS_TIPO).sort());
    expect([...FUENTES_REPORTE].sort()).toEqual(Object.keys(ETIQUETAS_FUENTE).sort());
  });

  it("toma el año de la fecha y trata el 1 de enero como ese año", () => {
    expect(anioDePublicacion(new Date(Date.UTC(2024, 0, 1)))).toBe(2024);
    expect(anioDePublicacion(null)).toBeNull();
  });

  it("cuenta autorías validadas y deja pendientes y rechazadas aparte", () => {
    const fila = filaResultados(persona(1, "Ada", "ACTIVO", [
      obra({ publicacionId: 1, estado: "VALIDADA", tipo: "ARTICULO", fuente: "SCOPUS", anio: 2024 }),
      obra({ publicacionId: 2, estado: "VALIDADA", tipo: "OTRO", fuente: "GOOGLE_SCHOLAR", anio: null }),
      obra({ publicacionId: 3, estado: "PENDIENTE", tipo: "LIBRO" }),
      obra({ publicacionId: 4, estado: "RECHAZADA", tipo: "ARTICULO" }),
    ]), sinCorte);
    expect(fila.actividad).toBe("Activo");
    expect(fila.validadas).toBe(2);
    expect(fila.pendientes).toBe(1);
    expect(fila.rechazadas).toBe(1);
    expect(fila.porAnio).toBe(`2024 (1); ${SIN_ANIO} (1)`);
    expect(fila.porTipo).toBe("Artículo (1); Otro (1)");
    expect(fila.porFuente).toBe("Scopus (1); Google Scholar (1)");
  });

  it("marca a quien no está activo y no descarta sus obras", () => {
    const compartida = obra({ publicacionId: 7, estado: "VALIDADA" });
    const ada = filaResultados(persona(1, "Ada", "ACTIVO", [compartida]), sinCorte);
    const leo = filaResultados(persona(2, "Leo", "LICENCIA", [compartida], 2), sinCorte);
    expect(leo.actividad).toBe(ACTIVIDAD_NO_ACTIVA);
    expect(leo.validadas).toBe(1);
    const consulta = consultarResultados([ada, leo], analizarResultados({}, catalogo));
    expect(consulta.obrasDistintas).toBe(1);
    expect(consulta.filas.map((fila) => fila.nombre)).toEqual(["Ada López", "Leo López"]);
  });

  it("el filtro de año, tipo o fuente acota los tres conteos", () => {
    const datos = persona(1, "Ada", "ESTANCIA_POSDOCTORAL", [
      obra({ publicacionId: 1, estado: "VALIDADA", tipo: "ARTICULO", anio: 2024 }),
      obra({ publicacionId: 2, estado: "VALIDADA", tipo: "LIBRO", anio: 2023 }),
      obra({ publicacionId: 3, estado: "PENDIENTE", tipo: "LIBRO", anio: 2024 }),
      obra({ publicacionId: 4, estado: "RECHAZADA", tipo: "ARTICULO", fuente: "ORCID", anio: 2024 }),
    ]);
    const porAnio = filaResultados(datos, { anio: 2024, tipo: null, fuente: null });
    expect(porAnio.validadas).toBe(1);
    expect(porAnio.pendientes).toBe(1);
    expect(porAnio.rechazadas).toBe(1);
    expect(porAnio.porTipo).toBe("Artículo (1)");
    const porTipo = filaResultados(datos, { anio: null, tipo: "LIBRO", fuente: null });
    expect(porTipo.validadas).toBe(1);
    expect(porTipo.pendientes).toBe(1);
    expect(porTipo.rechazadas).toBe(0);
    const sinAnio = filaResultados(persona(1, "Ada", "ACTIVO", [
      obra({ publicacionId: 9, estado: "VALIDADA", anio: null }),
    ]), { anio: "sin", tipo: null, fuente: null });
    expect(sinAnio.porAnio).toBe(`${SIN_ANIO} (1)`);
  });

  it("ordena las obras validadas de menor a mayor y filtra por departamento", () => {
    const filas = [
      filaResultados(persona(1, "Ada", "ACTIVO", [
        obra({ publicacionId: 1, estado: "VALIDADA" }),
        obra({ publicacionId: 2, estado: "VALIDADA" }),
      ]), sinCorte),
      filaResultados(persona(2, "Beto", "ACTIVO", [
        obra({ publicacionId: 3, estado: "VALIDADA" }),
      ], 2), sinCorte),
    ];
    const orden = consultarResultados(filas, analizarResultados({ orden: "validadas", dir: "asc" }, catalogo));
    expect(orden.filas.map((fila) => fila.nombre)).toEqual(["Beto López", "Ada López"]);
    const departamento = consultarResultados(filas, analizarResultados({ departamento: "2" }, catalogo));
    expect(departamento.filas.map((fila) => fila.nombre)).toEqual(["Beto López"]);
    expect(departamento.obrasDistintas).toBe(1);
    const sinDepartamento = consultarResultados(filas, analizarResultados({ departamento: "sin" }, catalogo));
    expect(sinDepartamento.filas).toHaveLength(0);
    const inactivo = filaResultados(persona(3, "Leo", "LICENCIA", [obra({ publicacionId: 4, estado: "VALIDADA" })]), sinCorte);
    const conInactivo = [...filas, inactivo];
    const busqueda = consultarResultados(conInactivo, analizarResultados({ q: "activo" }, catalogo));
    expect(busqueda.filas.map((fila) => fila.nombre)).toEqual(["Ada López", "Beto López"]);
    const porActividad = consultarResultados(conInactivo, analizarResultados({ actividad: "no-activa" }, catalogo));
    expect(porActividad.filas.map((fila) => fila.nombre)).toEqual(["Leo López"]);
  });

  it("sin obras validadas lo dice y un filtro imposible avisa en español", () => {
    const fila = filaResultados(persona(1, "Ada", "ACTIVO", [
      obra({ publicacionId: 1, estado: "PENDIENTE" }),
    ]), sinCorte);
    expect(fila.validadas).toBe(0);
    expect(fila.porAnio).toBe(SIN_OBRAS);
    expect(fila.porTipo).toBe(SIN_OBRAS);
    expect(fila.porFuente).toBe(SIN_OBRAS);
    const estado = analizarResultados({ anio: "1999", tipo: "POEMA", fuente: ["SCOPUS", "ORCID"] }, catalogo);
    expect(estado.anio).toBeNull();
    expect(estado.tipo).toBeNull();
    expect(estado.fuente).toBeNull();
    expect(estado.errores.anio).toBe("Elige un año que aparezca en el reporte.");
    expect(estado.errores.tipo).toBe("Elige un tipo de publicación.");
    expect(estado.errores.fuente).toBe("Elige una sola fuente principal.");
  });
});
