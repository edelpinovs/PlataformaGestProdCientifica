import { z } from "zod";

/**
 * Rango de búsqueda del escaneo con fechas completas (#266, D-259).
 * Las fuentes consultan por año; el rango decide qué años pedir y qué obras guardar.
 */
export const ANIO_MINIMO_ESCANEO = 1990;
export const MAXIMO_ANIOS_RANGO = 10;

/** Fechas ISO (AAAA-MM-DD), ambas inclusive. */
export type RangoEscaneo = { desde: string; hasta: string };

const anioDe = (fecha: string) => Number(fecha.slice(0, 4));

export function aniosDelRango(rango: RangoEscaneo) {
  return { desde: anioDe(rango.desde), hasta: anioDe(rango.hasta) };
}

/** Un trabajo anterior al #266 guardaba un solo año: equivale al año completo. */
export function rangoDeAnio(anio: number): RangoEscaneo {
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
}

/** Rango que respeta un trabajo guardado: el nuevo (desde/hasta) o el año único de los trabajos anteriores. */
export function rangoEfectivo(datos: { desde?: string; hasta?: string; anio?: number }): RangoEscaneo | undefined {
  if (datos.desde && datos.hasta) return { desde: datos.desde, hasta: datos.hasta };
  return datos.anio ? rangoDeAnio(datos.anio) : undefined;
}

/**
 * Decide si una obra entra en el rango. Con fecha exacta se compara el día;
 * si la fuente solo trae el año, basta con que el año esté dentro. Google Scholar y a veces
 * Crossref guardan un año sin mes ni día como 1 de enero (precisión anual), así que esa fecha
 * también se compara solo por año. Sin fecha ni año se conserva para que la revisión decida.
 */
export function dentroDelRango(publicacion: { fechaPublicacion?: Date | null; anio?: number | null }, rango: RangoEscaneo) {
  if (publicacion.fechaPublicacion && !Number.isNaN(publicacion.fechaPublicacion.getTime())) {
    const dia = publicacion.fechaPublicacion.toISOString().slice(0, 10);
    if (!dia.endsWith("-01-01")) return dia >= rango.desde && dia <= rango.hasta;
    const anios = aniosDelRango(rango);
    const anio = publicacion.fechaPublicacion.getUTCFullYear();
    return anio >= anios.desde && anio <= anios.hasta;
  }
  if (publicacion.anio) {
    const anios = aniosDelRango(rango);
    return publicacion.anio >= anios.desde && publicacion.anio <= anios.hasta;
  }
  return true;
}

/** «15/03/2025» para mostrar el rango a la persona. */
export function fechaCorta(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function textoRango(rango: RangoEscaneo) {
  return `del ${fechaCorta(rango.desde)} al ${fechaCorta(rango.hasta)}`;
}

const MENSAJE_FECHA = "Indica una fecha válida.";
/** Vacía o fecha real AAAA-MM-DD (rechaza 2025-02-30 y el año 0000). */
export const fechaValida = (valor: string) => valor === "" || (z.iso.date().safeParse(valor).success && !valor.startsWith("0000"));
export const fechaCampo = z.string({ error: MENSAJE_FECHA }).trim().refine(fechaValida, MENSAJE_FECHA);

/** Reglas del rango sobre fechas ya bien formadas; agrega los errores en los campos desde/hasta. */
export function validarRango(desde: string, hasta: string, hoy: string, contexto: z.RefinementCtx) {
  const limiteFinal = `${anioDe(hoy) + 1}-12-31`;
  if (!desde && hasta) contexto.addIssue({ code: "custom", path: ["desde"], message: "Indica la fecha inicial del rango." });
  if (!desde) return;
  const final = hasta || hoy;
  if (desde < `${ANIO_MINIMO_ESCANEO}-01-01`) contexto.addIssue({ code: "custom", path: ["desde"], message: `La fecha inicial no puede ser anterior al 01/01/${ANIO_MINIMO_ESCANEO}.` });
  if (final > limiteFinal) contexto.addIssue({ code: "custom", path: ["hasta"], message: `La fecha final no puede ser posterior al ${fechaCorta(limiteFinal)}.` });
  if (desde > final) contexto.addIssue({ code: "custom", path: ["hasta"], message: "La fecha final debe ser igual o posterior a la fecha inicial." });
  else if (anioDe(final) - anioDe(desde) + 1 > MAXIMO_ANIOS_RANGO) contexto.addIssue({ code: "custom", path: ["hasta"], message: `El rango puede abarcar como máximo ${MAXIMO_ANIOS_RANGO} años.` });
}

export function rangoDeSolicitud(desde: string, hasta: string, hoy: string): RangoEscaneo | undefined {
  return desde ? { desde, hasta: hasta || hoy } : undefined;
}

/**
 * Valida el rango que envía el formulario. Ambos vacíos = buscar novedades (sin rango).
 * Solo «Desde» = desde esa fecha hasta hoy (`hoy` en AAAA-MM-DD, zona de Ciudad de México).
 */
export function rangoSolicitudEsquema(hoy: string) {
  return z.object({ desde: fechaCampo, hasta: fechaCampo })
    .superRefine(({ desde, hasta }, contexto) => { if (fechaValida(desde) && fechaValida(hasta)) validarRango(desde, hasta, hoy, contexto); })
    .transform(({ desde, hasta }) => rangoDeSolicitud(desde, hasta, hoy));
}
