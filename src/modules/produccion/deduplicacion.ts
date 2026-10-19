// Motor de deduplicación y fusión de publicaciones científicas (RF-021, RF-022, RNF-004).
// Funciones puras para deduplicación por DOI exacto y similitud de títulos con trigramas.

import {
  calcularSimilitudTrigramas,
  limpiarDoi,
  limpiarTexto,
  normalizarIssnIsbn,
  normalizarTitulo,
} from "./normalizacion";
import type {
  FuentePublicacion,
  PublicacionCandidata,
  PublicacionConsolidada,
  ResultadoCoincidencia,
} from "./tipos";

// Prioridad de fuentes para determinar metadatos principales (Scopus > OpenAlex > ORCID > Google Scholar > Manual)
const PRIORIDAD_FUENTES: Record<FuentePublicacion, number> = {
  SCOPUS: 5,
  OPENALEX: 4,
  ORCID: 3,
  GOOGLE_SCHOLAR: 2,
  MANUAL: 1,
};

// Umbral por defecto para considerar similitud de título según el SDD (§4 y §8.7)
export const UMBRAL_SIMILITUD_TITULO = 0.9;

/**
 * Compara dos DOIs normalizados.
 * Devuelve true si ambos existen y coinciden de manera exacta.
 */
export function sonDuplicadosPorDoi(
  doiA?: string | null,
  doiB?: string | null,
): boolean {
  const limpioA = limpiarDoi(doiA);
  const limpioB = limpiarDoi(doiB);

  if (!limpioA || !limpioB) return false;
  return limpioA === limpioB;
}

/**
 * Compara dos publicaciones por título y año.
 * Si los títulos normalizados son idénticos, o la similitud de trigramas es >= umbral (con años compatibles),
 * se identifican como duplicados.
 */
export function sonDuplicadosPorTitulo(
  tituloA: string,
  tituloB: string,
  anioA?: number | null,
  anioB?: number | null,
  umbral = UMBRAL_SIMILITUD_TITULO,
): { esDuplicado: boolean; similitud: number; motivo: "TITULO_EXACTO" | "TITULO_SIMILITUD" | null } {
  const normA = normalizarTitulo(tituloA);
  const normB = normalizarTitulo(tituloB);

  if (!normA || !normB) {
    return { esDuplicado: false, similitud: 0, motivo: null };
  }

  // Si ambos tienen año especificado, permitimos una variación máxima de 1 año (avance online vs impresión)
  if (anioA && anioB && Math.abs(anioA - anioB) > 1) {
    return { esDuplicado: false, similitud: 0, motivo: null };
  }

  if (normA === normB) {
    return { esDuplicado: true, similitud: 1.0, motivo: "TITULO_EXACTO" };
  }

  const similitud = calcularSimilitudTrigramas(tituloA, tituloB);
  if (similitud >= umbral) {
    return { esDuplicado: true, similitud, motivo: "TITULO_SIMILITUD" };
  }

  return { esDuplicado: false, similitud, motivo: null };
}

/**
 * Evalúa si una publicación candidata coincide con una existente (por DOI o similitud de título).
 */
export function compararConExistente(
  candidata: PublicacionCandidata,
  existente: {
    id?: number;
    doi?: string | null;
    titulo: string;
    anio?: number | null;
  },
  umbralTitulo = UMBRAL_SIMILITUD_TITULO,
): ResultadoCoincidencia {
  if (sonDuplicadosPorDoi(candidata.doi, existente.doi)) {
    return {
      esDuplicado: true,
      motivo: "DOI_EXACTO",
      similitud: 1.0,
      publicacionExistenteId: existente.id,
    };
  }

  const comparacionTitulo = sonDuplicadosPorTitulo(
    candidata.titulo,
    existente.titulo,
    candidata.anio,
    existente.anio,
    umbralTitulo,
  );

  if (comparacionTitulo.esDuplicado) {
    return {
      esDuplicado: true,
      motivo: comparacionTitulo.motivo,
      similitud: comparacionTitulo.similitud,
      publicacionExistenteId: existente.id,
    };
  }

  return {
    esDuplicado: false,
    motivo: null,
    similitud: comparacionTitulo.similitud,
  };
}

