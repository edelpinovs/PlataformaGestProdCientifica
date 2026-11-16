import { z } from "zod";
import {
  condicionTexto,
  ordenarPor,
  type ConsultaListado,
  type DefinicionListado,
} from "@/lib/listados/consulta";

export const TIPOS_SOLICITUD_PRODEP = ["PRIMER_RECONOCIMIENTO", "RENOVACION"] as const;
export const RESULTADOS_PRODEP = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;

export type RegistroHistorialProdep = {
  id?: number;
  tipoSolicitud: (typeof TIPOS_SOLICITUD_PRODEP)[number];
  resultado: (typeof RESULTADOS_PRODEP)[number];
  fechaInicio: string | Date;
  fechaFin: string | Date;
};

export type DatosVigenciaProdep = {
  tipoSolicitud: (typeof TIPOS_SOLICITUD_PRODEP)[number];
  resultado: (typeof RESULTADOS_PRODEP)[number];
  fechaInicio: string;
};

export type VigenciaProdep = {
  duracionAnios: 3 | 6;
  fechaFin: string;
  motivo: "primer-reconocimiento" | "historial-no-consolidado" | "renovacion-consolidada"
    | "dictamen-pendiente" | "dictamen-no-aprobado";
};

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function fechaComoTexto(fecha: string | Date) {
  return fecha instanceof Date ? fecha.toISOString().slice(0, 10) : fecha;
}

