import { z } from "zod";
import { ROLES, type Rol } from "@/lib/auth/roles";
import type { Modulo } from "@/modules/registry";

// Fase 1 del panel de administración (#241): reglas de usuarios y roles.
// Son funciones puras; las Server Actions leen los perfiles con Prisma y se las pasan.

const sinRol = "Elige un rol válido.";
const sinProfesor = "Elige un profesor de la lista.";

const correo = z
  .string({ error: "Escribe el correo de la persona." })
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, { error: "Escribe el correo de la persona.", abort: true })
      .max(254, { error: "El correo admite como máximo 254 caracteres.", abort: true })
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Revisa el correo: debe verse como nombre@dominio.mx."),
  );

const rol = z.enum(ROLES, { error: sinRol });

// El profesor es opcional: un campo vacío o ausente significa «sin vincular».
const profesorId = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number({ error: sinProfesor }).int(sinProfesor).positive(sinProfesor).optional(),
);

export const invitacionUsuario = z.object({ correo, rol, profesorId });
export const edicionUsuario = z.object({ rol, profesorId });

export type InvitacionUsuario = z.infer<typeof invitacionUsuario>;
export type EdicionUsuario = z.infer<typeof edicionUsuario>;

/** Lo mínimo de un perfil que necesitan las reglas. */
export type PerfilUsuario = {
  id: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  profesorId: number | null;
};

export type Rechazo = { campo?: string; mensaje: string };

const administradoresActivos = (perfiles: PerfilUsuario[]) =>
  perfiles.filter((p) => p.rol === "ADMINISTRADOR" && p.activo);

// Correo y profesor son únicos entre los perfiles (respaldado por @unique en la base).
// Al editar se pasa `idPropio` para que el perfil no choque consigo mismo.
export function buscarDuplicado(
  datos: { correo?: string; profesorId?: number | null },
  perfiles: PerfilUsuario[],
  idPropio?: string,
): Rechazo | null {
  const otros = idPropio === undefined ? perfiles : perfiles.filter((p) => p.id !== idPropio);
  if (datos.correo !== undefined) {
    const nuevo = datos.correo.trim().toLowerCase();
    if (otros.some((p) => p.correo.trim().toLowerCase() === nuevo)) {
      return { campo: "correo", mensaje: "Ese correo ya tiene acceso." };
    }
  }
  if (datos.profesorId != null && otros.some((p) => p.profesorId === datos.profesorId)) {
    return { campo: "profesorId", mensaje: "Ese profesor ya tiene un perfil de acceso." };
  }
  return null;
}

// Siempre debe quedar al menos un administrador activo: quitar el rol o el acceso al último
// dejaría el panel sin nadie que pueda administrarlo.
export function validarCambioRol(perfil: PerfilUsuario, nuevoRol: Rol, perfiles: PerfilUsuario[]): Rechazo | null {
  const eraAdministrador = perfil.rol === "ADMINISTRADOR" && perfil.activo;
  if (!eraAdministrador || nuevoRol === "ADMINISTRADOR") return null;
  if (administradoresActivos(perfiles).length > 1) return null;
  return {
    campo: "rol",
    mensaje: "Debe quedar al menos un administrador. Asigna ese rol a otra persona antes de cambiar este.",
  };
}

export function validarDesactivacion(
  perfil: PerfilUsuario,
  perfiles: PerfilUsuario[],
  idActor: string,
): Rechazo | null {
  if (!perfil.activo) return null;
  if (perfil.id === idActor) {
    return { mensaje: "No puedes desactivar tu propio acceso. Pídeselo a otro administrador." };
  }
  if (perfil.rol === "ADMINISTRADOR" && administradoresActivos(perfiles).length <= 1) {
    return {
      mensaje: "No se puede desactivar al único administrador. Asigna ese rol a otra persona primero.",
    };
  }
  return null;
}

export type FilaMatriz = { slug: string; nombre: string; roles: Record<Rol, boolean> };

/** Matriz de solo lectura: qué rol entra a qué módulo, tomada del registro de módulos. */
export function matrizPermisos(modulos: Pick<Modulo, "slug" | "nombre" | "roles">[]): FilaMatriz[] {
  return modulos.map((m) => ({
    slug: m.slug,
    nombre: m.nombre,
    roles: Object.fromEntries(ROLES.map((r) => [r, m.roles.includes(r)])) as Record<Rol, boolean>,
  }));
}