/**
 * Convierte una publicación candidata individual en un registro consolidado inicial.
 */
export function crearConsolidada(candidata: PublicacionCandidata): PublicacionConsolidada {
  const doiLimpio = limpiarDoi(candidata.doi);
  const tituloNormalizado = normalizarTitulo(candidata.titulo);

  let anio = candidata.anio ?? null;
  if (!anio && candidata.fechaPublicacion) {
    anio = candidata.fechaPublicacion.getUTCFullYear();
  }

  return {
    tipo: candidata.tipo,
    titulo: limpiarTexto(candidata.titulo),
    tituloNormalizado,
    doi: doiLimpio,
    autoresTexto: limpiarTexto(candidata.autoresTexto),
    revistaEditorial: candidata.revistaEditorial ? limpiarTexto(candidata.revistaEditorial) : null,
    isbnIssn: normalizarIssnIsbn(candidata.isbnIssn),
    fechaPublicacion: candidata.fechaPublicacion ?? null,
    anio,
    volumen: candidata.volumen ? limpiarTexto(candidata.volumen) : null,
    paginas: candidata.paginas ? limpiarTexto(candidata.paginas) : null,
    evidenciaUrl: candidata.evidenciaUrl ? limpiarTexto(candidata.evidenciaUrl) : null,
    fuentePrincipal: candidata.fuente,
    fuentesDetectadas: [candidata.fuente],
    profesoresIds: [candidata.profesorId],
    citas: candidata.citas,
    cuartil: candidata.cuartil,
  };
}

/**
 * Fusiona los metadatos de una publicación entrante dentro de un registro consolidado destino.
 * Preserva y complementa campos faltantes, une las fuentes y vincula los IDs de profesores (RF-022).
 */
export function fusionarEnConsolidada(
  destino: PublicacionConsolidada,
  origen: PublicacionCandidata,
): void {
  // 1. Agregar fuente si es nueva
  if (!destino.fuentesDetectadas.includes(origen.fuente)) {
    destino.fuentesDetectadas.push(origen.fuente);
  }

  // 2. Si la fuente entrante tiene mayor prioridad, actualizamos fuentePrincipal y campos preferentes
  const prioridadDestino = PRIORIDAD_FUENTES[destino.fuentePrincipal] ?? 0;
  const prioridadOrigen = PRIORIDAD_FUENTES[origen.fuente] ?? 0;

  if (prioridadOrigen > prioridadDestino) {
    destino.fuentePrincipal = origen.fuente;
  }

  // 3. Vincular profesor si no está ya presente (RF-022: coautoría sin duplicar publicación)
  if (!destino.profesoresIds.includes(origen.profesorId)) {
    destino.profesoresIds.push(origen.profesorId);
  }

  // 4. Complementar DOI
  if (!destino.doi && origen.doi) {
    destino.doi = limpiarDoi(origen.doi);
  }

  // 5. Complementar revista/editorial
  if (!destino.revistaEditorial && origen.revistaEditorial) {
    destino.revistaEditorial = limpiarTexto(origen.revistaEditorial);
  }

  // 6. Complementar ISSN/ISBN
  if (!destino.isbnIssn && origen.isbnIssn) {
    destino.isbnIssn = normalizarIssnIsbn(origen.isbnIssn);
  }

  // 7. Complementar fecha y año
  if (!destino.fechaPublicacion && origen.fechaPublicacion) {
    destino.fechaPublicacion = origen.fechaPublicacion;
  }
  if (!destino.anio && origen.anio) {
    destino.anio = origen.anio;
  }

  // 8. Volumen y páginas
  if (!destino.volumen && origen.volumen) {
    destino.volumen = limpiarTexto(origen.volumen);
  }
  if (!destino.paginas && origen.paginas) {
    destino.paginas = limpiarTexto(origen.paginas);
  }

  // 9. Evidencia o enlace
  if (!destino.evidenciaUrl && origen.evidenciaUrl) {
    destino.evidenciaUrl = limpiarTexto(origen.evidenciaUrl);
  }

  // 10. Autores: si el origen tiene más autores listados o texto más completo, se prefiere
  const autoresDestino = destino.autoresTexto.split(";").map((s) => s.trim()).filter(Boolean);
  const autoresOrigen = (origen.autoresTexto || "").split(";").map((s) => s.trim()).filter(Boolean);
  if (autoresOrigen.length > autoresDestino.length) {
    destino.autoresTexto = limpiarTexto(origen.autoresTexto);
  }

  // 11. Citas: se toma la mayor cantidad reportada
  if (origen.citas !== undefined) {
    destino.citas = Math.max(destino.citas ?? 0, origen.citas);
  }

  // 12. Cuartil
  if (!destino.cuartil && origen.cuartil) {
    destino.cuartil = origen.cuartil;
  }
}

