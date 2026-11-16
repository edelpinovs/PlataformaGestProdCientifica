import { prisma } from "@/lib/prisma";
import { filaMatriz } from "./matriz";
import { inicioDelDiaUtc } from "./vigencias";

// Una fila por profesor. El corte de 10 y los filtros de departamento y programa
// se aplican después, en consultarMatriz.
export async function cargarMatriz() {
  const hoy = inicioDelDiaUtc(new Date());
  const [profesores, departamentos, programas] = await Promise.all([
    prisma.profesor.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        tipoContratacion: true,
        estatusLaboral: true,
        departamento: { select: { id: true, nombre: true } },
        grado: { select: { nombre: true } },
        programas: { select: { id: true, nombre: true } },
        reconocimientosSnii: {
          where: { resultado: "APROBADO" },
          select: { nivel: true, inicio: true, fin: true },
        },
        reconocimientosProdep: {
          where: { resultado: "APROBADO" },
          select: { inicio: true, fin: true },
        },
      },
    }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.programaEducativo.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return {
    departamentos,
    programas,
    filas: profesores.map((profesor) => filaMatriz({
      id: profesor.id,
      codigo: profesor.codigo,
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      tipoContratacion: profesor.tipoContratacion,
      estatusLaboral: profesor.estatusLaboral,
      departamento: profesor.departamento,
      grado: profesor.grado?.nombre ?? null,
      programas: profesor.programas,
      snii: profesor.reconocimientosSnii,
      prodep: profesor.reconocimientosProdep,
    }, hoy)),
  };
}
