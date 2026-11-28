import { ETIQUETAS_NIVEL_SNII, ETIQUETAS_PARTICIPACION_SNII, ETIQUETAS_RESULTADO_SNII } from "./snii-listado";
import { ETIQUETAS_RESULTADO_PRODEP, ETIQUETAS_TIPO_SOLICITUD_PRODEP } from "./prodep";

export type PeriodoSniiHistorial = {
  id: number;
  nivel: keyof typeof ETIQUETAS_NIVEL_SNII;
  tipoParticipacion: keyof typeof ETIQUETAS_PARTICIPACION_SNII;
  resultado: keyof typeof ETIQUETAS_RESULTADO_SNII;
  inicio: Date;
  fin: Date;
};

export type PeriodoProdepHistorial = {
  id: number;
  tipoSolicitud: keyof typeof ETIQUETAS_TIPO_SOLICITUD_PRODEP;
  resultado: keyof typeof ETIQUETAS_RESULTADO_PRODEP;
  inicio: Date;
  fin: Date;
};

function porInicio<T extends { id: number; inicio: Date; fin: Date }>(periodos: readonly T[]) {
  return [...periodos].sort((a, b) =>
    a.inicio.getTime() - b.inicio.getTime()
    || a.fin.getTime() - b.fin.getTime()
    || a.id - b.id,
  );
}

export function ordenarPeriodosSnii(periodos: readonly PeriodoSniiHistorial[]) {
  return porInicio(periodos);
}

export function ordenarPeriodosProdep(periodos: readonly PeriodoProdepHistorial[]) {
  return porInicio(periodos);
}

export function mostrarFechaPeriodo(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

