import { z } from "zod";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";
import { enlaceListado, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import type { TablaExportable } from "@/modules/reportes/exportar";
import { ACCIONES_AUDITORIA, MODULOS_AUDITORIA, type AccionAuditoria } from "./auditoria";
import { REGLAS_CALIDAD, type Hallazgo, type ReglaCalidad } from "./calidad";
import { formatoFechaAlta, PERIODOS } from "./fechas";
import { ESTADOS_USUARIO } from "./usuarios-listado";

// Exportar a Excel o PDF los listados del panel de administración (issue 244). La descarga trae todas
// las filas que coinciden con la búsqueda y los filtros, no solo la página visible. Los archivos se
// generan con `generarExcel` y `generarPdf` de Reportes; no hay librería nueva.

export const LISTADOS_EXPORTABLES = ["usuarios", "auditoria", "calidad"] as const;
export type ListadoExportable = (typeof LISTADOS_EXPORTABLES)[number];

export const FORMATOS = ["xlsx", "pdf"] as const;
export type Formato = (typeof FORMATOS)[number];

/** Tope de filas de un Excel. Más allá se pide acotar con filtros en lugar de armar un archivo enorme. */
export const LIMITE_FILAS = 10_000;

/**
 * Tope de filas de un PDF. Con 10 000 filas de bitácora el PDF pesa unos 5.5 MB y 900 páginas: más de lo
 * que Vercel documenta para la respuesta de una función (4.5 MB, valor por verificar) y de lo que alguien lee.
 * Con 2 000 son unos 1.1 MB. Por encima se ofrece el Excel.
 */
export const LIMITE_FILAS_PDF = 2_000;

export function limiteFilas(formato: Formato) {
  return formato === "pdf" ? LIMITE_FILAS_PDF : LIMITE_FILAS;
}

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

/** Mensaje en español cuando hay demasiadas filas para el formato; null si cabe en una descarga. */
export function motivoDemasiadasFilas(total: number, formato: Formato = "xlsx"): string | null {
  const limite = limiteFilas(formato);
  if (total <= limite) return null;
  const cifra = new Intl.NumberFormat("es-MX");
  if (formato === "pdf" && total <= LIMITE_FILAS) {
    return `Hay ${cifra.format(total)} registros y un PDF admite como máximo ${cifra.format(limite)}. Descárgalo en Excel (hasta ${cifra.format(LIMITE_FILAS)}) o acota la búsqueda con filtros.`;
  }
  return `Hay ${cifra.format(total)} registros y el máximo por descarga es ${cifra.format(limite)}. Acota la búsqueda con filtros e inténtalo de nuevo.`;
}

const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export type FilaUsuarioExportable = {
  correo: string;
  rol: Rol;
  activo: boolean;
  profesor: { codigo: string; nombres: string; apellidos: string } | null;
  creadoEn: Date;
};

export function tablaUsuarios(filas: FilaUsuarioExportable[]): TablaExportable {
  return {
    titulo: "Usuarios y roles",
    hoja: "Usuarios",
    columnas: ["Correo", "Rol", "Profesor vinculado", "Código del profesor", "Estado", "Alta"],
    filas: filas.map((f) => [
      f.correo,
      ETIQUETA_ROL[f.rol],
      f.profesor ? `${f.profesor.apellidos} ${f.profesor.nombres}` : "",
      f.profesor?.codigo ?? "",
      f.activo ? "Activo" : "Desactivado",
      formatoFechaAlta.format(f.creadoEn),
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

/**
 * Filtros activos del listado, para dejarlos en la bitácora: «rol Coordinación de Investigación, estado
 * Desactivado». El texto de la búsqueda no se guarda (puede ser un correo o un nombre); solo se anota que hubo.
 */
export function descripcionFiltros(listado: ListadoExportable, consulta: ConsultaListado): string {
  const f = consulta.filtros;
  const partes: string[] = [];
  if (listado === "usuarios") {
    if (f.rol) partes.push(`rol ${ETIQUETA_ROL[f.rol as Rol] ?? f.rol}`);
    if (f.estado) partes.push(`estado ${ESTADOS_USUARIO.find((e) => e.valor === f.estado)?.texto ?? f.estado}`);
  } else if (listado === "auditoria") {
    if (f.modulo) partes.push(`módulo ${MODULOS_AUDITORIA.find((m) => m.valor === f.modulo)?.texto ?? f.modulo}`);
    if (f.accion) partes.push(`acción «${ACCIONES_AUDITORIA[f.accion as AccionAuditoria]?.texto ?? f.accion}»`);
    if (f.periodo) partes.push(`periodo «${PERIODOS.find((p) => p.valor === f.periodo)?.texto ?? f.periodo}»`);
  } else if (f.regla) {
    partes.push(`problema «${REGLAS_CALIDAD[f.regla as ReglaCalidad]?.texto ?? f.regla}»`);
  }
  if (consulta.q) partes.push("con búsqueda de texto");
  return partes.join(", ");
}

/** Resumen para la bitácora: qué se exportó, en qué formato, cuántas filas y con qué filtros. */
export function resumenExportacion(listado: ListadoExportable, formato: Formato, filas: number, filtros = ""): string {
  const nombre = { usuarios: "usuarios y roles", auditoria: "auditoría", calidad: "calidad de datos" }[listado];
  const base = `Exportó el listado de ${nombre} a ${formato === "xlsx" ? "Excel" : "PDF"} (${filas} ${filas === 1 ? "fila" : "filas"}).`;
  return filtros ? `${base} Filtros: ${filtros}.` : base;
}
