// Repositorio de base de datos para Producción Científica (RF-020, RF-021, RF-022, RNF-004).
// Ubicado en src/app/produccion/ para mantener src/modules/ con funciones puras sin dependencias de prisma.
import { prisma } from "@/lib/prisma";
import type {
  FuentePublicacion,
  PublicacionConsolidada,
} from "@/modules/produccion/tipos";
import type { RepositorioProduccion } from "@/modules/produccion/escaneo";
import { sonDuplicadosPorTitulo } from "@/modules/produccion/deduplicacion";
import { limpiarDoi } from "@/modules/produccion/normalizacion";

export const repositorioPrisma: RepositorioProduccion = {
  async obtenerProfesores(filtro) {
    const where = filtro.profesorId
      ? { id: filtro.profesorId }
      : { estatusLaboral: "ACTIVO" as const };

    const profesores = await prisma.profesor.findMany({
      where,
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        scopusId: true,
        orcid: true,
        scholarId: true,
      },
      orderBy: { id: "asc" },
      take: filtro.limite,
      skip: filtro.offset,
    });

    return profesores;
  },

  async buscarPorDoi(doi: string) {
    const limpio = limpiarDoi(doi);
    if (!limpio) return null;

    const encontrada = await prisma.publicacion.findUnique({
      where: { doi: limpio },
      select: {
        id: true,
        doi: true,
        titulo: true,
        fechaPublicacion: true,
        revistaEditorial: true,
        isbnIssn: true,
      },
    });

    return encontrada;
  },

  async buscarSimilares(titulo: string, tituloNormalizado: string) {
    if (!tituloNormalizado) return [];

    try {
      // Búsqueda con similarity() y operador % utilizando el índice GIN de pg_trgm (RF-021, RNF-004)
      const filas = await prisma.$queryRaw<
        Array<{
          id: number;
          titulo: string;
          doi: string | null;
          fechaPublicacion: Date | null;
        }>
      >`
        SELECT id, titulo, doi, "fechaPublicacion"
        FROM "Publicacion"
        WHERE "tituloNormalizado" % ${tituloNormalizado}
           OR similarity("tituloNormalizado", ${tituloNormalizado}) >= 0.90
        ORDER BY similarity("tituloNormalizado", ${tituloNormalizado}) DESC
        LIMIT 10
      `;
      return filas;
    } catch {
      // Fallback a coincidencia exacta de título normalizado si $queryRaw falla
      return await prisma.publicacion.findMany({
        where: { tituloNormalizado },
        select: {
          id: true,
          titulo: true,
          doi: true,
          fechaPublicacion: true,
        },
        take: 10,
      });
    }
  },

  async persistirOActualizar(item: PublicacionConsolidada) {
    // 1. Coincidencia por DOI exacto
    if (item.doi) {
      const porDoi = await this.buscarPorDoi(item.doi);
      if (porDoi) {
        await prisma.publicacion.update({
          where: { id: porDoi.id },
          data: {
            revistaEditorial: porDoi.revistaEditorial || item.revistaEditorial,
            isbnIssn: porDoi.isbnIssn || item.isbnIssn,
            fechaPublicacion: porDoi.fechaPublicacion || item.fechaPublicacion,
          },
        });
        return porDoi.id;
      }
    }

    // 2. Coincidencia por similitud de título (RF-021 con pg_trgm >= 0.90)
    const candidatos = await this.buscarSimilares(item.titulo, item.tituloNormalizado);
    for (const c of candidatos) {
      // Si ambos tienen DOI y son distintos, no son duplicados
      if (item.doi && c.doi && item.doi !== c.doi) {
        continue;
      }
      const anioExistente = c.fechaPublicacion ? c.fechaPublicacion.getUTCFullYear() : null;
      const esDup = sonDuplicadosPorTitulo(item.titulo, c.titulo, item.anio, anioExistente);
      if (esDup.esDuplicado) {
        return c.id;
      }
    }

    // 3. Crear nuevo registro de publicación
    const nueva = await prisma.publicacion.create({
      data: {
        tipo: item.tipo,
        titulo: item.titulo,
        tituloNormalizado: item.tituloNormalizado,
        doi: item.doi,
        autoresTexto: item.autoresTexto,
        revistaEditorial: item.revistaEditorial,
        isbnIssn: item.isbnIssn,
        fechaPublicacion: item.fechaPublicacion,
        volumen: item.volumen,
        paginas: item.paginas,
        evidenciaUrl: item.evidenciaUrl,
        fuente: item.fuentePrincipal,
      },
      select: { id: true },
    });

    return nueva.id;
  },

  async vincularAutoria(publicacionId: number, profesorId: number) {
    const existente = await prisma.autoria.findUnique({
      where: {
        publicacionId_profesorId: {
          publicacionId,
          profesorId,
        },
      },
    });

    if (existente) return false;

    await prisma.autoria.create({
      data: {
        publicacionId,
        profesorId,
        estado: "PENDIENTE",
      },
    });

    return true;
  },

  async actualizarJob(jobId: number, datos) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        estado: datos.estado,
        avance: datos.avance,
        total: datos.total,
        error: datos.error,
        datos: datos.datos as object,
      },
    });
  },

  async obtenerUltimoCorte(profesorId: number, fuente: FuentePublicacion) {
    const corte = await prisma.corteEscaneo.findUnique({
      where: {
        profesorId_fuente: {
          profesorId,
          fuente,
        },
      },
      select: { ultimaFecha: true },
    });
    return corte?.ultimaFecha ?? null;
  },

  async registrarCorte(profesorId: number, fuente: FuentePublicacion, fecha = new Date()) {
    await prisma.corteEscaneo.upsert({
      where: {
        profesorId_fuente: {
          profesorId,
          fuente,
        },
      },
      update: { ultimaFecha: fecha },
      create: {
        profesorId,
        fuente,
        ultimaFecha: fecha,
      },
    });
  },
};
