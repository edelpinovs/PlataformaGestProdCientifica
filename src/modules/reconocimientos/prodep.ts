import { z } from "zod";
import { condicionTexto, ordenarPor, type CondicionTexto, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import type { Prisma } from "@/generated/prisma/client";
import { porPalabras } from "./busqueda";
import { condicionEstatus, ESTATUS } from "./estatus";
import { hayTraslape, type PeriodoVigencia } from "./vigencia";

export const TIPOS_SOLICITUD_PRODEP = ["PRIMER_RECONOCIMIENTO", "RENOVACION"] as const;
export const RESULTADOS_PRODEP = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;
export const MENSAJE_PRODEP_REQUIERE_TIEMPO_COMPLETO = "El Perfil Deseable PRODEP requiere Tiempo Completo.";

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const fechaProdep = z.string({ error: "Ingresa una fecha válida." })
  .refine(fechaValida, "Ingresa una fecha válida.");

export const camposReconocimientoProdep = z.object({
  profesorId: z.number({ error: "Selecciona un profesor." })
    .int("Selecciona un profesor.")
    .positive("Selecciona un profesor."),
  tipoSolicitud: z.enum(TIPOS_SOLICITUD_PRODEP, { error: "Selecciona un tipo de solicitud válido." }),
  resultado: z.enum(RESULTADOS_PRODEP, { error: "Selecciona un resultado válido." }),
  fechaInicio: fechaProdep,
  fechaFin: fechaProdep,
});

export const reconocimientoProdep = camposReconocimientoProdep.superRefine((datos, contexto) => {
  if (fechaValida(datos.fechaInicio) && fechaValida(datos.fechaFin) && datos.fechaInicio >= datos.fechaFin) {
    contexto.addIssue({
      code: "custom",
      path: ["fechaFin"],
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    });
  }
});

export type ReconocimientoProdep = z.infer<typeof reconocimientoProdep>;

// ─── RF-010 (CU-006): vigencia de 3 o 6 años ───────────────────────────────

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

/** Esquema del alta y la edición: además de los campos, la fecha de fin debe ser la que corresponde al historial. */
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

/** Explica a la persona por qué se aplican tres o seis años. */
export function textoVigenciaProdep(vigencia: VigenciaProdep) {
  switch (vigencia.motivo) {
    case "renovacion-consolidada":
      return "El primer reconocimiento y la renovación previos están aprobados y sin brechas; a esta renovación aprobada se le aplican seis años.";
    case "primer-reconocimiento":
      return "Primer reconocimiento: se aplican tres años de vigencia.";
    case "dictamen-pendiente":
      return "Mientras el dictamen no esté aprobado, se aplican tres años; la renovación consolidada requiere aprobación.";
    case "dictamen-no-aprobado":
      return "El dictamen no aprobado no otorga vigencia ni consolida renovaciones; el registro conserva el cálculo de tres años.";
    default:
      return "No hay una secuencia consolidada de renovaciones aprobadas sin interrupciones: se aplican tres años.";
  }
}

// ─── RF-011 (CU-006): periodos de vigencia que no se traslapan ──────────────

export type PeriodoProdep = PeriodoVigencia & { resultado: (typeof RESULTADOS_PRODEP)[number] };

/**
 * Devuelve el periodo existente con el que choca el nuevo, o null. Un dictamen no aprobado no
 * otorga vigencia: ni se compara ni cuenta como periodo existente. El día límite compartido sí
 * es traslape; al editar, el propio registro (`excluirId`) no choca consigo mismo.
 */
export function hayTraslapeProdep(
  existentes: PeriodoProdep[],
  nuevo: PeriodoProdep,
  excluirId?: number,
): PeriodoVigencia | null {
  if (nuevo.resultado === "NO_APROBADO") return null;
  return hayTraslape(
    existentes.filter((periodo) => periodo.resultado !== "NO_APROBADO"),
    nuevo,
    excluirId,
  );
}

export type ResumenVigenciaProdep = {
  resultado: string;
  inicio: Date;
  fin: Date;
};

function diaUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

export const MENSAJE_PRODEP_CONTRATACION_PENDIENTE =
  "Primero registra el tipo de contratación de la persona (hoy está pendiente). El Perfil Deseable PRODEP requiere Tiempo Completo.";

export function validarContratacionProdep(tipoContratacion: string | null | undefined): string | null {
  if (tipoContratacion === "TIEMPO_COMPLETO") return null;
  return tipoContratacion === "PENDIENTE" ? MENSAJE_PRODEP_CONTRATACION_PENDIENTE : MENSAJE_PRODEP_REQUIERE_TIEMPO_COMPLETO;
}

export function tieneProdepActivo(reconocimientos: readonly ResumenVigenciaProdep[], hoy: Date): boolean {
  const dia = diaUtc(hoy);
  return reconocimientos.some(
    (reconocimiento) => reconocimiento.resultado === "APROBADO"
      && diaUtc(reconocimiento.inicio) <= dia
      && diaUtc(reconocimiento.fin) >= dia,
  );
}

export const LISTADO_PRODEP: DefinicionListado = {
  columnas: ["profesor", "tipoSolicitud", "resultado", "inicio", "fin", "estatus"],
  ordenInicial: { columna: "profesor", dir: "asc" },
  filtros: {
    tipoSolicitud: TIPOS_SOLICITUD_PRODEP,
    resultado: RESULTADOS_PRODEP,
    // Issue 248: deja ver los próximos a vencer.
    estatus: ESTATUS,
  },
};

export const COLUMNAS_PRODEP = [
  { clave: "profesor", texto: "Profesor" },
  { clave: "tipoSolicitud", texto: "Tipo de solicitud" },
  { clave: "resultado", texto: "Resultado" },
  { clave: "inicio", texto: "Inicio" },
  { clave: "fin", texto: "Fin" },
  { clave: "estatus", texto: "Estatus" },
];

export const ETIQUETAS_TIPO_SOLICITUD_PRODEP: Record<(typeof TIPOS_SOLICITUD_PRODEP)[number], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

export const ETIQUETAS_RESULTADO_PRODEP: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

/** Año («2026»), mes («2026-01») o día buscado, como rango de fechas; null si el texto no es una fecha. También lo usa SNII. */
export function rangoFechaBusqueda(texto: string): { desde: Date; hasta: Date } | null {
  if (/^\d{4}$/.test(texto)) {
    const anio = Number(texto);
    if (anio < 1 || anio > 9999) return null;
    return {
      desde: new Date(`${texto}-01-01T00:00:00.000Z`),
      hasta: new Date(`${String(anio + 1).padStart(4, "0")}-01-01T00:00:00.000Z`),
    };
  }
  if (/^\d{4}-\d{2}$/.test(texto)) {
    const [anio, mes] = texto.split("-").map(Number);
    if (anio < 1 || mes < 1 || mes > 12) return null;
    const desde = new Date(`${texto}-01T00:00:00.000Z`);
    const siguienteMes = mes === 12
      ? `${String(anio + 1).padStart(4, "0")}-01`
      : `${String(anio).padStart(4, "0")}-${String(mes + 1).padStart(2, "0")}`;
    return { desde, hasta: new Date(`${siguienteMes}-01T00:00:00.000Z`) };
  }
  if (!fechaValida(texto)) return null;
  const desde = new Date(`${texto}T00:00:00.000Z`);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}

/** `hoy` es el día de la consulta (00:00 UTC): con él se calcula el estatus que se filtra. */
export function filtroProdep(consulta: ConsultaListado, hoy: Date = new Date()): Prisma.ReconocimientoProdepWhereInput {
  const camposProfesor = (contiene: CondicionTexto): Prisma.ReconocimientoProdepWhereInput[] => [
    { profesor: { is: { nombres: contiene } } },
    { profesor: { is: { apellidos: contiene } } },
    { profesor: { is: { codigo: contiene } } },
  ];
  const texto = condicionTexto(consulta.q, camposProfesor);
  const criterios: Prisma.ReconocimientoProdepWhereInput[] = [...(texto.OR ?? [])];
  // Nombre completo («Ana Prueba»): cada palabra en algún dato del profesor (revisión del PR 433).
  const nombreCompleto = porPalabras(consulta.q, camposProfesor);
  if (nombreCompleto) criterios.push(nombreCompleto);
  const busqueda = consulta.q.trim().toLocaleLowerCase("es-MX");
  const rangoFecha = rangoFechaBusqueda(consulta.q.trim());

  if (rangoFecha) {
    criterios.push(
      { inicio: { gte: rangoFecha.desde, lt: rangoFecha.hasta } },
      { fin: { gte: rangoFecha.desde, lt: rangoFecha.hasta } },
    );
  }
  for (const tipo of TIPOS_SOLICITUD_PRODEP) {
    if (busqueda && (tipo.toLocaleLowerCase("es-MX").includes(busqueda)
      || ETIQUETAS_TIPO_SOLICITUD_PRODEP[tipo].toLocaleLowerCase("es-MX").includes(busqueda))) {
      criterios.push({ tipoSolicitud: tipo });
    }
  }
  for (const resultado of RESULTADOS_PRODEP) {
    if (busqueda && (resultado.toLocaleLowerCase("es-MX").includes(busqueda)
      || ETIQUETAS_RESULTADO_PRODEP[resultado].toLocaleLowerCase("es-MX").includes(busqueda))) {
      criterios.push({ resultado });
    }
  }

  const tipoSolicitud = TIPOS_SOLICITUD_PRODEP.find((tipo) => tipo === consulta.filtros.tipoSolicitud);
  const resultado = RESULTADOS_PRODEP.find((valor) => valor === consulta.filtros.resultado);
  const estatus = ESTATUS.find((valor) => valor === consulta.filtros.estatus);

  return {
    ...(criterios.length ? { OR: criterios } : {}),
    ...(tipoSolicitud ? { tipoSolicitud } : {}),
    ...(resultado ? { resultado } : {}),
    // Con AND, para no pisar el filtro de resultado.
    ...(estatus ? { AND: [condicionEstatus(estatus, hoy)] } : {}),
  };
}

export function ordenProdep(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    profesor: (dir) => ({ profesor: { apellidos: dir } }),
    tipoSolicitud: (dir) => ({ tipoSolicitud: dir }),
    resultado: (dir) => ({ resultado: dir }),
    inicio: (dir) => ({ inicio: dir }),
    fin: (dir) => ({ fin: dir }),
    // El estatus sale de la fecha de fin: ordenar por él es ordenar por esa fecha.
    estatus: (dir) => ({ fin: dir }),
  });
}
