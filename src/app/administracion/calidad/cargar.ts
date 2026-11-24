import { prisma } from "@/lib/prisma";
import {
  analizarCalidad,
  hallazgosVigenciasVencidas,
  ultimoPeriodoPorPersona,
  type Hallazgo,
} from "@/modules/administracion/calidad";
import { cargarVigencias } from "@/modules/reportes/cargar-vigencias";
import { filaProdep, filaSnii, inicioDelDiaUtc } from "@/modules/reportes/vigencias";

const persona = {
  select: { nombres: true, apellidos: true, departamento: { select: { nombre: true } } },
} as const;

/** Lee los datos y calcula todos los hallazgos. La página y la exportación usan la misma lista. */
export async function cargarHallazgos(): Promise<Hallazgo[]> {
  const hoy = inicioDelDiaUtc(new Date());
  // SNII y PRODEP se leen aquí con `profesorId` para quedarse con el último periodo de cada persona;
  // las filas se arman con las funciones de Reportes. Los cuerpos tienen un solo periodo cada uno.
  const [profesores, cuerpos, snii, prodep, vigenciasCuerpos] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, codigo: true, nombres: true, apellidos: true, estatusLaboral: true, orcid: true, scopusId: true, perfil: { select: { id: true } } },
    }),
    prisma.cuerpoAcademico.findMany({
      select: { id: true, clave: true, nombre: true, liderId: true, integrantes: { select: { profesorId: true } } },
    }),
    prisma.reconocimientoSnii.findMany({
      select: { id: true, profesorId: true, nivel: true, resultado: true, inicio: true, fin: true, profesor: persona },
    }),
    prisma.reconocimientoProdep.findMany({
      select: { id: true, profesorId: true, tipoSolicitud: true, resultado: true, inicio: true, fin: true, profesor: persona },
    }),
    cargarVigencias(["CA"]),
  ]);
  const datosPersona = (p: (typeof snii)[number]["profesor"]) =>
    ({ nombres: p.nombres, apellidos: p.apellidos, departamento: p.departamento?.nombre ?? null });
  const vigencias = [
    ...ultimoPeriodoPorPersona(snii).map(({ profesor, ...r }) => filaSnii({ ...r, ...datosPersona(profesor) }, hoy)),
    ...ultimoPeriodoPorPersona(prodep).map(({ profesor, ...r }) => filaProdep({ ...r, ...datosPersona(profesor) }, hoy)),
    ...vigenciasCuerpos,
  ];
  return [...analizarCalidad({
    profesores: profesores.map(({ perfil: acceso, ...p }) => ({ ...p, tienePerfil: acceso !== null })),
    cuerpos: cuerpos.map(({ integrantes, ...c }) => ({ ...c, integrantes: integrantes.map((i) => i.profesorId) })),
  }), ...hallazgosVigenciasVencidas(vigencias)];
}
