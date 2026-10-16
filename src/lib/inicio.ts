import type { Rol } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { calcularSemaforo, type Semaforo } from "@/modules/reportes/semaforo";

export type FilaVigencia = {
  id: string;
  profesor: string;
  programa: "SNII" | "PRODEP";
  detalle: string;
  vence: string;
  semaforo: Semaforo;
};

export type NivelInicio = {
  clave: string;
  etiqueta: string;
  total: number;
  color: string;
};

export type DatosInicio = {
  anio: number;
  profesores: number;
  sniiVigentes: number;
  prodepActivos: number;
  cuerpos: number;
  produccionPorMes: number[];
  vigenciasPorMes: number[];
  filas: FilaVigencia[];
  niveles: NivelInicio[];
  muestraNombres: boolean;
};

const ETIQUETA_NIVEL: Record<string, string> = {
  CANDIDATO: "Candidato",
  NIVEL_1: "Nivel I",
  NIVEL_2: "Nivel II",
  NIVEL_3: "Nivel III",
  EMERITO: "Emérito",
  NO_APROBADO: "No aprobado",
};

const COLOR_NIVEL: Record<string, string> = {
  CANDIDATO: "#C4B5FD",
  NIVEL_1: "#443CDE",
  NIVEL_2: "#7C6BF2",
  NIVEL_3: "#2C4D41",
  EMERITO: "#A05A29",
  NO_APROBADO: "#D4D0E4",
};

const ETIQUETA_PRODEP: Record<string, string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

const ORDEN_NIVEL = ["CANDIDATO", "NIVEL_1", "NIVEL_2", "NIVEL_3", "EMERITO", "NO_APROBADO"];

function diaUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

function contarMeses(fechas: Array<Date | null>, anio: number) {
  const meses = Array.from({ length: 12 }, () => 0);
  for (const fecha of fechas) {
    if (fecha && fecha.getUTCFullYear() === anio) meses[fecha.getUTCMonth()] += 1;
  }
  return meses;
}

function formatoFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

// Resumen del inicio: conteos institucionales y, para coordinación, las vigencias próximas.
export async function cargarInicio(rol: Rol): Promise<DatosInicio> {
  const hoy = diaUtc(new Date());
  const anio = hoy.getUTCFullYear();
  const desde = new Date(Date.UTC(anio, 0, 1));
  const hasta = new Date(Date.UTC(anio + 1, 0, 1));
  const muestraNombres = rol !== "DOCENTE";
  const vigente = { resultado: "APROBADO" as const, inicio: { lte: hoy }, fin: { gte: hoy } };

  const [
    profesores,
    sniiVigentes,
    prodepActivos,
    cuerpos,
    publicaciones,
    finesSnii,
    finesProdep,
    niveles,
    proximosSnii,
    proximosProdep,
  ] = await Promise.all([
    prisma.profesor.count(),
    prisma.reconocimientoSnii.count({ where: vigente }),
    prisma.reconocimientoProdep.count({ where: vigente }),
    prisma.cuerpoAcademico.count(),
    prisma.publicacion.findMany({
      where: { fechaPublicacion: { gte: desde, lt: hasta } },
      select: { fechaPublicacion: true },
    }),
    prisma.reconocimientoSnii.findMany({
      where: { resultado: "APROBADO", fin: { gte: desde, lt: hasta } },
      select: { fin: true },
    }),
    prisma.reconocimientoProdep.findMany({
      where: { resultado: "APROBADO", fin: { gte: desde, lt: hasta } },
      select: { fin: true },
    }),
    prisma.reconocimientoSnii.groupBy({
      by: ["nivel"],
      where: vigente,
      _count: { _all: true },
    }),
    muestraNombres
      ? prisma.reconocimientoSnii.findMany({
          where: { resultado: "APROBADO", fin: { gte: hoy } },
          orderBy: { fin: "asc" },
          take: 8,
          include: { profesor: { select: { nombres: true, apellidos: true } } },
        })
      : Promise.resolve([]),
    muestraNombres
      ? prisma.reconocimientoProdep.findMany({
          where: { resultado: "APROBADO", fin: { gte: hoy } },
          orderBy: { fin: "asc" },
          take: 8,
          include: { profesor: { select: { nombres: true, apellidos: true } } },
        })
      : Promise.resolve([]),
  ]);

  const filas = [
    ...proximosSnii.map((r) => ({
      id: `snii-${r.id}`,
      profesor: `${r.profesor.nombres} ${r.profesor.apellidos}`,
      programa: "SNII" as const,
      detalle: ETIQUETA_NIVEL[r.nivel] ?? r.nivel,
      vence: formatoFecha(r.fin),
      semaforo: calcularSemaforo(r.fin, hoy),
      orden: r.fin.getTime(),
    })),
    ...proximosProdep.map((r) => ({
      id: `prodep-${r.id}`,
      profesor: `${r.profesor.nombres} ${r.profesor.apellidos}`,
      programa: "PRODEP" as const,
      detalle: ETIQUETA_PRODEP[r.tipoSolicitud] ?? r.tipoSolicitud,
      vence: formatoFecha(r.fin),
      semaforo: calcularSemaforo(r.fin, hoy),
      orden: r.fin.getTime(),
    })),
  ]
    .sort((a, b) => a.orden - b.orden)
    .slice(0, 8)
    .map((fila) => ({
      id: fila.id,
      profesor: fila.profesor,
      programa: fila.programa,
      detalle: fila.detalle,
      vence: fila.vence,
      semaforo: fila.semaforo,
    }));

  return {
    anio,
    profesores,
    sniiVigentes,
    prodepActivos,
    cuerpos,
    produccionPorMes: contarMeses(
      publicaciones.map((p) => p.fechaPublicacion),
      anio,
    ),
    vigenciasPorMes: contarMeses(
      [...finesSnii, ...finesProdep].map((r) => r.fin),
      anio,
    ),
    filas,
    niveles: ORDEN_NIVEL.flatMap((clave) => {
      const grupo = niveles.find((n) => n.nivel === clave);
      if (!grupo || grupo._count._all === 0) return [];
      return [{
        clave,
        etiqueta: ETIQUETA_NIVEL[clave] ?? clave,
        total: grupo._count._all,
        color: COLOR_NIVEL[clave] ?? "#443CDE",
      }];
    }),
    muestraNombres,
  };
}
