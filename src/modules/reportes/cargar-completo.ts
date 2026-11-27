import { prisma } from "@/lib/prisma";
import { filaCompleto } from "./completo";
import { inicioDelDiaUtc } from "./vigencias";

// Una fila por profesor con directorio, distinciones, cuerpos, convocatorias
// y publicaciones validadas. El corte de 10 se aplica en consultarCompleto.
export async function cargarCompleto() {
  const hoy = inicioDelDiaUtc(new Date());
  const [profesores, departamentos, programas] = await Promise.all([
    prisma.profesor.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        correo: true,
        cvu: true,
        genero: true,
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
        cuerposAcademicos: {
          select: { cuerpo: { select: { nombre: true, anioVencimiento: true } } },
        },
        participaciones: {
          select: { resultado: true, convocatoria: { select: { programa: true, anio: true } } },
        },
        autorias: {
          where: { estado: "VALIDADA" },
          select: { publicacion: { select: { titulo: true } } },
        },
      },
    }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.programaEducativo.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return {
    departamentos,
    programas,
    filas: profesores.map((profesor) => filaCompleto({
      id: profesor.id,
      codigo: profesor.codigo,
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      correo: profesor.correo,
      cvu: profesor.cvu,
      genero: profesor.genero,
      tipoContratacion: profesor.tipoContratacion,
      estatusLaboral: profesor.estatusLaboral,
      departamento: profesor.departamento,
      grado: profesor.grado?.nombre ?? null,
      programas: profesor.programas,
      snii: profesor.reconocimientosSnii,
      prodep: profesor.reconocimientosProdep,
      cuerpos: profesor.cuerposAcademicos.map((integrante) => integrante.cuerpo),
      participaciones: profesor.participaciones.map((fila) => ({
        programa: fila.convocatoria.programa,
        anio: fila.convocatoria.anio,
        resultado: fila.resultado,
      })),
      publicaciones: profesor.autorias.map((autoria) => autoria.publicacion.titulo),
    }, hoy)),
  };
}
