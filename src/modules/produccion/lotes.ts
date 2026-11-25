import { z } from "zod";
import type { ResumenEscaneo } from "./escaneo";
import { consultaFuenteEsquema, FUENTES_ANTERIORES, FUENTES_ESCANEO, NOMBRES_FUENTE, opcionEnriquecerEsquema, seleccionFuentesEsquema, type FuenteEscaneo } from "./fuentes";
import { fuentePublicacionEnum } from "./tipos";
import { hoyMexico } from "./fechas-escaneo";
import { fechaCampo, fechaValida, rangoDeSolicitud, validarRango } from "./rango-escaneo";

/**
 * Tiempo sin actualizarse tras el cual un trabajo «En proceso» se considera interrumpido:
 * Producción vuelve a reservarlo y Administración lo muestra «sin avance» (#279).
 */
export const TIEMPO_RESERVA_MS = 10 * 60 * 1000;

export function resumenVacio(): ResumenEscaneo & { autoriasRechazadasOmitidas: number } {
  return { profesoresProcesados: 0, publicacionesEncontradas: 0, publicacionesGuardadas: 0,
    autoriasCreadas: 0, coautoriasDetectadas: 0, autoriasRechazadasOmitidas: 0, errores: [] };
}

const entero = z.number({ error: "El avance del escaneo no es válido." }).int().nonnegative();
export const datosLoteEsquema = z.object({
  version: z.literal(1), profesoresIds: z.array(z.number().int().positive()), indice: entero,
  anio: z.number().int().min(1990).max(2100).optional(),
  desde: z.iso.date({ error: "La fecha inicial del escaneo no es válida." }).optional(),
  hasta: z.iso.date({ error: "La fecha final del escaneo no es válida." }).optional(),
  finalizadoEn: z.iso.datetime({ error: "La fecha de finalización no es válida." }).optional(),
  fuentes: seleccionFuentesEsquema.optional(),
  enriquecerAutores: z.boolean({ error: "La opción para completar autores no es válida." }).optional(),
  fuenteEnCurso: z.enum(FUENTES_ESCANEO, { error: "La fuente en curso no es válida." }).nullish(),
  resumen: z.object({
    profesoresProcesados: entero, publicacionesEncontradas: entero, publicacionesGuardadas: entero,
    autoriasCreadas: entero, coautoriasDetectadas: entero, errores: z.array(z.string()),
    consultasFuentes: z.array(consultaFuenteEsquema).optional(),
    procedencia: z.array(z.object({ publicacionId: entero, fuentes: z.array(fuentePublicacionEnum) })).optional(),
    autoriasRechazadasOmitidas: entero.optional().default(0),
  }),
}).refine((datos) => datos.indice <= datos.profesoresIds.length, {
  error: "El avance supera la cantidad de profesores del escaneo.",
});
export type DatosLote = z.infer<typeof datosLoteEsquema>;

export const solicitudEscaneoEsquema = z.object({
  profesorId: z.union([
    z.literal("todos"),
    z.string().regex(/^[1-9]\d*$/, "Selecciona un profesor válido.").refine(
      (valor) => Number.isSafeInteger(Number(valor)) && Number(valor) <= 2147483647, "Selecciona un profesor válido.",
    ),
  ], { error: "Selecciona un profesor válido." }),
  // Rango con fechas completas (#266): ambas vacías = buscar novedades.
  desde: fechaCampo,
  hasta: fechaCampo,
  fuentes: seleccionFuentesEsquema,
  enriquecerAutores: opcionEnriquecerEsquema,
}).superRefine(({ desde, hasta }, contexto) => {
  if (fechaValida(desde) && fechaValida(hasta)) validarRango(desde, hasta, hoyMexico(), contexto);
}).transform(({ desde, hasta, ...resto }) => ({ ...resto, rango: rangoDeSolicitud(desde, hasta, hoyMexico()) }));

export function avanzarLote(datos: DatosLote, resultado: ResumenEscaneo): DatosLote {
  if (datos.indice >= datos.profesoresIds.length) return datos;
  const resumen = { ...datos.resumen };
  resumen.profesoresProcesados += resultado.profesoresProcesados;
  resumen.publicacionesEncontradas += resultado.publicacionesEncontradas;
  resumen.publicacionesGuardadas += resultado.publicacionesGuardadas;
  resumen.autoriasCreadas += resultado.autoriasCreadas;
  resumen.coautoriasDetectadas += resultado.coautoriasDetectadas;
  resumen.consultasFuentes = [...(resumen.consultasFuentes ?? []), ...(resultado.consultasFuentes ?? [])];
  const procedencias = new Map<number, Set<z.infer<typeof fuentePublicacionEnum>>>();
  for (const entrada of [...(resumen.procedencia ?? []), ...(resultado.procedencia ?? [])]) {
    const fuentes = procedencias.get(entrada.publicacionId) ?? new Set();
    entrada.fuentes.forEach(f => fuentes.add(f));
    procedencias.set(entrada.publicacionId,fuentes);
  }
  resumen.procedencia = [...procedencias].map(([publicacionId,fuentes]) => ({ publicacionId, fuentes: [...fuentes] }));
  resumen.autoriasRechazadasOmitidas = (resumen.autoriasRechazadasOmitidas ?? 0) + (resultado.autoriasRechazadasOmitidas ?? 0);
  // Limita el JSON guardado cuando las fuentes fallan repetidamente.
  resumen.errores = [...resumen.errores, ...resultado.errores].slice(0, 50);
  return { ...datos, indice: datos.indice + 1, resumen };
}

export type SeleccionReintento =
  | { ok: true; profesoresIds: number[]; fuentes: FuenteEscaneo[] }
  | { ok: false; error: string };

/**
 * A quién y con qué fuentes reintentar un escaneo terminado (#279): los profesores con alguna
 * fuente en INCIDENCIA, solo con esas fuentes, y los que quedaron sin revisar, con todas las
 * fuentes del trabajo. Se omite lo que falló solo por falta de clave: reintentarlo fallaría igual.
 */
export function seleccionReintento(datos: DatosLote): SeleccionReintento {
  const fuentesTrabajo = datos.fuentes ?? [...FUENTES_ANTERIORES];
  const sinClave = new Set(datos.resumen.errores.filter((error) => error.endsWith(": NO_API_KEY")).map((error) => error.replace(/: NO_API_KEY$/, "")));
  const profesores = new Set<number>();
  const fuentes = new Set<FuenteEscaneo>();
  let faltaClave = false;
  for (const consulta of datos.resumen.consultasFuentes ?? []) {
    if (consulta.estado !== "INCIDENCIA") continue;
    if (sinClave.has(`${NOMBRES_FUENTE[consulta.fuente]} (Prof. ${consulta.profesorId})`)) { faltaClave = true; continue; }
    profesores.add(consulta.profesorId);
    fuentes.add(consulta.fuente);
  }
  const sinRevisar = datos.profesoresIds.slice(datos.indice);
  if (sinRevisar.length) {
    sinRevisar.forEach((id) => profesores.add(id));
    fuentesTrabajo.forEach((fuente) => fuentes.add(fuente));
  }
  if (!profesores.size) return { ok: false, error: faltaClave
    ? "Las consultas fallaron porque falta la clave de acceso de una fuente. Configúrala antes de reintentar."
    : "Esta búsqueda no tiene consultas fallidas ni profesores pendientes que reintentar." };
  return {
    ok: true,
    profesoresIds: datos.profesoresIds.filter((id) => profesores.has(id)),
    fuentes: FUENTES_ESCANEO.filter((fuente) => fuentes.has(fuente)),
  };
}
