import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";
import { MODULOS } from "@/modules/registry";

// Bitácora de auditoría (issue 242). Reglas puras: qué acciones existen, cómo se escribe cada
// resumen y cómo se arma el registro. Guardar el registro es trabajo de la Server Action, dentro de la
// misma transacción que el cambio, para que nunca haya un cambio sin su constancia.

/**
 * Acciones que se registran. El módulo indica a qué parte del sistema pertenecen; `null` significa que lo
 * dice quien la registra (un borrado ocurre en cualquier módulo). Cada módulo agrega sus acciones aquí
 * en su propio PR (#277).
 */
export const ACCIONES_AUDITORIA = {
  "usuario.editado": { modulo: "administracion", texto: "Cambió rol o profesor de un usuario" },
  "usuario.desactivado": { modulo: "administracion", texto: "Desactivó el acceso de un usuario" },
  "usuario.reactivado": { modulo: "administracion", texto: "Reactivó el acceso de un usuario" },
  "listado.exportado": { modulo: "administracion", texto: "Exportó un listado" },
  "validacion.dictaminada": { modulo: "validacion", texto: "Dictaminó una publicación" },
  "carga.confirmada": { modulo: "convocatorias", texto: "Confirmó una carga de resultados" },
  "registro.eliminado": { modulo: null, texto: "Eliminó un registro" },
} as const satisfies Record<string, { modulo: string | null; texto: string }>;

export type AccionAuditoria = keyof typeof ACCIONES_AUDITORIA;
export const CLAVES_ACCION = Object.keys(ACCIONES_AUDITORIA) as AccionAuditoria[];

/** Módulos que aparecen en el filtro, con su texto. */
export const MODULOS_AUDITORIA = MODULOS.map((m) => ({ valor: m.slug as string, texto: m.nombre as string }));

export const LIMITE_RESUMEN = 500;

export type EventoAuditoria = {
  actorId: string | null;
  actorCorreo: string;
  modulo: string;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string;
  resumen: string;
};

const recortar = (texto: string, max: number) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

/** Arma el registro a guardar. No lanza error: una bitácora no debe tumbar la operación auditada. */
export function eventoAuditoria(
  accion: AccionAuditoria,
  actor: { id: string; correo: string },
  entidad: { tipo: string; id: string },
  resumen: string,
  modulo?: string,
): EventoAuditoria {
  return {
    actorId: actor.id,
    actorCorreo: recortar(actor.correo.trim(), 254),
    modulo: modulo ?? ACCIONES_AUDITORIA[accion].modulo ?? "sistema",
    accion,
    entidad: recortar(entidad.tipo, 60),
    entidadId: recortar(entidad.id, 60),
    resumen: recortar(resumen.replace(/\s+/g, " ").trim(), LIMITE_RESUMEN),
  };
}

/**
 * Resumen de una edición de usuario. Solo nombra lo que cambió; devuelve null si no cambió nada.
 * El profesor se identifica por su código, no por su nombre.
 */
export function resumenEdicionUsuario(
  correo: string,
  antes: { rol: Rol; profesorId: number | null },
  despues: { rol: Rol; profesorId: number | null; codigoProfesor?: string },
): string | null {
  const cambios: string[] = [];
  if (antes.rol !== despues.rol) {
    cambios.push(`cambió el rol de ${ETIQUETA_ROL[antes.rol]} a ${ETIQUETA_ROL[despues.rol]}`);
  }
  if (antes.profesorId !== despues.profesorId) {
    if (despues.profesorId === null) cambios.push("desvinculó al profesor");
    // El id interno nunca se llama «código»: sin el código del profesor, solo se dice que se vinculó.
    else cambios.push(despues.codigoProfesor ? `vinculó al profesor con código ${despues.codigoProfesor}` : "vinculó al profesor");
  }
  if (cambios.length === 0) return null;
  const texto = cambios.join(" y ");
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)} de ${correo}.`;
}

export function resumenCambioEstado(correo: string, activo: boolean): string {
  return activo ? `Reactivó el acceso de ${correo}.` : `Desactivó el acceso de ${correo}.`;
}

/**
 * Resumen de un borrado. Solo lleva el tipo de registro y su identificador (código o id), nunca nombres
 * ni correos de profesores: la bitácora no debe volverse una segunda copia de datos personales.
 */
export function resumenEliminacion(tipoRegistro: string, identificador: string | number): string {
  return `Eliminó ${tipoRegistro} ${identificador}.`;
}

/** Resumen de un dictamen de validación: identificador de la publicación y resultado, sin título ni autores. */
export function resumenDictamen(idPublicacion: string | number, resultado: string): string {
  return `Dictaminó la publicación ${idPublicacion}: ${resultado}.`;
}

/** Resumen de una carga confirmada: identificador de la carga y conteos. */
export function resumenCargaConfirmada(idCarga: string | number, renglones: number, reconocimientos: number): string {
  return `Confirmó la carga ${idCarga}: ${renglones} renglones, ${reconocimientos} reconocimientos creados.`;
}
