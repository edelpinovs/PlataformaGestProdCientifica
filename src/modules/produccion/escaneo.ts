// Orquestador del motor de escaneo de producción científica (RF-020, RF-021, RF-022, RNF-001).
// Diseñado como lógica de dominio pura que delega la persistencia al RepositorioProduccion.

import { consultarOpenAlex } from "./conectores/openalex";
import { consultarOrcid } from "./conectores/orcid";
import { consultarScopus } from "./conectores/scopus";
import { enriquecerLoteConCrossref } from "./conectores/crossref";
import { deduplicarLote } from "./deduplicacion";
import type {
  FuentePublicacion,
  PublicacionCandidata,
  PublicacionConsolidada,
} from "./tipos";

export type ProfesorParaEscaneo = {
  id: number;
  nombres: string;
  apellidos: string;
  scopusId?: string | null;
  orcid?: string | null;
  scholarId?: string | null;
};

export type PublicacionExistente = {
  id: number;
  titulo: string;
  doi?: string | null;
  fechaPublicacion?: Date | null;
  revistaEditorial?: string | null;
  isbnIssn?: string | null;
};

export type RepositorioProduccion = {
  obtenerProfesores: (filtro: {
    profesorId?: number;
    limite?: number;
    offset?: number;
  }) => Promise<ProfesorParaEscaneo[]>;
  buscarPorDoi: (doi: string) => Promise<PublicacionExistente | null>;
  buscarSimilares: (titulo: string, tituloNormalizado: string) => Promise<PublicacionExistente[]>;
  persistirOActualizar: (item: PublicacionConsolidada) => Promise<number>;
  vincularAutoria: (publicacionId: number, profesorId: number) => Promise<boolean>;
  actualizarJob?: (
    jobId: number,
    datos: {
      estado?: "EN_PROCESO" | "COMPLETADO" | "FALLIDO";
      total?: number;
      avance?: number;
      error?: string | null;
      datos?: unknown;
    },
  ) => Promise<void>;
  obtenerUltimoCorte?: (profesorId: number, fuente: FuentePublicacion) => Promise<Date | null>;
  registrarCorte?: (profesorId: number, fuente: FuentePublicacion, fecha?: Date) => Promise<void>;
};

