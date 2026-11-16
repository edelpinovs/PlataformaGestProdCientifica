// Orquestador del motor de escaneo de producción científica (RF-020, RF-021, RF-022, RNF-001).
// Diseñado como lógica de dominio pura que delega la persistencia al RepositorioProduccion.

import { consultarOpenAlex } from "./conectores/openalex";
import { consultarOrcid } from "./conectores/orcid";
import { consultarCrossref } from "./conectores/crossref-busqueda";
import { consultarGoogleScholar } from "./conectores/google-scholar";
import { FUENTES_ANTERIORES, FUENTES_ESCANEO, NOMBRES_FUENTE, seleccionFuentesEsquema, type ConsultaFuente, type FuenteEscaneo } from "./fuentes";
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
  obtenerClaveScopus?: () => Promise<string | undefined>;
  obtenerProfesores: (filtro: {
    profesorId?: number;
    limite?: number;
    offset?: number;
  }) => Promise<ProfesorParaEscaneo[]>;
  buscarPorDoi: (doi: string) => Promise<PublicacionExistente | null>;
  buscarSimilares: (titulo: string, tituloNormalizado: string) => Promise<PublicacionExistente[]>;
  persistirOActualizar: (item: PublicacionConsolidada) => Promise<number>;
  vincularAutoria: (publicacionId: number, profesorId: number) => Promise<boolean | "RECHAZADA">;
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
  fuentes?: FuenteEscaneo[];
  jobId?: number;
  /** Enriquece autores solo si Crossref está seleccionado. Se puede desactivar para pruebas o consultas concretas. */
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
  autoriasRechazadasOmitidas?: number;
  errores: string[];
  consultasFuentes?: ConsultaFuente[];
  procedencia?: { publicacionId: number; fuentes: FuentePublicacion[] }[];
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
  conectores: { consultarScopus: typeof consultarScopus; consultarOpenAlex: typeof consultarOpenAlex; consultarOrcid: typeof consultarOrcid; consultarCrossref?: typeof consultarCrossref; consultarGoogleScholar?: typeof consultarGoogleScholar } = { consultarScopus, consultarOpenAlex, consultarOrcid, consultarCrossref, consultarGoogleScholar },
): Promise<ResumenEscaneo> {
  const resumen: ResumenEscaneo = {
    profesoresProcesados: 0,
    publicacionesEncontradas: 0,
    publicacionesGuardadas: 0,
    autoriasCreadas: 0,
    coautoriasDetectadas: 0,
    autoriasRechazadasOmitidas: 0,
    errores: [],
    consultasFuentes: [],
    procedencia: [],
  };

  if (!repo) {
    return resumen;
  }

  const seleccion = seleccionFuentesEsquema.safeParse(opciones?.fuentes ?? FUENTES_ANTERIORES);
  if (!seleccion.success) { resumen.errores.push(seleccion.error.issues[0].message); return resumen; }
  const fuentesPermitidas = seleccion.data;

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

  // Se registra también lo no seleccionado, sin consultar el proveedor ni su corte.
  for (const prof of profesores) {
    let huboErrorEnProfesor = false;
    for (const fuente of FUENTES_ESCANEO) {
      if (!fuentesPermitidas.includes(fuente)) {
        resumen.consultasFuentes!.push({ profesorId: prof.id, fuente, estado: "NO_SELECCIONADA", cantidad: 0 });
        continue;
      }
      try {
        const sinIdentificador = (fuente === "ORCID" || fuente === "OPENALEX") ? !prof.orcid
          : fuente === "SCOPUS" ? !(prof.scopusId || prof.orcid)
          : fuente === "GOOGLE_SCHOLAR" ? !prof.scholarId : !prof.orcid;
        let res: { publicaciones: PublicacionCandidata[]; error?: string };
        if (sinIdentificador) res = { publicaciones: [], error: "FALTA_IDENTIFICADOR" };
        else {
          const corte = !opciones?.anio ? await repo.obtenerUltimoCorte?.(prof.id,fuente) : null;
          const desde = opciones?.anio ?? (corte ? Math.max(1900,corte.getUTCFullYear()-1) : fuente === "SCOPUS" ? inicioEscaneo.getUTCFullYear() : undefined);
          if (fuente === "CROSSREF") res = await (conectores.consultarCrossref ?? consultarCrossref)(prof,desde,opciones?.anio ?? inicioEscaneo.getUTCFullYear());
          else if (fuente === "GOOGLE_SCHOLAR") res = await (conectores.consultarGoogleScholar ?? consultarGoogleScholar)(prof,desde,opciones?.anio ?? inicioEscaneo.getUTCFullYear());
          else if (fuente === "SCOPUS") {
            const clave = await repo.obtenerClaveScopus?.();
            res = await consultarPeriodo((profesor,anio) => conectores.consultarScopus(profesor,anio,clave),prof,desde!,opciones?.anio,inicioEscaneo);
          } else {
            const consultar = fuente === "ORCID" ? conectores.consultarOrcid : conectores.consultarOpenAlex;
            res = desde === undefined ? await consultar(prof) : await consultarPeriodo(consultar,prof,desde,opciones?.anio,inicioEscaneo);
          }
        }
        if (res.error) {
          huboErrorEnProfesor = true;
          resumen.errores.push(`${NOMBRES_FUENTE[fuente]} (Prof. ${prof.id}): ${res.error}`);
          resumen.consultasFuentes!.push({ profesorId: prof.id, fuente, estado: "INCIDENCIA", cantidad: 0 });
        } else {
          todasCandidatas.push(...res.publicaciones);
          cortesPendientes.push({ profesorId: prof.id, fuente });
          resumen.consultasFuentes!.push({ profesorId: prof.id, fuente, estado: res.publicaciones.length ? "COMPLETADA" : "SIN_RESULTADOS", cantidad: res.publicaciones.length });
        }
      } catch {
        huboErrorEnProfesor = true;
        resumen.errores.push(`${NOMBRES_FUENTE[fuente]} (Prof. ${prof.id}): CONSULTA_FALLIDA`);
        resumen.consultasFuentes!.push({ profesorId: prof.id, fuente, estado: "INCIDENCIA", cantidad: 0 });
      }
    }
    if (!huboErrorEnProfesor || todasCandidatas.some(p => p.profesorId === prof.id)) resumen.profesoresProcesados++;
    if (opciones?.jobId && repo.actualizarJob) await repo.actualizarJob(opciones.jobId,{avance:resumen.profesoresProcesados});
  }


  resumen.publicacionesEncontradas = todasCandidatas.length;

  // 3. Enriquecer autores con Crossref para publicaciones con DOI y autores incompletos (RF-020)
  //    Esto replica la lógica de autores_por_doi() en scripts/reporte_unificado.py
  if (fuentesPermitidas.includes("CROSSREF") && opciones?.enriquecerAutores !== false) {
    try {
      await enriquecerLoteConCrossref(todasCandidatas);
    } catch {
      // Si Crossref falla no bloqueamos el escaneo: continuamos con los autores disponibles
      resumen.errores.push("Crossref: ENRIQUECIMIENTO_FALLIDO");
    }
  }

  // 4. Deduplicar en memoria las publicaciones extraídas (RF-021, RF-022)
  const consolidadas = deduplicarLote(todasCandidatas);

  // 5. Persistir o actualizar en la base de datos mediante el repositorio
  for (const consolidada of consolidadas) {
    try {
      const publicacionId = await repo.persistirOActualizar(consolidada);
      resumen.procedencia!.push({ publicacionId, fuentes: consolidada.fuentesDetectadas });

      let autoriasPermitidas = 0;
      // Registrar autoría para cada profesor vinculado (RF-022)
      for (const profId of consolidada.profesoresIds) {
        const creada = await repo.vincularAutoria(publicacionId, profId);
        if (creada === "RECHAZADA") {
          resumen.autoriasRechazadasOmitidas = (resumen.autoriasRechazadasOmitidas ?? 0) + 1;
          continue;
        }
        autoriasPermitidas++;
        if (creada === true) {
          resumen.autoriasCreadas++;
        }
      }
      // Una exclusión no es una nueva candidata ni una coautoría confirmada.
      if (autoriasPermitidas > 0) resumen.publicacionesGuardadas++;
      if (autoriasPermitidas > 1) resumen.coautoriasDetectadas++;
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