function sumarDias(fecha: string, dias: number) {
  const resultado = new Date(`${fecha}T00:00:00.000Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}

function calcularFin(fechaInicio: string, duracionAnios: 3 | 6) {
  const aniversario = new Date(`${fechaInicio}T00:00:00.000Z`);
  const diaInicio = aniversario.getUTCDate();
  aniversario.setUTCDate(1);
  aniversario.setUTCFullYear(aniversario.getUTCFullYear() + duracionAnios);
  const ultimoDiaDelMes = new Date(aniversario);
  ultimoDiaDelMes.setUTCMonth(ultimoDiaDelMes.getUTCMonth() + 1, 0);
  aniversario.setUTCDate(Math.min(diaInicio, ultimoDiaDelMes.getUTCDate()));
  aniversario.setUTCDate(aniversario.getUTCDate() - 1);
  return aniversario.toISOString().slice(0, 10);
}

function historialConsolidado(
  historial: RegistroHistorialProdep[],
  fechaInicio: string,
) {
  const anteriores = historial
    .map((registro) => ({
      ...registro,
      inicio: fechaComoTexto(registro.fechaInicio),
      fin: fechaComoTexto(registro.fechaFin),
    }))
    .filter((registro) => registro.fin < fechaInicio)
    .sort((a, b) => b.fin.localeCompare(a.fin) || b.inicio.localeCompare(a.inicio));

  let finEsperado = sumarDias(fechaInicio, -1);
  let tieneRenovacionPosterior = false;

  for (const registro of anteriores) {
    if (registro.fin !== finEsperado || registro.resultado !== "APROBADO") break;
    if (registro.tipoSolicitud === "RENOVACION") tieneRenovacionPosterior = true;
    if (registro.tipoSolicitud === "PRIMER_RECONOCIMIENTO" && tieneRenovacionPosterior) return true;
    finEsperado = sumarDias(registro.inicio, -1);
  }

  return false;
}

export function calcularVigenciaProdep(
  datos: DatosVigenciaProdep,
  historial: RegistroHistorialProdep[] = [],
): VigenciaProdep {
  if (!fechaValida(datos.fechaInicio)) {
    throw new Error("La fecha de inicio del reconocimiento PRODEP no es válida.");
  }

  const consolidada = datos.resultado === "APROBADO"
    && datos.tipoSolicitud === "RENOVACION"
    && historialConsolidado(historial, datos.fechaInicio);
  const duracionAnios = consolidada ? 6 : 3;
  const motivo: VigenciaProdep["motivo"] = datos.resultado !== "APROBADO"
    ? datos.resultado === "EN_RECONSIDERACION" ? "dictamen-pendiente" : "dictamen-no-aprobado"
    : datos.tipoSolicitud === "PRIMER_RECONOCIMIENTO"
      ? "primer-reconocimiento"
      : consolidada ? "renovacion-consolidada" : "historial-no-consolidado";

  return {
    duracionAnios,
    fechaFin: calcularFin(datos.fechaInicio, duracionAnios),
    motivo,
  };
}

const fechaProdep = z.string({ error: "Ingresa una fecha válida." })
  .refine(fechaValida, "Ingresa una fecha válida.");

export const camposReconocimientoProdep = z.object({
  profesorId: z.number({ error: "Selecciona un profesor." })
    .int("Selecciona un profesor.")
    .positive("Selecciona un profesor."),
  tipoSolicitud: z.enum(TIPOS_SOLICITUD_PRODEP, { error: "Selecciona un tipo de solicitud válido." }),
  resultado: z.enum(RESULTADOS_PRODEP, { error: "Selecciona un dictamen válido." }),
  fechaInicio: fechaProdep,
  fechaFin: fechaProdep,
});

export function crearEsquemaReconocimientoProdep(historial: RegistroHistorialProdep[] = []) {
  return camposReconocimientoProdep.superRefine((datos, contexto) => {
    if (!fechaValida(datos.fechaInicio) || !fechaValida(datos.fechaFin)) return;
    const vigencia = calcularVigenciaProdep(datos, historial);
    if (datos.fechaFin !== vigencia.fechaFin) {
      contexto.addIssue({
        code: "custom",
        path: ["fechaFin"],
        message: `La fecha de fin debe ser ${vigencia.fechaFin} para una vigencia de ${vigencia.duracionAnios} años.`,
      });
    }
  });
}

export type ReconocimientoProdep = z.infer<typeof camposReconocimientoProdep>;

export const COLUMNAS_PRODEP = [
  { clave: "profesor", texto: "Profesor" },
  { clave: "tipoSolicitud", texto: "Solicitud" },
  { clave: "inicio", texto: "Inicio" },
  { clave: "fin", texto: "Fin" },
  { clave: "resultado", texto: "Dictamen" },
] as const;

export const LISTADO_PRODEP: DefinicionListado = {
  columnas: COLUMNAS_PRODEP.map((columna) => columna.clave),
  ordenInicial: { columna: "fin", dir: "desc" },
  filtros: { resultado: RESULTADOS_PRODEP },
};

const ETIQUETAS_TIPO: Record<(typeof TIPOS_SOLICITUD_PRODEP)[number], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

const ETIQUETAS_RESULTADO: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export function filtrarReconocimientosProdep(consulta: ConsultaListado) {
  const buscar = consulta.q.trim();
  const filtroResultado = RESULTADOS_PRODEP.find((valor) => valor === consulta.filtros.resultado);
  const tipoSolicitud = TIPOS_SOLICITUD_PRODEP.find((tipo) =>
    tipo.toLowerCase() === buscar.toLowerCase()
      || ETIQUETAS_TIPO[tipo].toLowerCase() === buscar.toLowerCase());
  const resultado = RESULTADOS_PRODEP.find((valor) =>
    valor.toLowerCase() === buscar.toLowerCase()
      || ETIQUETAS_RESULTADO[valor].toLowerCase() === buscar.toLowerCase());
  const fecha = fechaValida(buscar) ? new Date(`${buscar}T00:00:00.000Z`) : undefined;

  return {
    ...(filtroResultado ? { resultado: filtroResultado } : {}),
    ...condicionTexto(buscar, (contiene) => [
      { profesor: { nombres: contiene } },
      { profesor: { apellidos: contiene } },
      { profesor: { codigo: contiene } },
      ...(tipoSolicitud ? [{ tipoSolicitud }] : []),
      ...(resultado ? [{ resultado }] : []),
      ...(fecha ? [{ inicio: fecha }, { fin: fecha }] : []),
    ]),
  };
}

export function ordenarReconocimientosProdep(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    profesor: (dir) => ({ profesor: { apellidos: dir, nombres: dir } }),
    tipoSolicitud: (dir) => ({ tipoSolicitud: dir }),
    inicio: (dir) => ({ inicio: dir }),
    fin: (dir) => ({ fin: dir }),
    resultado: (dir) => ({ resultado: dir }),
  });
}
