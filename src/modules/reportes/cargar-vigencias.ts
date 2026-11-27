import { prisma } from "@/lib/prisma";
import {
  cuentaParaSemaforo,
  filaCuerpo,
  filaProdep,
  filaSnii,
  inicioDelDiaUtc,
  type FilaVigencia,
  type TipoDistincion,
} from "./vigencias";

const persona = {
  select: {
    nombres: true,
    apellidos: true,
    departamento: { select: { id: true, nombre: true } },
  },
} as const;

export async function cargarDepartamentos() {
  return prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
}

// Une SNII, PRODEP y cuerpos en filas de reporte. El corte de 10 ocurre después,
// en consultarVigencias, porque el estatus y las columnas las elige quien arma el reporte.
export async function cargarVigencias(tipos: TipoDistincion[]): Promise<FilaVigencia[]> {
  if (tipos.length === 0) return [];
  const hoy = inicioDelDiaUtc(new Date());
  const [snii, prodep, cuerpos] = await Promise.all([
    tipos.includes("SNII")
      ? prisma.reconocimientoSnii.findMany({
          where: { resultado: { in: ["APROBADO", "EN_RECONSIDERACION"] } },
          select: { id: true, nivel: true, resultado: true, inicio: true, fin: true, profesor: persona },
        })
      : [],
    tipos.includes("PRODEP")
      ? prisma.reconocimientoProdep.findMany({
          where: { resultado: { in: ["APROBADO", "EN_RECONSIDERACION"] } },
          select: { id: true, tipoSolicitud: true, resultado: true, inicio: true, fin: true, profesor: persona },
        })
      : [],
    tipos.includes("CA")
      ? prisma.cuerpoAcademico.findMany({
          select: {
            id: true,
            clave: true,
            nombre: true,
            nivel: true,
            anioRegistro: true,
            anioVencimiento: true,
            departamento: { select: { id: true, nombre: true } },
          },
        })
      : [],
  ]);

  return [
    ...snii.filter((fila) => cuentaParaSemaforo(fila.resultado)).map((fila) => filaSnii({
      id: fila.id,
      nivel: fila.nivel,
      resultado: fila.resultado,
      inicio: fila.inicio,
      fin: fila.fin,
      nombres: fila.profesor.nombres,
      apellidos: fila.profesor.apellidos,
      departamento: fila.profesor.departamento?.nombre ?? null,
      departamentoId: fila.profesor.departamento?.id ?? null,
    }, hoy)),
    ...prodep.filter((fila) => cuentaParaSemaforo(fila.resultado)).map((fila) => filaProdep({
      id: fila.id,
      tipoSolicitud: fila.tipoSolicitud,
      resultado: fila.resultado,
      inicio: fila.inicio,
      fin: fila.fin,
      nombres: fila.profesor.nombres,
      apellidos: fila.profesor.apellidos,
      departamento: fila.profesor.departamento?.nombre ?? null,
      departamentoId: fila.profesor.departamento?.id ?? null,
    }, hoy)),
    ...cuerpos.map((fila) => filaCuerpo({
      id: fila.id,
      clave: fila.clave,
      nombre: fila.nombre,
      nivel: fila.nivel,
      anioRegistro: fila.anioRegistro,
      anioVencimiento: fila.anioVencimiento,
      departamento: fila.departamento.nombre,
      departamentoId: fila.departamento.id,
    }, hoy)),
  ];
}
