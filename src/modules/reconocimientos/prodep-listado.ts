import type { Prisma } from "@/generated/prisma/client";
import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { RESULTADOS_PRODEP, TIPOS_SOLICITUD_PRODEP } from "./prodep";

export const LISTADO_PRODEP: DefinicionListado = {
  columnas: ["profesor", "tipoSolicitud", "resultado", "inicio", "fin"],
  ordenInicial: { columna: "fin", dir: "desc" },
  filtros: {
    tipoSolicitud: TIPOS_SOLICITUD_PRODEP,
    resultado: RESULTADOS_PRODEP,
  },
};

export const COLUMNAS_PRODEP = [
  { clave: "profesor", texto: "Profesor" },
  { clave: "tipoSolicitud", texto: "Solicitud" },
  { clave: "resultado", texto: "Resultado" },
  { clave: "inicio", texto: "Inicio" },
  { clave: "fin", texto: "Fin" },
];

const TIPOS_BUSQUEDA: Record<string, (typeof TIPOS_SOLICITUD_PRODEP)[number]> = {
  "primer reconocimiento": "PRIMER_RECONOCIMIENTO",
  renovación: "RENOVACION",
};

const RESULTADOS_BUSQUEDA: Record<string, (typeof RESULTADOS_PRODEP)[number]> = {
  aprobado: "APROBADO",
  "no aprobado": "NO_APROBADO",
  "en reconsideración": "EN_RECONSIDERACION",
};

function fechaBusqueda(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto ? fecha : null;
}

function anioBusqueda(texto: string): number | null {
  return /^\d{4}$/.test(texto) && Number(texto) >= 1 ? Number(texto) : null;
}

export function filtroProdep(consulta: ConsultaListado): Prisma.ReconocimientoProdepWhereInput {
  const texto = consulta.q.trim();
  if (!texto) return {};

  const condiciones: Prisma.ReconocimientoProdepWhereInput[] = [
    ...(condicionTexto(texto, (contiene) => [
      { profesor: { codigo: contiene } },
      { profesor: { nombres: contiene } },
      { profesor: { apellidos: contiene } },
    ]).OR ?? []),
  ];
  const minusculas = texto.toLocaleLowerCase("es-MX");
  const tipoSolicitud = TIPOS_BUSQUEDA[minusculas];
  const resultado = RESULTADOS_BUSQUEDA[minusculas];
  if (tipoSolicitud) condiciones.push({ tipoSolicitud });
  if (resultado) condiciones.push({ resultado });

  const fecha = fechaBusqueda(texto);
  if (fecha) {
    condiciones.push({ inicio: { lte: fecha }, fin: { gte: fecha } });
  } else {
    const anio = anioBusqueda(texto);
    if (anio) {
      const inicioAnio = new Date(`${anio}-01-01T00:00:00.000Z`);
      const inicioAnioSiguiente = new Date(`${anio + 1}-01-01T00:00:00.000Z`);
      condiciones.push({ inicio: { lt: inicioAnioSiguiente }, fin: { gte: inicioAnio } });
    }
  }

  return { OR: condiciones };
}

export function ordenProdep(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    profesor: (dir) => ({ profesor: { apellidos: dir } }),
    tipoSolicitud: (dir) => ({ tipoSolicitud: dir }),
    resultado: (dir) => ({ resultado: dir }),
    inicio: (dir) => ({ inicio: dir }),
    fin: (dir) => ({ fin: dir }),
  });
}
