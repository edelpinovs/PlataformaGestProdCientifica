import { z } from "zod";
import { admiteGoceDeSueldo, ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "./profesores";
import { ETIQUETAS_NIVEL_SNII, ETIQUETAS_PARTICIPACION_SNII, ETIQUETAS_RESULTADO_SNII } from "@/modules/reconocimientos/snii-listado";
import { ETIQUETAS_RESULTADO_PRODEP, ETIQUETAS_TIPO_SOLICITUD_PRODEP } from "@/modules/reconocimientos/prodep";
import { mostrarFechaPeriodo, type PeriodoProdepHistorial, type PeriodoSniiHistorial } from "@/modules/reconocimientos/historial";

// Detalle de solo lectura del directorio (issue 341). La página pide un profesor
// y esta función arma las secciones; no consulta la base.

export const VACIO_DETALLE = "—";

export const idDeDetalle = z
  .string({ error: "Ese detalle no es válido." })
  .regex(/^[1-9]\d*$/, "Ese detalle no es válido.")
  .transform(Number)
  .pipe(z.number({ error: "Ese detalle no es válido." }).int().max(2147483647, "Ese detalle no es válido."));

export type CampoDetalle = { etiqueta: string; valor: string; pendiente?: boolean };
export type SeccionDetalle = { titulo: string; campos: CampoDetalle[] };

export type DatosDetalleProfesor = {
  codigo: string;
  nombres: string;
  apellidos: string;
  correo: string;
  genero: "M" | "F" | "PENDIENTE";
  tipoContratacion: keyof typeof ETIQUETA_CONTRATACION;
  estatusLaboral: keyof typeof ETIQUETA_ESTATUS;
  goceDeSueldo: boolean;
  grado: { nombre: string; nomenclatura: string } | null;
  departamento: { nombre: string; division: string | null } | null;
  cvu: string | null;
  orcid: string | null;
  scopusId: string | null;
  scholarId: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  perfil: boolean;
  reconocimientosSnii: number;
  reconocimientosProdep: number;
  historialSnii: PeriodoSniiHistorial[];
  historialProdep: PeriodoProdepHistorial[];
  cuerpos: number;
  liderazgos: number;
  lgacs: number;
  participaciones: number;
  autorias: number;
  programas: number;
};

const GENERO = { M: "Masculino", F: "Femenino", PENDIENTE: "Pendiente" } as const;

function campo(etiqueta: string, valor: string, pendiente = false): CampoDetalle {
  return pendiente ? { etiqueta, valor, pendiente: true } : { etiqueta, valor };
}

function texto(valor: string | null | undefined) {
  const limpio = valor?.trim() ?? "";
  return limpio || VACIO_DETALLE;
}

function fecha(valor: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(valor);
}

export function subtituloDetalleProfesor(datos: Pick<DatosDetalleProfesor, "codigo" | "estatusLaboral">) {
  return `Código ${datos.codigo} · ${ETIQUETA_ESTATUS[datos.estatusLaboral]}`;
}

/** Secciones del modal. Un vacío se ve como «—» y un dato pendiente se marca para la etiqueta. */
export function seccionesDetalleProfesor(datos: DatosDetalleProfesor): SeccionDetalle[] {
  const goce = admiteGoceDeSueldo(datos.estatusLaboral) ? (datos.goceDeSueldo ? "Sí" : "No") : VACIO_DETALLE;
  const departamento = datos.departamento
    ? datos.departamento.division
      ? `${datos.departamento.nombre} (${datos.departamento.division})`
      : datos.departamento.nombre
    : VACIO_DETALLE;
  const grado = datos.grado ? `${datos.grado.nombre} (${datos.grado.nomenclatura})` : VACIO_DETALLE;

  return [
    {
      titulo: "Datos generales",
      campos: [
        { etiqueta: "Nombre", valor: `${datos.apellidos}, ${datos.nombres}` },
        { etiqueta: "Correo", valor: datos.correo },
        campo("Género", GENERO[datos.genero], datos.genero === "PENDIENTE"),
        campo("Contratación", ETIQUETA_CONTRATACION[datos.tipoContratacion], datos.tipoContratacion === "PENDIENTE"),
        { etiqueta: "Estatus laboral", valor: ETIQUETA_ESTATUS[datos.estatusLaboral] },
        { etiqueta: "Goce de sueldo", valor: goce },
      ],
    },
    {
      titulo: "Adscripción",
      campos: [
        { etiqueta: "Departamento", valor: departamento },
        { etiqueta: "Grado científico", valor: grado },
      ],
    },
    {
      titulo: "Identificadores",
      campos: [
        { etiqueta: "CVU", valor: texto(datos.cvu) },
        { etiqueta: "ORCID", valor: texto(datos.orcid) },
        { etiqueta: "Scopus", valor: texto(datos.scopusId) },
        { etiqueta: "Google Scholar", valor: texto(datos.scholarId) },
      ],
    },
    {
      titulo: "Relacionado",
      campos: [
        { etiqueta: "SNII", valor: String(datos.reconocimientosSnii) },
        { etiqueta: "PRODEP", valor: String(datos.reconocimientosProdep) },
        { etiqueta: "Cuerpos académicos", valor: String(datos.cuerpos) },
        { etiqueta: "Cuerpos que lidera", valor: String(datos.liderazgos) },
        { etiqueta: "LGAC", valor: String(datos.lgacs) },
        { etiqueta: "Participaciones", valor: String(datos.participaciones) },
        { etiqueta: "Autorías", valor: String(datos.autorias) },
        { etiqueta: "Programas educativos", valor: String(datos.programas) },
        { etiqueta: "Perfil de acceso", valor: datos.perfil ? "Sí" : "No" },
      ],
    },
    {
      titulo: "Historial SNII",
      campos: datos.historialSnii.length === 0
        ? [{ etiqueta: "Historial", valor: "No hay historial SNII registrado." }]
        : datos.historialSnii.flatMap((periodo, indice) => [
            { etiqueta: `Periodo ${indice + 1} · Inicio`, valor: mostrarFechaPeriodo(periodo.inicio) },
            { etiqueta: `Periodo ${indice + 1} · Fin`, valor: mostrarFechaPeriodo(periodo.fin) },
            { etiqueta: `Periodo ${indice + 1} · Nivel`, valor: ETIQUETAS_NIVEL_SNII[periodo.nivel] },
            { etiqueta: `Periodo ${indice + 1} · Participación`, valor: ETIQUETAS_PARTICIPACION_SNII[periodo.tipoParticipacion] },
            { etiqueta: `Periodo ${indice + 1} · Resultado`, valor: ETIQUETAS_RESULTADO_SNII[periodo.resultado] },
          ]),
    },
    {
      titulo: "Historial PRODEP",
      campos: datos.historialProdep.length === 0
        ? [{ etiqueta: "Historial", valor: "No hay historial PRODEP registrado." }]
        : datos.historialProdep.flatMap((periodo, indice) => [
            { etiqueta: `Periodo ${indice + 1} · Inicio`, valor: mostrarFechaPeriodo(periodo.inicio) },
            { etiqueta: `Periodo ${indice + 1} · Fin`, valor: mostrarFechaPeriodo(periodo.fin) },
            { etiqueta: `Periodo ${indice + 1} · Tipo`, valor: ETIQUETAS_TIPO_SOLICITUD_PRODEP[periodo.tipoSolicitud] },
            { etiqueta: `Periodo ${indice + 1} · Resultado`, valor: ETIQUETAS_RESULTADO_PRODEP[periodo.resultado] },
          ]),
    },
    {
      titulo: "Registro",
      campos: [
        { etiqueta: "Creado", valor: fecha(datos.creadoEn) },
        { etiqueta: "Actualizado", valor: fecha(datos.actualizadoEn) },
      ],
    },
  ];
}
