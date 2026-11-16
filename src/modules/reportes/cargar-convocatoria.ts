import { prisma } from "@/lib/prisma";
import type { DictamenConvocatoria, Genero, HistorialSnii, ParticipacionReporte, ProgramaConvocatoria } from "./convocatoria";

const persona = { select: { genero: true, departamento: { select: { nombre: true } } } } as const;

function dia(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

// Lee las convocatorias y el historial SNII aprobado. El desglose se calcula después,
// en hechosConvocatoria, porque la promoción compara el nivel con el dictamen anterior.
export async function cargarConvocatoria() {
  const [convocatorias, historial] = await Promise.all([
    prisma.convocatoria.findMany({
      select: {
        anio: true,
        programa: true,
        reconocimientosSnii: {
          select: {
            id: true, profesorId: true, resultado: true, tipoParticipacion: true, nivel: true, inicio: true, profesor: persona,
          },
        },
        reconocimientosProdep: {
          select: {
            id: true, profesorId: true, resultado: true, tipoSolicitud: true, inicio: true, profesor: persona,
          },
        },
        participaciones: { select: { profesorId: true, resultado: true, profesor: persona } },
      },
    }),
    prisma.reconocimientoSnii.findMany({
      where: { resultado: "APROBADO" },
      select: { id: true, profesorId: true, nivel: true, inicio: true },
    }),
  ]);

  const dictamenes: DictamenConvocatoria[] = [];
  const participaciones: ParticipacionReporte[] = [];
  for (const convocatoria of convocatorias) {
    const programa = convocatoria.programa as ProgramaConvocatoria;
    for (const fila of convocatoria.reconocimientosSnii) {
      dictamenes.push({
        id: fila.id,
        profesorId: fila.profesorId,
        programa,
        anio: convocatoria.anio,
        departamento: fila.profesor.departamento?.nombre ?? null,
        genero: fila.profesor.genero as Genero,
        resultado: fila.resultado,
        tipo: fila.tipoParticipacion,
        nivel: fila.nivel,
        inicio: dia(fila.inicio),
      });
    }
    for (const fila of convocatoria.reconocimientosProdep) {
      dictamenes.push({
        id: fila.id,
        profesorId: fila.profesorId,
        programa,
        anio: convocatoria.anio,
        departamento: fila.profesor.departamento?.nombre ?? null,
        genero: fila.profesor.genero as Genero,
        resultado: fila.resultado,
        tipo: fila.tipoSolicitud,
        nivel: null,
        inicio: dia(fila.inicio),
      });
    }
    for (const fila of convocatoria.participaciones) {
      participaciones.push({
        profesorId: fila.profesorId,
        programa,
        anio: convocatoria.anio,
        departamento: fila.profesor.departamento?.nombre ?? null,
        genero: fila.profesor.genero as Genero,
        resultado: fila.resultado,
      });
    }
  }

  const historialSnii: HistorialSnii[] = historial.map((fila) => ({
    id: fila.id, profesorId: fila.profesorId, nivel: fila.nivel, inicio: dia(fila.inicio),
  }));
  return { dictamenes, participaciones, historialSnii };
}
