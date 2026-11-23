import { describe, expect, it } from "vitest";
import { MODULOS } from "@/modules/registry";
import {
  buscarDuplicado,
  edicionUsuario,
  invitacionUsuario,
  matrizPermisos,
  validarCambioRol,
  validarDesactivacion,
  type PerfilUsuario,
} from "./usuarios";

const perfil = (id: string, extra: Partial<PerfilUsuario> = {}): PerfilUsuario => ({
  id,
  correo: `${id}@ejemplo.mx`,
  rol: "DOCENTE",
  activo: true,
  profesorId: null,
  ...extra,
});

const mensajes = (r: { error?: { issues: { message: string }[] } }) => r.error?.issues.map((i) => i.message) ?? [];

describe("invitación de usuario", () => {
  it("normaliza el correo y deja el profesor sin vincular si viene vacío", () => {
    const r = invitacionUsuario.parse({ correo: "  Ana.Perez@Ejemplo.MX ", rol: "DOCENTE", profesorId: "" });
    expect(r).toEqual({ correo: "ana.perez@ejemplo.mx", rol: "DOCENTE", profesorId: undefined });
  });

  it("acepta el profesor como texto de formulario", () => {
    expect(invitacionUsuario.parse({ correo: "a@b.mx", rol: "COORDINADOR", profesorId: "12" }).profesorId).toBe(12);
  });

  it("explica en español cada campo inválido", () => {
    const r = invitacionUsuario.safeParse({ correo: "sin-arroba", rol: "SUPERUSUARIO", profesorId: "abc" });
    expect(mensajes(r)).toEqual([
      "Revisa el correo: debe verse como nombre@dominio.mx.",
      "Elige un rol válido.",
      "Elige un profesor de la lista.",
    ]);
  });

  it("los campos ausentes o atípicos también dan mensajes en español", () => {
    expect(mensajes(invitacionUsuario.safeParse({}))).toEqual([
      "Escribe el correo de la persona.",
      "Elige un rol válido.",
    ]);
    expect(mensajes(invitacionUsuario.safeParse({ correo: "   ", rol: "DOCENTE" }))).toEqual([
      "Escribe el correo de la persona.",
    ]);
    expect(mensajes(invitacionUsuario.safeParse({ correo: "a@b.mx", rol: "DOCENTE", profesorId: "-3" }))).toEqual([
      "Elige un profesor de la lista.",
    ]);
    expect(mensajes(invitacionUsuario.safeParse({ correo: "a@b.mx", rol: "DOCENTE", profesorId: "1.5" }))).toEqual([
      "Elige un profesor de la lista.",
    ]);
  });

  it("limita la longitud del correo", () => {
    const largo = `${"a".repeat(250)}@b.mx`;
    expect(mensajes(invitacionUsuario.safeParse({ correo: largo, rol: "DOCENTE" }))).toEqual([
      "El correo admite como máximo 254 caracteres.",
    ]);
  });
});

describe("edición de usuario", () => {
  it("solo cambia rol y profesor", () => {
    expect(edicionUsuario.parse({ rol: "ADMINISTRADOR", profesorId: "7", correo: "otro@x.mx" })).toEqual({
      rol: "ADMINISTRADOR",
      profesorId: 7,
    });
  });
});

describe("unicidad de correo y profesor", () => {
  const perfiles = [perfil("a", { profesorId: 5 }), perfil("b")];

  it("rechaza un correo repetido sin distinguir mayúsculas", () => {
    expect(buscarDuplicado({ correo: " A@EJEMPLO.MX " }, perfiles)).toEqual({
      campo: "correo",
      mensaje: "Ese correo ya tiene acceso.",
    });
  });

  it("rechaza un profesor que ya tiene perfil", () => {
    expect(buscarDuplicado({ profesorId: 5 }, perfiles)).toEqual({
      campo: "profesorId",
      mensaje: "Ese profesor ya tiene un perfil de acceso.",
    });
  });

  it("al editar, el perfil no choca consigo mismo", () => {
    expect(buscarDuplicado({ profesorId: 5 }, perfiles, "a")).toBeNull();
    expect(buscarDuplicado({ correo: "a@ejemplo.mx" }, perfiles, "a")).toBeNull();
  });

  it("sin profesor no hay choque", () => {
    expect(buscarDuplicado({ correo: "nuevo@ejemplo.mx", profesorId: null }, perfiles)).toBeNull();
    expect(buscarDuplicado({ correo: "nuevo@ejemplo.mx", profesorId: undefined }, perfiles)).toBeNull();
  });
});

describe("último administrador", () => {
  const unico = perfil("admin", { rol: "ADMINISTRADOR" });
  const dos = [unico, perfil("admin2", { rol: "ADMINISTRADOR" }), perfil("d")];

  it("no deja quitar el rol al único administrador activo", () => {
    expect(validarCambioRol(unico, "COORDINADOR", [unico, perfil("d")])?.mensaje).toBe(
      "Debe quedar al menos un administrador. Asigna ese rol a otra persona antes de cambiar este.",
    );
  });

  it("permite cambiar el rol si queda otro administrador activo", () => {
    expect(validarCambioRol(unico, "DOCENTE", dos)).toBeNull();
  });

  it("un administrador desactivado no cuenta como respaldo", () => {
    const inactivo = perfil("viejo", { rol: "ADMINISTRADOR", activo: false });
    expect(validarCambioRol(unico, "DOCENTE", [unico, inactivo])).not.toBeNull();
  });

  it("mantener el rol de administrador siempre se permite", () => {
    expect(validarCambioRol(unico, "ADMINISTRADOR", [unico])).toBeNull();
  });

  it("cambiar el rol de quien no es administrador no se revisa", () => {
    expect(validarCambioRol(perfil("d"), "COORDINADOR", [unico, perfil("d")])).toBeNull();
  });

  it("no deja desactivar al único administrador", () => {
    expect(validarDesactivacion(unico, [unico, perfil("d")], "otro")?.mensaje).toBe(
      "No se puede desactivar al único administrador. Asigna ese rol a otra persona primero.",
    );
    expect(validarDesactivacion(unico, dos, "otro")).toBeNull();
  });

  it("nadie desactiva su propio acceso", () => {
    expect(validarDesactivacion(dos[1], dos, "admin2")?.mensaje).toBe(
      "No puedes desactivar tu propio acceso. Pídeselo a otro administrador.",
    );
  });

  it("reactivar un perfil ya desactivado no tiene restricciones", () => {
    expect(validarDesactivacion(perfil("x", { activo: false }), [unico], "admin")).toBeNull();
  });
});

describe("matriz de permisos", () => {
  it("sale del registro de módulos", () => {
    const filas = matrizPermisos(MODULOS);
    expect(filas).toHaveLength(MODULOS.length);
    const validacion = filas.find((f) => f.slug === "validacion");
    expect(validacion?.roles).toEqual({ ADMINISTRADOR: true, COORDINADOR: true, DOCENTE: true });
    const catalogos = filas.find((f) => f.slug === "catalogos");
    expect(catalogos?.roles).toEqual({ ADMINISTRADOR: true, COORDINADOR: false, DOCENTE: false });
  });
});