export type OpcionesEscaneo = {
  profesorId?: number;
  anio?: number;
  fuentes?: ("SCOPUS" | "OPENALEX" | "ORCID")[];
  jobId?: number;
  /** Si es true, enriquece los autores con Crossref cuando Scopus solo entrega el primer autor (vista estándar). Activo por defecto. */
  enriquecerAutores?: boolean;
  /** Límite de profesores a procesar en una sola ejecución para cumplir con el timeout de Vercel (Hallazgo 2a) */
  limiteProfesores?: number;
  /** Desplazamiento inicial para procesamiento secuencial por lotes */
  offsetProfesores?: number;
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
  repo?: RepositorioProduccion,
): Promise<ResumenEscaneo> {
  const resumen: ResumenEscaneo = {
    profesoresProcesados: 0,
    publicacionesEncontradas: 0,
    publicacionesGuardadas: 0,
    autoriasCreadas: 0,
    coautoriasDetectadas: 0,
    errores: [],
  };

  if (!repo) {
    return resumen;
  }

  const fuentesPermitidas = opciones?.fuentes ?? ["SCOPUS", "OPENALEX", "ORCID"];

  // 1. Obtener los profesores a escanear (soporta lotes para cumplir con Vercel timeout - Hallazgo 2a)
  const profesores = await repo.obtenerProfesores({
    profesorId: opciones?.profesorId,
    limite: opciones?.limiteProfesores,
    offset: opciones?.offsetProfesores,
  });

  if (profesores.length === 0) {
    return resumen;
  }

  // Actualizar Job si fue proporcionado
  if (opciones?.jobId && repo.actualizarJob) {
    await repo.actualizarJob(opciones.jobId, {
      estado: "EN_PROCESO",
      total: profesores.length,
      avance: 0,
    });
  }

  const todasCandidatas: PublicacionCandidata[] = [];

  // 2. Extraer publicaciones de fuentes externas por cada profesor
  for (const prof of profesores) {
    let huboErrorEnProfesor = false;

    // Escaneo desde Scopus (incremental por CorteEscaneo - Hallazgo 3c)
    if (fuentesPermitidas.includes("SCOPUS") && (prof.scopusId || prof.orcid)) {
      try {
        let anioScopus = opciones?.anio;
        if (!anioScopus) {
          if (repo.obtenerUltimoCorte) {
            const ultimoCorte = await repo.obtenerUltimoCorte(prof.id, "SCOPUS");
            if (ultimoCorte) {
              anioScopus = ultimoCorte.getUTCFullYear();
            }
          }
          if (!anioScopus) {
            anioScopus = new Date().getFullYear();
          }
        }

        const res = await consultarScopus(prof, anioScopus);
        if (res.error && res.error !== "NO_API_KEY") {
          resumen.errores.push(`Scopus (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          if (repo.registrarCorte) {
            await repo.registrarCorte(prof.id, "SCOPUS");
          }
        }
      } catch (err: unknown) {
        resumen.errores.push(`Scopus (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
        huboErrorEnProfesor = true;
      }
    }

    // Escaneo desde OpenAlex (incremental por CorteEscaneo - Hallazgo 3c)
    if (fuentesPermitidas.includes("OPENALEX") && prof.orcid) {
      try {
        let anioOA = opciones?.anio;
        if (!anioOA) {
          if (repo.obtenerUltimoCorte) {
            const ultimoCorte = await repo.obtenerUltimoCorte(prof.id, "OPENALEX");
            if (ultimoCorte) {
              anioOA = ultimoCorte.getUTCFullYear();
            }
          }
          if (!anioOA) {
            anioOA = new Date().getFullYear();
          }
        }

        const res = await consultarOpenAlex(prof, anioOA);
        if (res.error) {
          resumen.errores.push(`OpenAlex (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          if (repo.registrarCorte) {
            await repo.registrarCorte(prof.id, "OPENALEX");
          }
        }
      } catch (err: unknown) {
        resumen.errores.push(`OpenAlex (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
        huboErrorEnProfesor = true;
      }
    }

    // Escaneo desde ORCID (incremental por CorteEscaneo - Hallazgo 3c)
    if (fuentesPermitidas.includes("ORCID") && prof.orcid) {
      try {
        let anioOrcid = opciones?.anio;
        if (!anioOrcid) {
          if (repo.obtenerUltimoCorte) {
            const ultimoCorte = await repo.obtenerUltimoCorte(prof.id, "ORCID");
            if (ultimoCorte) {
              anioOrcid = ultimoCorte.getUTCFullYear();
            }
          }
          if (!anioOrcid) {
            anioOrcid = new Date().getFullYear();
          }
        }

        const res = await consultarOrcid(prof, anioOrcid);
        if (res.error) {
          resumen.errores.push(`ORCID (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          if (repo.registrarCorte) {
            await repo.registrarCorte(prof.id, "ORCID");
          }
        }
      } catch (err: unknown) {
        resumen.errores.push(`ORCID (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
        huboErrorEnProfesor = true;
      }
    }

    if (!huboErrorEnProfesor || todasCandidatas.length > 0) {
      resumen.profesoresProcesados++;
    }

    if (opciones?.jobId && repo.actualizarJob) {
      await repo.actualizarJob(opciones.jobId, {
        avance: resumen.profesoresProcesados,
      });
    }
  }

  resumen.publicacionesEncontradas = todasCandidatas.length;

  // 3. Enriquecer autores con Crossref para publicaciones con DOI y autores incompletos (RF-020)
  //    Esto replica la lógica de autores_por_doi() en scripts/reporte_unificado.py
  if (opciones?.enriquecerAutores !== false) {
    try {
      await enriquecerLoteConCrossref(todasCandidatas);
    } catch (err: unknown) {
      // Si Crossref falla no bloqueamos el escaneo: continuamos con los autores disponibles
      console.warn("Aviso: enriquecimiento de autores con Crossref omitido:", err);
    }
  }

  // 4. Deduplicar en memoria las publicaciones extraídas (RF-021, RF-022)
  const consolidadas = deduplicarLote(todasCandidatas);

  // 5. Persistir o actualizar en la base de datos mediante el repositorio
  for (const consolidada of consolidadas) {
    if (consolidada.profesoresIds.length > 1) {
      resumen.coautoriasDetectadas++;
    }

    try {
      const publicacionId = await repo.persistirOActualizar(consolidada);
      resumen.publicacionesGuardadas++;

      // Registrar autoría para cada profesor vinculado (RF-022)
      for (const profId of consolidada.profesoresIds) {
        const creada = await repo.vincularAutoria(publicacionId, profId);
        if (creada) {
          resumen.autoriasCreadas++;
        }
      }
    } catch (e: unknown) {
      resumen.errores.push(`Persistencia: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 6. Finalizar Job si aplica
  if (opciones?.jobId && repo.actualizarJob) {
    const estado =
      resumen.errores.length > 0 && resumen.publicacionesGuardadas === 0 ? "FALLIDO" : "COMPLETADO";

    await repo.actualizarJob(opciones.jobId, {
      estado,
      avance: resumen.profesoresProcesados,
      datos: resumen as unknown as object,
      error: resumen.errores.length > 0 ? resumen.errores.slice(0, 3).join("; ") : null,
    });
  }

  return resumen;
}