/**
 * Deduplica un conjunto de publicaciones candidatas procedentes de múltiples fuentes
 * y profesores, unificando duplicados y consolidando coautorías (RF-021, RF-022).
 */
export function deduplicarLote(
  publicaciones: PublicacionCandidata[],
  opciones?: { umbralTitulo?: number },
): PublicacionConsolidada[] {
  const umbral = opciones?.umbralTitulo ?? UMBRAL_SIMILITUD_TITULO;
  const consolidadas: PublicacionConsolidada[] = [];

  // Mapeos rápidos para búsqueda eficiente
  const indicePorDoi = new Map<string, PublicacionConsolidada>();
  const indicePorTituloNorm = new Map<string, PublicacionConsolidada[]>();

  for (const candidata of publicaciones) {
    const doiLimpio = limpiarDoi(candidata.doi);
    const tituloNorm = normalizarTitulo(candidata.titulo);

    let destino: PublicacionConsolidada | null = null;

    // 1. Coincidencia por DOI exacto
    if (doiLimpio && indicePorDoi.has(doiLimpio)) {
      destino = indicePorDoi.get(doiLimpio)!;
    }

    // 2. Si no hubo coincidencia por DOI, buscar por similitud de título
    if (!destino && tituloNorm) {
      // Primero verificar título normalizado exacto
      const candidatosPorTitulo = indicePorTituloNorm.get(tituloNorm);
      if (candidatosPorTitulo && candidatosPorTitulo.length > 0) {
        destino = candidatosPorTitulo[0];
      } else {
        // Búsqueda por similitud de trigramas
        for (const item of consolidadas) {
          const resultado = sonDuplicadosPorTitulo(
            candidata.titulo,
            item.titulo,
            candidata.anio,
            item.anio,
            umbral,
          );
          if (resultado.esDuplicado) {
            destino = item;
            break;
          }
        }
      }
    }

    // 3. Si se encontró duplicado, fusionar; de lo contrario, crear nuevo
    if (destino) {
      fusionarEnConsolidada(destino, candidata);
    } else {
      const nuevaConsolidada = crearConsolidada(candidata);
      consolidadas.push(nuevaConsolidada);
      destino = nuevaConsolidada;
    }

    // Actualizar índices
    if (destino.doi) {
      indicePorDoi.set(destino.doi, destino);
    }
    const listaTitulos = indicePorTituloNorm.get(destino.tituloNormalizado) ?? [];
    if (!listaTitulos.includes(destino)) {
      listaTitulos.push(destino);
      indicePorTituloNorm.set(destino.tituloNormalizado, listaTitulos);
    }
  }

  return consolidadas;
}
