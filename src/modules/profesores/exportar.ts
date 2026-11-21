import { enlaceListado, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import type { TablaExportable } from "@/modules/reportes/exportar";
import { ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "./profesores";

// Exportar el listado de Profesores a Excel (issue #233). Lleva lo que muestra la tabla y nada más:
// sin CVU, ORCID, Scholar ID ni Scopus ID. La descarga trae todas las filas que coinciden con la
// búsqueda y los filtros, no solo la página visible.

export const RUTA_EXPORTAR_PROFESORES = "/profesores/exportar";
export const NOMBRE_ARCHIVO_PROFESORES = "profesores.xlsx";
export const TIPO_EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const COLUMNAS_EXPORTACION_PROFESORES = [
  "Código",
  "Apellidos",
  "Nombres",
  "Grado",
  "Departamento",
  "Tipo de contratación",
  "Estatus laboral",
  "Correo institucional",
] as const;

export type FilaProfesorExportable = {
  codigo: string;
  apellidos: string;
  nombres: string;
  correo: string;
  tipoContratacion: keyof typeof ETIQUETA_CONTRATACION;
  estatusLaboral: keyof typeof ETIQUETA_ESTATUS;
  grado: { nombre: string } | null;
  departamento: { nombre: string } | null;
};

/** Tabla lista para `generarExcel`: celdas vacías donde el profesor no tiene grado o departamento. */
export function tablaProfesores(filas: FilaProfesorExportable[]): TablaExportable {
  return {
    titulo: "Directorio de profesores",
    hoja: "Profesores",
    columnas: [...COLUMNAS_EXPORTACION_PROFESORES],
    filas: filas.map((p) => [
      p.codigo,
      p.apellidos,
      p.nombres,
      p.grado?.nombre ?? "",
      p.departamento?.nombre ?? "",
      ETIQUETA_CONTRATACION[p.tipoContratacion],
      ETIQUETA_ESTATUS[p.estatusLaboral],
      p.correo,
    ]),
  };
}

/** Conserva búsqueda, filtros y orden del listado y quita la página: la descarga trae todo lo que coincide. */
export function enlaceExportacionProfesores(definicion: DefinicionListado, consulta: ConsultaListado) {
  return enlaceListado(RUTA_EXPORTAR_PROFESORES, definicion, { ...consulta, pagina: 1 });
}
