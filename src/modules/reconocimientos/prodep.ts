import { z } from "zod";
import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import type { Prisma } from "@/generated/prisma/client";

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

export const reconocimientoProdep = z.object({
  profesorId: z.number({ error: "Selecciona un profesor." })
    .int("Selecciona un profesor.")
    .positive("Selecciona un profesor."),
  tipoSolicitud: z.enum(TIPOS_SOLICITUD_PRODEP, { error: "Selecciona un tipo de solicitud válido." }),
  resultado: z.enum(RESULTADOS_PRODEP, { error: "Selecciona un resultado válido." }),
  fechaInicio: fechaProdep,
  fechaFin: fechaProdep,
}).superRefine((datos, contexto) => {
  if (fechaValida(datos.fechaInicio) && fechaValida(datos.fechaFin) && datos.fechaInicio >= datos.fechaFin) {
    contexto.addIssue({
      code: "custom",
      path: ["fechaFin"],
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    });
  }
});

export type ReconocimientoProdep = z.infer<typeof reconocimientoProdep>;

export type ResumenVigenciaProdep = {
  resultado: string;
  inicio: Date;
  fin: Date;
};

function diaUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

export function validarContratacionProdep(tipoContratacion: string | null | undefined): string | null {
  return tipoContratacion === "TIEMPO_COMPLETO" ? null : MENSAJE_PRODEP_REQUIERE_TIEMPO_COMPLETO;
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
  columnas: ["profesor", "tipoSolicitud", "resultado", "inicio", "fin"],
  ordenInicial: { columna: "profesor", dir: "asc" },
  filtros: {
    tipoSolicitud: TIPOS_SOLICITUD_PRODEP,
    resultado: RESULTADOS_PRODEP,
  },
};

export const COLUMNAS_PRODEP = [
  { clave: "profesor", texto: "Profesor" },
  { clave: "tipoSolicitud", texto: "Tipo de solicitud" },
  { clave: "resultado", texto: "Resultado" },
  { clave: "inicio", texto: "Inicio" },
  { clave: "fin", texto: "Fin" },
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

function rangoFechaBusqueda(texto: string): { desde: Date; hasta: Date } | null {
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

export function filtroProdep(consulta: ConsultaListado): Prisma.ReconocimientoProdepWhereInput {
  const texto = condicionTexto(consulta.q, (contiene) => [
    { profesor: { is: { nombres: contiene } } },
    { profesor: { is: { apellidos: contiene } } },
    { profesor: { is: { codigo: contiene } } },
  ]);
  const criterios: Prisma.ReconocimientoProdepWhereInput[] = [...(texto.OR ?? [])];
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

  return {
    ...(criterios.length ? { OR: criterios } : {}),
    ...(tipoSolicitud ? { tipoSolicitud } : {}),
    ...(resultado ? { resultado } : {}),
  };
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
