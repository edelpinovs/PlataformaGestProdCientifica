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

/** Reconsulta desde el año anterior al corte para recuperar indexaciones tardías.
 * La deduplicación evita repetir las obras ya guardadas. Un fallo descarta el
 * resultado del periodo y conserva el corte anterior para reintentarlo completo.
 */
async function consultarPeriodo(
  consultar: (profesor: ProfesorParaEscaneo, anio?: number) => Promise<{
    publicaciones: PublicacionCandidata[];
    error?: string;
  }>,
  profesor: ProfesorParaEscaneo,
  anioInicial: number,
  anioExplicito: number | undefined,
  inicio: Date,
) {
  const publicaciones: PublicacionCandidata[] = [];
  const anioFinal = anioExplicito ?? inicio.getUTCFullYear();
  for (let anio = Math.min(anioInicial, anioFinal); anio <= anioFinal; anio++) {
    const resultado = await consultar(profesor, anio);
    if (resultado.error) return { publicaciones: [], error: resultado.error };
    publicaciones.push(...resultado.publicaciones);
  }
  return { publicaciones };
}

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
  const cortesPendientes: { profesorId: number; fuente: FuentePublicacion }[] = [];
  const inicioEscaneo = new Date();
  const profesoresConFalloPersistencia = new Set<number>();

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
              anioScopus = Math.max(1900, ultimoCorte.getUTCFullYear() - 1);
            }
          }
          if (!anioScopus) {
            anioScopus = inicioEscaneo.getUTCFullYear();
          }
        }

        const res = await consultarPeriodo(consultarScopus, prof, anioScopus, opciones?.anio, inicioEscaneo);
        if (res.error) {
          resumen.errores.push(`Scopus (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          cortesPendientes.push({ profesorId: prof.id, fuente: "SCOPUS" });
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
              anioOA = Math.max(1900, ultimoCorte.getUTCFullYear() - 1);
            }
          }
          if (!anioOA) {
            anioOA = inicioEscaneo.getUTCFullYear();
          }
        }

        const res = await consultarPeriodo(consultarOpenAlex, prof, anioOA, opciones?.anio, inicioEscaneo);
        if (res.error) {
          resumen.errores.push(`OpenAlex (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          cortesPendientes.push({ profesorId: prof.id, fuente: "OPENALEX" });
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
              anioOrcid = Math.max(1900, ultimoCorte.getUTCFullYear() - 1);
            }
          }
          if (!anioOrcid) {
            anioOrcid = inicioEscaneo.getUTCFullYear();
          }
        }

        const res = await consultarPeriodo(consultarOrcid, prof, anioOrcid, opciones?.anio, inicioEscaneo);
        if (res.error) {
          resumen.errores.push(`ORCID (Prof. ${prof.id}): ${res.error}`);
          huboErrorEnProfesor = true;
        } else {
          todasCandidatas.push(...res.publicaciones);
          cortesPendientes.push({ profesorId: prof.id, fuente: "ORCID" });
        }
      } catch (err: unknown) {
        resumen.errores.push(`ORCID (Prof. ${prof.id}): ${err instanceof Error ? err.message : String(err)}`);
        huboErrorEnProfesor = true;
      }
    }

    if (!huboErrorEnProfesor || todasCandidatas.some((publicacion) => publicacion.profesorId === prof.id)) {
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

      // Registrar autoría para cada profesor vinculado (RF-022)
      for (const profId of consolidada.profesoresIds) {
        const creada = await repo.vincularAutoria(publicacionId, profId);
        if (creada) {
          resumen.autoriasCreadas++;
        }
      }
      resumen.publicacionesGuardadas++;
    } catch (e: unknown) {
      for (const profesorId of consolidada.profesoresIds) {
        profesoresConFalloPersistencia.add(profesorId);
      }
      resumen.errores.push(`Persistencia: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Un escaneo histórico explícito no adelanta el corte incremental. Se guarda el
  // inicio, no el final, para volver a consultar lo indexado durante la ejecución.
  if (!opciones?.anio && repo.registrarCorte) {
    for (const corte of cortesPendientes) {
      if (profesoresConFalloPersistencia.has(corte.profesorId)) continue;
      try {
        await repo.registrarCorte(corte.profesorId, corte.fuente, inicioEscaneo);
      } catch {
        resumen.errores.push(`No se pudo guardar el corte del profesor ${corte.profesorId}. Se reintentará en el próximo escaneo.`);
      }
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
