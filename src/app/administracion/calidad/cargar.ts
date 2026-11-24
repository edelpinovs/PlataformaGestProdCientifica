import { prisma } from "@/lib/prisma";
import { analizarCalidad, type Hallazgo } from "@/modules/administracion/calidad";

/** Lee los datos y calcula todos los hallazgos. La página y la exportación usan la misma lista. */
export async function cargarHallazgos(): Promise<Hallazgo[]> {
  const [profesores, cuerpos] = await Promise.all([
    prisma.profesor.findMany({
      select: { id: true, codigo: true, nombres: true, apellidos: true, estatusLaboral: true, orcid: true, scopusId: true, perfil: { select: { id: true } } },
    }),
    prisma.cuerpoAcademico.findMany({
      select: { id: true, clave: true, nombre: true, liderId: true, integrantes: { select: { profesorId: true } } },
    }),
  ]);
  return analizarCalidad({
    profesores: profesores.map(({ perfil: acceso, ...p }) => ({ ...p, tienePerfil: acceso !== null })),
    cuerpos: cuerpos.map(({ integrantes, ...c }) => ({ ...c, integrantes: integrantes.map((i) => i.profesorId) })),
  });
}
