import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import {
  ACCIONES_AUDITORIA,
  CLAVES_ACCION,
  eventoAuditoria,
  LIMITE_RESUMEN,
  resumenCambioEstado,
  resumenEdicionUsuario,
} from "./auditoria";
import { COLUMNAS_AUDITORIA, filtroAuditoria, LISTADO_AUDITORIA, ordenAuditoria } from "./auditoria-listado";

const actor = { id: "11111111-1111-4111-8111-111111111111", correo: " admin@ejemplo.mx " };

describe("registro de auditoría", () => {
  it("arma el evento con el módulo de la acción y el correo limpio", () => {
    expect(eventoAuditoria("usuario.desactivado", actor, { tipo: "Perfil", id: "abc" }, "Desactivó el acceso de a@b.mx.")).toEqual({
      actorId: actor.id,
      actorCorreo: "admin@ejemplo.mx",
      modulo: "administracion",
      accion: "usuario.desactivado",
      entidad: "Perfil",
      entidadId: "abc",
      resumen: "Desactivó el acceso de a@b.mx.",
    });
  });

  it("colapsa espacios y recorta un resumen demasiado largo en lugar de fallar", () => {
    const e = eventoAuditoria("usuario.editado", actor, { tipo: "Perfil", id: "x" }, `a  b\n${"c".repeat(2000)}`);
    expect(e.resumen.startsWith("a b c")).toBe(true);
    expect(e.resumen).toHaveLength(LIMITE_RESUMEN);
    expect(e.resumen.endsWith("…")).toBe(true);
  });

  it("toda acción tiene módulo y texto", () => {
    for (const a of CLAVES_ACCION) {
      expect(ACCIONES_AUDITORIA[a].modulo).toBeTruthy();
      expect(ACCIONES_AUDITORIA[a].texto).toBeTruthy();
    }
  });
});

describe("resúmenes", () => {
  it("sin el código del profesor no llama «código» a su identificador interno", () => {
    const resumen = resumenEdicionUsuario(
      "a@b.mx",
      { rol: "DOCENTE", profesorId: null },
      { rol: "DOCENTE", profesorId: 12 },
    );
    expect(resumen).toBe("Vinculó al profesor de a@b.mx.");
    expect(resumen).not.toContain("12");
  });

  it("nombra solo lo que cambió", () => {
    expect(resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "COORDINADOR", profesorId: null })).toBe(
      "Cambió el rol de Docente a Coordinación de Investigación de a@b.mx.",
    );
    expect(
      resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "DOCENTE", profesorId: 9, codigoProfesor: "100" }),
    ).toBe("Vinculó al profesor con código 100 de a@b.mx.");
    expect(resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: 9 }, { rol: "DOCENTE", profesorId: null })).toBe(
      "Desvinculó al profesor de a@b.mx.",
    );
  });

  it("une varios cambios y devuelve null si no hubo ninguno", () => {
    expect(
      resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "ADMINISTRADOR", profesorId: 2, codigoProfesor: "7" }),
    ).toBe("Cambió el rol de Docente a Administrador y vinculó al profesor con código 7 de a@b.mx.");
    expect(resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: 4 }, { rol: "DOCENTE", profesorId: 4 })).toBeNull();
  });

  it("el resumen no incluye nombres de profesores", () => {
    const r = resumenEdicionUsuario("a@b.mx", { rol: "DOCENTE", profesorId: null }, { rol: "DOCENTE", profesorId: 2, codigoProfesor: "7" });
    expect(r).not.toMatch(/Nombre|Apellido/);
  });

  it("el cambio de estado dice qué pasó", () => {
    expect(resumenCambioEstado("a@b.mx", false)).toBe("Desactivó el acceso de a@b.mx.");
    expect(resumenCambioEstado("a@b.mx", true)).toBe("Reactivó el acceso de a@b.mx.");
  });
});

