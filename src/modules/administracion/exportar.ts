import { z } from "zod";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";
import { enlaceListado, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import type { TablaExportable } from "@/modules/reportes/exportar";
import { ACCIONES_AUDITORIA, MODULOS_AUDITORIA, type AccionAuditoria } from "./auditoria";
import { REGLAS_CALIDAD, type Hallazgo } from "./calidad";

// Exportar a Excel o PDF los listados del panel de administración (issue 244). La descarga trae todas
// las filas que coinciden con la búsqueda y los filtros, no solo la página visible. Los archivos se
// generan con `generarExcel` y `generarPdf` de Reportes; no hay librería nueva.

export const LISTADOS_EXPORTABLES = ["usuarios", "auditoria", "calidad"] as const;
export type ListadoExportable = (typeof LISTADOS_EXPORTABLES)[number];

export const FORMATOS = ["xlsx", "pdf"] as const;
export type Formato = (typeof FORMATOS)[number];

/** Tope de filas por descarga. Más allá se pide acotar con filtros en lugar de armar un archivo enorme. */
export const LIMITE_FILAS = 10_000;

export const RUTA_EXPORTAR = "/administracion/exportar";

export const TIPOS_CONTENIDO: Record<Formato, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const NOMBRES_ARCHIVO: Record<ListadoExportable, string> = {
  usuarios: "usuarios-y-roles",
  auditoria: "auditoria",
  calidad: "calidad-de-datos",
};

export function nombreArchivo(listado: ListadoExportable, formato: Formato) {
  return `${NOMBRES_ARCHIVO[listado]}.${formato}`;
}

const pedido = z.object({
  listado: z.enum(LISTADOS_EXPORTABLES, { error: "Elige qué listado exportar." }),
  formato: z.enum(FORMATOS, { error: "Elige Excel o PDF." }),
});

/** Valida `listado` y `formato` de la URL; el resto de parámetros los valida el listado correspondiente. */
export function leerPedido(parametros: Record<string, string | string[] | undefined>):
  | { listado: ListadoExportable; formato: Formato }
  | { error: string } {
  const r = pedido.safeParse({ listado: parametros.listado, formato: parametros.formato });
  return r.success ? r.data : { error: r.error.issues[0]?.message ?? "Revisa los datos de la descarga." };
}

/** Conserva la búsqueda, los filtros y el orden del listado y quita la página: la descarga trae todo. */
export function enlaceExportacion(
  listado: ListadoExportable,
  formato: Formato,
  definicion: DefinicionListado,
  consulta: ConsultaListado,
) {
  const enlace = enlaceListado(RUTA_EXPORTAR, definicion, consulta, { pagina: 1 });
  const inicio = enlace.indexOf("?");
  const parametros = new URLSearchParams(inicio >= 0 ? enlace.slice(inicio + 1) : "");
  parametros.delete("pagina");
  parametros.set("listado", listado);
  parametros.set("formato", formato);
  return `${RUTA_EXPORTAR}?${parametros.toString()}`;
}

/** Mensaje en español cuando hay demasiadas filas; null si cabe en una descarga. */
export function motivoDemasiadasFilas(total: number): string | null {
  if (total <= LIMITE_FILAS) return null;
  const formato = new Intl.NumberFormat("es-MX");
  return `Hay ${formato.format(total)} registros y el máximo por descarga es ${formato.format(LIMITE_FILAS)}. Acota la búsqueda con filtros e inténtalo de nuevo.`;
}

const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export type FilaUsuarioExportable = {
  correo: string;
  rol: Rol;
  activo: boolean;
  profesor: { codigo: string; nombres: string; apellidos: string } | null;
};

export function tablaUsuarios(filas: FilaUsuarioExportable[]): TablaExportable {
  return {
    titulo: "Usuarios y roles",
    hoja: "Usuarios",
    columnas: ["Correo", "Rol", "Profesor vinculado", "Código del profesor", "Estado"],
    filas: filas.map((f) => [
      f.correo,
      ETIQUETA_ROL[f.rol],
      f.profesor ? `${f.profesor.apellidos} ${f.profesor.nombres}` : "",
      f.profesor?.codigo ?? "",
      f.activo ? "Activo" : "Desactivado",
    ]),
  };
}

export type FilaAuditoriaExportable = {
  creadoEn: Date;
  actorCorreo: string;
  modulo: string;
  accion: string;
  resumen: string;
};

export function tablaAuditoria(filas: FilaAuditoriaExportable[]): TablaExportable {
  return {
    titulo: "Bitácora de auditoría",
    hoja: "Auditoría",
    columnas: ["Fecha", "Persona", "Módulo", "Acción", "Detalle"],
    filas: filas.map((f) => [
      fechaHora.format(f.creadoEn),
      f.actorCorreo,
      MODULOS_AUDITORIA.find((m) => m.valor === f.modulo)?.texto ?? f.modulo,
      ACCIONES_AUDITORIA[f.accion as AccionAuditoria]?.texto ?? f.accion,
      f.resumen,
    ]),
  };
}

export function tablaCalidad(hallazgos: Hallazgo[]): TablaExportable {
  return {
    titulo: "Calidad de datos",
    hoja: "Hallazgos",
    columnas: ["Registro", "Problema", "Detalle"],
    filas: hallazgos.map((h) => [h.registro, REGLAS_CALIDAD[h.regla].texto, h.detalle]),
  };
}

/** Resumen para la bitácora: qué se exportó, en qué formato y cuántas filas. */
export function resumenExportacion(listado: ListadoExportable, formato: Formato, filas: number): string {
  const nombre = { usuarios: "usuarios y roles", auditoria: "auditoría", calidad: "calidad de datos" }[listado];
  return `Exportó el listado de ${nombre} a ${formato === "xlsx" ? "Excel" : "PDF"} (${filas} ${filas === 1 ? "fila" : "filas"}).`;
}
