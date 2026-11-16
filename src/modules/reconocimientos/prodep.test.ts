import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  filtroProdep,
  LISTADO_PRODEP,
  ordenProdep,
  reconocimientoProdep,
  tieneProdepActivo,
  validarContratacionProdep,
} from "./prodep";

function fecha(dia: string) {
  return new Date(`${dia}T00:00:00.000Z`);
}

const datosValidos = {
  profesorId: 7,
  tipoSolicitud: "PRIMER_RECONOCIMIENTO",
  resultado: "APROBADO",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
};

describe("reconocimientoProdep", () => {
  it("acepta solicitudes y fechas válidas", () => {
    expect(reconocimientoProdep.safeParse(datosValidos).success).toBe(true);
  });

  it("devuelve mensajes en español para campos ausentes o enums inválidos", () => {
    const resultado = reconocimientoProdep.safeParse({
      ...datosValidos,
      profesorId: Number.NaN,
      tipoSolicitud: "OTRA",
      resultado: "",
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.map((problema) => problema.message)).toEqual([
        "Selecciona un profesor.",
        "Selecciona un tipo de solicitud válido.",
        "Selecciona un resultado válido.",
      ]);
    }
  });

  it("rechaza fechas inexistentes y un fin anterior o igual al inicio", () => {
    for (const fechaFin of ["2026-02-30", "2026-01-01", "2025-12-31"]) {
      const resultado = reconocimientoProdep.safeParse({ ...datosValidos, fechaFin });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0]?.message).toBe(
          fechaFin === "2026-02-30"
            ? "Ingresa una fecha válida."
            : "La fecha de fin debe ser posterior a la fecha de inicio.",
        );
      }
    }
  });
});

describe("validarContratacionProdep", () => {
  it("permite registrar y actualizar a profesores de Tiempo Completo", () => {
    expect(validarContratacionProdep("TIEMPO_COMPLETO")).toBeNull();
  });

  it("rechaza a profesores por Asignatura con un mensaje claro", () => {
    expect(validarContratacionProdep("ASIGNATURA")).toBe("El Perfil Deseable PRODEP requiere Tiempo Completo.");
  });
});

describe("tieneProdepActivo", () => {
  const hoy = fecha("2026-06-15");

  it("considera vigente el dictamen aprobado que incluye hoy", () => {
    expect(tieneProdepActivo([{ resultado: "APROBADO", inicio: hoy, fin: hoy }], hoy)).toBe(true);
  });

  it("no considera un reconocimiento vencido", () => {
    expect(tieneProdepActivo([
      { resultado: "APROBADO", inicio: fecha("2025-01-01"), fin: fecha("2026-06-14") },
    ], hoy)).toBe(false);
  });

  it("no considera un reconocimiento futuro", () => {
    expect(tieneProdepActivo([
      { resultado: "APROBADO", inicio: fecha("2026-06-16"), fin: fecha("2027-06-15") },
    ], hoy)).toBe(false);
  });

  it("no considera vigente un dictamen distinto de aprobado", () => {
    expect(tieneProdepActivo([
      { resultado: "EN_RECONSIDERACION", inicio: fecha("2026-01-01"), fin: fecha("2027-01-01") },
    ], hoy)).toBe(false);
  });

  it("compara la fecha del día en UTC", () => {
    const conHora = new Date("2026-06-15T23:59:00.000Z");
    expect(tieneProdepActivo([
      { resultado: "APROBADO", inicio: fecha("2026-06-15"), fin: fecha("2026-06-15") },
    ], conHora)).toBe(true);
  });
});

describe("listado PRODEP", () => {
  it("solo permite ordenar por columnas declaradas y traduce el orden a campos Prisma", () => {
    const { consulta } = analizarListado(LISTADO_PRODEP, { orden: "fin", dir: "desc" });
    expect(ordenProdep(consulta)).toEqual([{ fin: "desc" }, { id: "desc" }]);

    const invalida = analizarListado(LISTADO_PRODEP, { orden: "profesor.codigo" });
    expect(invalida.consulta.orden).toBe("profesor");
    expect(invalida.errores.orden).toBe("Ordena por una columna válida.");
  });

  it("busca por fechas y etiquetas visibles, además de los datos del profesor", () => {
    const fecha = analizarListado(LISTADO_PRODEP, { q: "2026-01-01" });
    expect(filtroProdep(fecha.consulta).OR).toContainEqual({
      inicio: { gte: new Date("2026-01-01T00:00:00.000Z"), lt: new Date("2026-01-02T00:00:00.000Z") },
    });

    const mes = analizarListado(LISTADO_PRODEP, { q: "2026-01" });
    expect(filtroProdep(mes.consulta).OR).toContainEqual({
      fin: { gte: new Date("2026-01-01T00:00:00.000Z"), lt: new Date("2026-02-01T00:00:00.000Z") },
    });

    const resultado = analizarListado(LISTADO_PRODEP, { q: "Aprobado" });
    expect(filtroProdep(resultado.consulta).OR).toContainEqual({ resultado: "APROBADO" });

    const profesor = analizarListado(LISTADO_PRODEP, { q: "Ana_%\\" });
    expect(filtroProdep(profesor.consulta).OR).toContainEqual({
      profesor: { is: { nombres: { contains: "Ana\\_\\%\\\\", mode: "insensitive" } } },
    });
  });

  it("aplica únicamente los filtros finitos aceptados", () => {
    const aceptado = analizarListado(LISTADO_PRODEP, { tipoSolicitud: "RENOVACION", resultado: "APROBADO" });
    expect(filtroProdep(aceptado.consulta)).toMatchObject({
      tipoSolicitud: "RENOVACION",
      resultado: "APROBADO",
    });

    const invalido = analizarListado(LISTADO_PRODEP, { resultado: "BORRADO" });
    expect(filtroProdep(invalido.consulta)).not.toHaveProperty("resultado");
    expect(invalido.errores.resultado).toBe("Uno de los filtros tiene un valor que no existe.");
  });
});