describe("listado de auditoría", () => {
  const analisis = (p: Record<string, string> = {}) => analizarListado(LISTADO_AUDITORIA, p);
  const consulta = (p: Record<string, string> = {}) => analisis(p).consulta;

  it("sin búsqueda ni filtros no restringe nada y muestra lo más reciente primero", () => {
    expect(filtroAuditoria(consulta())).toEqual({});
    expect(ordenAuditoria(consulta())).toEqual([{ creadoEn: "desc" }, { id: "desc" }]);
  });

  it("la búsqueda cubre persona, resumen, módulo y acción por su texto", () => {
    const w = filtroAuditoria(consulta({ q: "desactivó" }));
    expect(w.OR).toContainEqual({ actorCorreo: { contains: "desactivó", mode: "insensitive" } });
    expect(w.OR).toContainEqual({ resumen: { contains: "desactivó", mode: "insensitive" } });
    expect(w.OR).toContainEqual({ accion: { in: ["usuario.desactivado"] } });
    expect(filtroAuditoria(consulta({ q: "administracion" })).OR).toContainEqual({ modulo: { in: ["administracion"] } });
  });

  it("escapa los comodines", () => {
    expect(filtroAuditoria(consulta({ q: "_" })).OR).toContainEqual({ resumen: { contains: "\\_", mode: "insensitive" } });
  });

  it("combina los filtros de módulo y acción", () => {
    expect(filtroAuditoria(consulta({ modulo: "administracion", accion: "usuario.editado" }))).toEqual({
      modulo: "administracion",
      accion: "usuario.editado",
    });
  });

  it("la búsqueda cubre la columna «Fecha»: año, mes y día en hora de México (#277)", () => {
    expect(filtroAuditoria(consulta({ q: "2026-11-24" })).OR).toContainEqual({
      creadoEn: { gte: new Date("2026-11-24T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z") },
    });
    expect(filtroAuditoria(consulta({ q: "2026-11" })).OR).toContainEqual({
      creadoEn: { gte: new Date("2026-11-01T06:00:00Z"), lt: new Date("2026-12-01T06:00:00Z") },
    });
    expect(filtroAuditoria(consulta({ q: "2026" })).OR).toContainEqual({
      creadoEn: { gte: new Date("2026-01-01T06:00:00Z"), lt: new Date("2027-01-01T06:00:00Z") },
    });
  });

  it("un texto que parece fecha pero no existe no agrega condición de fecha", () => {
    expect(JSON.stringify(filtroAuditoria(consulta({ q: "2026-13-45" })).OR)).not.toContain("creadoEn");
  });

  it("el filtro «Periodo» acota la fecha: hoy, 7 días, 30 días y el mes en curso (#277)", () => {
    const ahora = new Date("2026-11-24T20:00:00Z");
    const rango = (periodo: string) => filtroAuditoria(consulta({ periodo }), ahora).creadoEn;
    expect(rango("HOY")).toEqual({ gte: new Date("2026-11-24T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z") });
    expect(rango("7_DIAS")).toEqual({ gte: new Date("2026-11-18T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z") });
    expect(rango("30_DIAS")).toEqual({ gte: new Date("2026-10-26T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z") });
    expect(rango("MES")).toEqual({ gte: new Date("2026-11-01T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z") });
  });

  it("a las 23:30 del día 24 en México ya es el 25 en UTC, pero «Hoy» sigue siendo el 24", () => {
    const ahora = new Date("2026-11-25T05:30:00Z");
    expect(filtroAuditoria(consulta({ periodo: "HOY" }), ahora).creadoEn).toEqual({
      gte: new Date("2026-11-24T06:00:00Z"), lt: new Date("2026-11-25T06:00:00Z"),
    });
  });

  it("un periodo inválido se ignora y se avisa", () => {
    const a = analisis({ periodo: "siempre" });
    expect(filtroAuditoria(a.consulta)).toEqual({});
    expect(Object.keys(a.errores)).toContain("periodo");
  });

  it("un filtro inválido se ignora y se avisa", () => {
    const a = analisis({ accion: "borrar.todo" });
    expect(filtroAuditoria(a.consulta)).toEqual({});
    expect(Object.keys(a.errores)).toContain("accion");
  });

  it("una columna fuera de la lista no llega al orderBy", () => {
    expect(ordenAuditoria(consulta({ orden: "resumen; DROP TABLE" }))).toEqual([{ creadoEn: "desc" }, { id: "desc" }]);
  });

  it("toda columna ordenable tiene texto para el selector de celular y orden definido", () => {
    expect(COLUMNAS_AUDITORIA.map((c) => c.clave)).toEqual([...LISTADO_AUDITORIA.columnas]);
    for (const clave of LISTADO_AUDITORIA.columnas) expect(() => ordenAuditoria(consulta({ orden: clave }))).not.toThrow();
  });
});
