// Orquestador del motor de escaneo de producción científica (RF-020, RF-021, RF-022, RNF-001).
import { prisma } from "@/lib/prisma";
import { consultarOpenAlex } from "./conectores/openalex";
import { consultarOrcid } from "./conectores/orcid";
import { consultarScopus } from "./conectores/scopus";
import {
  deduplicarLote,
  sonDuplicadosPorTitulo,
} from "./deduplicacion";
import type { PublicacionCandidata, PublicacionConsolidada } from "./tipos";

export type OpcionesEscaneo = {
  profesorId?: number;
  anio?: number;
  fuentes?: ("SCOPUS" | "OPENALEX" | "ORCID")[];
  jobId?: number;
};

export type ResumenEscaneo = {
  profesoresProcesados: number;
  publicacionesEncontradas: number;
  publicacionesGuardadas: number;
  autoriasCreadas: number;
  coautoriasDetectadas: number;
  errores: string[];
};

/**
 * Escanea la producción científica de uno o más profesores consultando las fuentes externas
 * configuradas (Scopus, OpenAlex, ORCID), deduplica los registros y persiste publicaciones
 * y autorías en estado PENDIENTE sin duplicar obras institucionales.
 */
export async function ejecutarEscaneo(
  opciones?: OpcionesEscaneo,
): Promise<ResumenEscaneo> {
  const fuentesPermitidas = opciones?.fuentes ?? ["SCOPUS", "OPENALEX", "ORCID"];

  // 1. Obtener los profesores a escanear (con sus identificadores)
  const whereProfesor = opciones?.profesorId ? { id: opciones.profesorId } : { estatusLaboral: "ACTIVO" as const };
  const profesores = await prisma.profesor.findMany({
    where: whereProfesor,
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      scopusId: true,
      orcid: true,
      scholarId: true,
    },
    orderBy: { id: "asc" },
  });

  const resumen: ResumenEscaneo = {
    profesoresProcesados: 0,
    publicacionesEncontradas: 0,
    publicacionesGuardadas: 0,
    autoriasCreadas: 0,
    coautoriasDetectadas: 0,
    errores: [],
  };

  if (profesores.length === 0) {
    return resumen;
  }

  // Actualizar Job si fue proporcionado
  if (opciones?.jobId) {
    await prisma.job.update({
      where: { id: opciones.jobId },
      data: {
        estado: "EN_PROCESO",
        total: profesores.length,
        avance: 0,
      },
    });
  }

  const todasCandidatas: PublicacionCandidata[] = [];

  // 2. Extraer publicaciones de fuentes externas por cada profesor
  for (const prof of profesores) {
    // Escaneo desde Scopus
    if (fuentesPermitidas.includes("SCOPUS") && (prof.scopusId || prof.orcid)) {
      try {
        const res = await consultarScopus(prof, opciones?.anio);
        if (res.error && res.error !== "NO_API_KEY") {
          resumen.errores.push(`Scopus (Prof. ${prof.id}): ${res.error}`);
        }
        todasCandidatas.push(...res.publicaciones);
      } catch (err: unknown) {
        resumen.errores.push(`Scopus (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Escaneo desde OpenAlex
    if (fuentesPermitidas.includes("OPENALEX") && prof.orcid) {
      try {
        const res = await consultarOpenAlex(prof, opciones?.anio);
        if (res.error) {
          resumen.errores.push(`OpenAlex (Prof. ${prof.id}): ${res.error}`);
        }
        todasCandidatas.push(...res.publicaciones);
      } catch (err: unknown) {
        resumen.errores.push(`OpenAlex (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Escaneo desde ORCID
    if (fuentesPermitidas.includes("ORCID") && prof.orcid) {
      try {
        const res = await consultarOrcid(prof, opciones?.anio);
        if (res.error) {
          resumen.errores.push(`ORCID (Prof. ${prof.id}): ${res.error}`);
        }
        todasCandidatas.push(...res.publicaciones);
      } catch (err: unknown) {
        resumen.errores.push(`ORCID (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    resumen.profesoresProcesados++;

    if (opciones?.jobId) {
      await prisma.job.update({
        where: { id: opciones.jobId },
        data: { avance: resumen.profesoresProcesados },
      });
    }
  }

  resumen.publicacionesEncontradas = todasCandidatas.length;

  // 3. Deduplicar en memoria las publicaciones extraídas (RF-021, RF-022)
  const consolidadas = deduplicarLote(todasCandidatas);

  // 4. Persistir o actualizar en la base de datos
  for (const consolidada of consolidadas) {
    if (consolidada.profesoresIds.length > 1) {
      resumen.coautoriasDetectadas++;
    }

    try {
      const publicacionId = await persistirPublicacion(consolidada);
      resumen.publicacionesGuardadas++;

      // Registrar autoría para cada profesor vinculado (RF-022)
      for (const profId of consolidada.profesoresIds) {
        const autoriaExistente = await prisma.autoria.findUnique({
          where: {
            publicacionId_profesorId: {
              publicacionId,
              profesorId: profId,
            },
          },
        });

        if (!autoriaExistente) {
          await prisma.autoria.create({
            data: {
              publicacionId,
              profesorId: profId,
              estado: "PENDIENTE",
            },
          });
          resumen.autoriasCreadas++;
        }
      }
    } catch (e: unknown) {
      resumen.errores.push(`Persistencia: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 5. Finalizar Job si aplica
  if (opciones?.jobId) {
    await prisma.job.update({
      where: { id: opciones.jobId },
      data: {
        estado: resumen.errores.length > 0 && resumen.publicacionesGuardadas === 0 ? "FALLIDO" : "COMPLETADO",
        avance: resumen.profesoresProcesados,
        datos: resumen as unknown as object,
        error: resumen.errores.length > 0 ? resumen.errores.slice(0, 3).join("; ") : null,
      },
    });
  }

  return resumen;
}

/**
 * Persiste o actualiza una publicación consolidada en la base de datos,
 * detectando duplicados existentes por DOI o similitud de título.
 */
async function persistirPublicacion(item: PublicacionConsolidada): Promise<number> {
  // A. Búsqueda por DOI exacto
  if (item.doi) {
    const porDoi = await prisma.publicacion.findUnique({
      where: { doi: item.doi },
      select: { id: true, revistaEditorial: true, isbnIssn: true, fechaPublicacion: true },
    });

    if (porDoi) {
      // Complementar datos si estaban vacíos
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

  // B. Búsqueda por similitud o igualdad de título normalizado
  const candidatosTitulo = await prisma.publicacion.findMany({
    where: {
      tituloNormalizado: item.tituloNormalizado,
    },
    select: { id: true, titulo: true, doi: true, fechaPublicacion: true },
    take: 5,
  });

  for (const c of candidatosTitulo) {
    const anioExistente = c.fechaPublicacion ? c.fechaPublicacion.getUTCFullYear() : null;
    const esDup = sonDuplicadosPorTitulo(item.titulo, c.titulo, item.anio, anioExistente);
    if (esDup.esDuplicado) {
      return c.id;
    }
  }

  // C. Si no existía, crear nuevo registro de Publicacion
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
}
