import { describe, expect, it } from "vitest";
import {
  idDeDetalle,
  seccionesDetalleProfesor,
  subtituloDetalleProfesor,
  VACIO_DETALLE,
  type DatosDetalleProfesor,
} from "./profesores-detalle";

const base: DatosDetalleProfesor = {
  codigo: "PEND0001",
  nombres: "Ana",
  apellidos: "Pérez Ruiz",
  correo: "ana@demo.invalid",
  genero: "PENDIENTE",
  tipoContratacion: "PENDIENTE",
  estatusLaboral: "ACTIVO",
  goceDeSueldo: false,
  grado: null,
  departamento: null,
  cvu: null,
  orcid: "  ",
  scopusId: null,
  scholarId: null,
  creadoEn: new Date("2026-01-15T18:30:00Z"),
  actualizadoEn: new Date("2026-02-02T15:00:00Z"),
  perfil: false,
  reconocimientosSnii: 0,
  reconocimientosProdep: 1,
  historialSnii: [],
  historialProdep: [],
  cuerpos: 2,
  liderazgos: 0,
  lgacs: 0,
  participaciones: 0,
  autorias: 3,
  programas: 0,
};

const campo = (titulo: string, etiqueta: string) =>
  seccionesDetalleProfesor(base).find((s) => s.titulo === titulo)?.campos.find((c) => c.etiqueta === etiqueta);

describe("detalle de profesor", () => {
  it("acepta un id entero positivo y rechaza el resto con un mensaje en español", () => {
    expect(idDeDetalle.parse("12")).toBe(12);
    for (const valor of ["0", "01", "1.5", "abc", ""]) {
      const resultado = idDeDetalle.safeParse(valor);
      expect(resultado.success).toBe(false);
      if (!resultado.success) expect(resultado.error.issues[0]?.message).toBe("Ese detalle no es válido.");
    }
  });

  it("marca lo pendiente, muestra «—» si falta y deja el cero cuando no hay relaciones", () => {
    expect(campo("Datos generales", "Nombre")?.valor).toBe("Pérez Ruiz, Ana");
    expect(campo("Datos generales", "Género")).toMatchObject({ valor: "Pendiente", pendiente: true });
    expect(campo("Datos generales", "Contratación")).toMatchObject({ valor: "Pendiente", pendiente: true });
    expect(campo("Datos generales", "Goce de sueldo")?.valor).toBe(VACIO_DETALLE);
    expect(campo("Adscripción", "Departamento")?.valor).toBe(VACIO_DETALLE);
    expect(campo("Adscripción", "Grado científico")?.valor).toBe(VACIO_DETALLE);
    expect(campo("Identificadores", "ORCID")?.valor).toBe(VACIO_DETALLE);
    expect(campo("Relacionado", "SNII")?.valor).toBe("0");
    expect(campo("Relacionado", "PRODEP")?.valor).toBe("1");
    expect(campo("Relacionado", "Perfil de acceso")?.valor).toBe("No");
    expect(subtituloDetalleProfesor(base)).toBe("Código PEND0001 · Activo");
  });

  it("en licencia el goce se lee como sí o no, y la adscripción junta departamento y división", () => {
    const secciones = seccionesDetalleProfesor({
      ...base,
      genero: "F",
      tipoContratacion: "TIEMPO_COMPLETO",
      estatusLaboral: "LICENCIA",
      goceDeSueldo: true,
      grado: { nombre: "Doctorado", nomenclatura: "DR" },
      departamento: { nombre: "Ciencias de la Salud", division: "CUCS" },
      orcid: "0000-0000-0000-000X",
      perfil: true,
    });
    const generales = secciones[0]?.campos;
    expect(generales?.find((c) => c.etiqueta === "Género")).toEqual({ etiqueta: "Género", valor: "Femenino" });
    expect(generales?.find((c) => c.etiqueta === "Goce de sueldo")?.valor).toBe("Sí");
    expect(secciones[1]?.campos[0]?.valor).toBe("Ciencias de la Salud (CUCS)");
    expect(secciones[1]?.campos[1]?.valor).toBe("Doctorado (DR)");
    expect(secciones[2]?.campos.find((c) => c.etiqueta === "ORCID")?.valor).toBe("0000-0000-0000-000X");
    expect(secciones[3]?.campos.find((c) => c.etiqueta === "Perfil de acceso")?.valor).toBe("Sí");
  });

  it("muestra estados vacíos en español para los historiales sin registros", () => {
    const secciones = seccionesDetalleProfesor(base);
    expect(secciones.find((seccion) => seccion.titulo === "Historial SNII")?.campos[0]?.valor)
      .toBe("No hay historial SNII registrado.");
    expect(secciones.find((seccion) => seccion.titulo === "Historial PRODEP")?.campos[0]?.valor)
      .toBe("No hay historial PRODEP registrado.");
  });

  it("muestra fechas, nivel o tipo y resultado de cada periodo", () => {
    const secciones = seccionesDetalleProfesor({
      ...base,
      historialSnii: [{
        id: 1,
        nivel: "NIVEL_2",
        tipoParticipacion: "RENOVACION",
        resultado: "APROBADO",
        inicio: new Date("2024-01-01T00:00:00.000Z"),
        fin: new Date("2026-12-31T00:00:00.000Z"),
      }],
      historialProdep: [{
        id: 2,
        tipoSolicitud: "RENOVACION",
        resultado: "EN_RECONSIDERACION",
        inicio: new Date("2023-01-01T00:00:00.000Z"),
        fin: new Date("2028-12-31T00:00:00.000Z"),
      }],
    });

    const historialSnii = secciones.find((seccion) => seccion.titulo === "Historial SNII")?.campos ?? [];
    expect(historialSnii).toHaveLength(1);
    expect(historialSnii[0]).toEqual({
      etiqueta: "Periodo 1",
      valor: "Inicio: 01 ene 2024 · Fin: 31 dic 2026 · Nivel: Nivel 2 · Participación: Renovación · Resultado: Aprobado",
    });

    const historialProdep = secciones.find((seccion) => seccion.titulo === "Historial PRODEP")?.campos ?? [];
    expect(historialProdep).toHaveLength(1);
    expect(historialProdep[0]).toEqual({
      etiqueta: "Periodo 1",
      valor: "Inicio: 01 ene 2023 · Fin: 31 dic 2028 · Tipo: Renovación · Resultado: En reconsideración",
    });
  });
});
