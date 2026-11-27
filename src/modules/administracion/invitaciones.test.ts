import { describe, expect, it } from "vitest";
import { ACCIONES_AUDITORIA, resumenInvitacion, resumenInvitacionCancelada } from "./auditoria";
import { buscarDuplicadoInvitacion, type PerfilUsuario } from "./usuarios";

// #275 · D-301: reglas puras de las invitaciones pendientes.

const perfil = (id: string, extra: Partial<PerfilUsuario> = {}): PerfilUsuario => ({
  id,
  correo: `${id}@ejemplo.mx`,
  rol: "DOCENTE",
  activo: true,
  profesorId: null,
  ...extra,
});

describe("unicidad de una invitación", () => {
  const perfiles = [perfil("a", { profesorId: 5 })];
  const pendientes = [{ correo: "p@ejemplo.mx", profesorId: 7 }];

  it("rechaza un correo con acceso, un correo pendiente y los profesores de ambos, sin distinguir mayúsculas", () => {
    expect(buscarDuplicadoInvitacion({ correo: " A@EJEMPLO.MX " }, perfiles, pendientes)).toEqual({ campo: "correo", mensaje: "Ese correo ya tiene acceso." });
    expect(buscarDuplicadoInvitacion({ correo: "P@Ejemplo.mx" }, perfiles, pendientes)).toEqual({ campo: "correo", mensaje: "Ese correo ya tiene una invitación pendiente." });
    expect(buscarDuplicadoInvitacion({ correo: "n@ejemplo.mx", profesorId: 5 }, perfiles, pendientes)).toEqual({ campo: "profesorId", mensaje: "Ese profesor ya tiene un perfil de acceso." });
    expect(buscarDuplicadoInvitacion({ correo: "n@ejemplo.mx", profesorId: 7 }, perfiles, pendientes)).toEqual({ campo: "profesorId", mensaje: "Ese profesor ya tiene una invitación pendiente." });
  });

  it("acepta un correo y un profesor libres, o sin profesor", () => {
    expect(buscarDuplicadoInvitacion({ correo: "n@ejemplo.mx", profesorId: 9 }, perfiles, pendientes)).toBeNull();
    expect(buscarDuplicadoInvitacion({ correo: "n@ejemplo.mx" }, perfiles, pendientes)).toBeNull();
    expect(buscarDuplicadoInvitacion({ correo: "n@ejemplo.mx", profesorId: null }, perfiles, [{ correo: "x@ejemplo.mx", profesorId: null }])).toBeNull();
  });
});

describe("resúmenes de invitaciones", () => {
  it("nombran el correo, el rol y el código del profesor, nunca su nombre", () => {
    expect(resumenInvitacion("a@ejemplo.mx", "DOCENTE", "100")).toBe("Dejó una invitación pendiente para el profesor con código 100: a@ejemplo.mx como Docente.");
    expect(resumenInvitacion("a@ejemplo.mx", "DOCENTE")).toBe("Dejó una invitación pendiente: a@ejemplo.mx como Docente.");
    expect(resumenInvitacionCancelada("a@ejemplo.mx")).toBe("Canceló la invitación pendiente de a@ejemplo.mx.");
  });

  it("las acciones nuevas pertenecen al módulo de administración", () => {
    expect(ACCIONES_AUDITORIA["usuario.invitado"].modulo).toBe("administracion");
    expect(ACCIONES_AUDITORIA["usuario.invitacion_cancelada"].modulo).toBe("administracion");
  });
});
