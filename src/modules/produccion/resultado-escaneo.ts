import { consultasDeFuentes, datosLoteEsquema, erroresDeConsulta } from "./lotes";
import { FUENTES_ESCANEO, NOMBRES_FUENTE } from "./fuentes";

export type EstadoFuenteResultado = "consultada" | "sin resultados" | "falló" | "sin identificador" | "no seleccionada";
/** Una línea por fuente; `detalle` une los motivos distintos de su fallo, si lo hubo. */
export type FuenteResultado = { fuente: string; estado: EstadoFuenteResultado; obras?: number; detalle?: string };

/** Motivo legible de un error guardado de una fuente; nunca repite el texto técnico. */
function motivo(error: string): string {
  if (error.endsWith(": HTTP_429")) return "se alcanzó el límite del proveedor. Reintenta más tarde.";
  if (error.endsWith(": NO_API_KEY")) return "falta configurar la clave de acceso en el servidor.";
  return "no se pudo completar la consulta. Puedes reintentar el escaneo.";
}

/** Presenta únicamente mensajes permitidos; nunca devuelve errores técnicos guardados. */
export function presentarResultadoEscaneo(estado: string, datos: unknown) {
  if (estado !== "COMPLETADO" && estado !== "FALLIDO" && estado !== "CANCELADO") return null;
  const cancelado = estado === "CANCELADO";
  const lectura = datosLoteEsquema.safeParse(datos);
  if (!lectura.success) return {
    tipo: estado === "FALLIDO" ? "error" as const : cancelado ? "aviso" as const : "exito" as const,
    mensaje: estado === "FALLIDO" ? "No se pudo completar el escaneo. Puedes reintentarlo." : cancelado ? "La búsqueda se canceló antes de terminar." : "Escaneo finalizado.",
    fuentes: [] as FuenteResultado[],
    incidencias: [] as string[],
    autoriasNuevas: 0,
    profesorUnico: undefined as number | undefined,
  };
  const resumen = lectura.data.resumen;
  const todas = consultasDeFuentes(resumen);
  const notasIdentificador = new Map<string, string>();
  const fuentes: FuenteResultado[] = (todas.length ? FUENTES_ESCANEO : []).map(fuente => {
    const consultas = todas.filter(c => c.fuente === fuente && c.estado !== "NO_SELECCIONADA");
    const sinIdentificador = consultas.filter(c => c.estado === "SIN_IDENTIFICADOR").length;
    const consultadas = consultas.length - sinIdentificador;
    const estado: EstadoFuenteResultado = !consultas.length ? "no seleccionada" : consultas.some(c => c.estado === "INCIDENCIA") ? "falló"
      : !consultadas ? "sin identificador" : consultas.some(c => c.estado === "COMPLETADA") ? "consultada" : "sin resultados";
    const obras = consultas.reduce((suma, c) => suma + c.cantidad, 0);
    // La falta de identificador no es una falla: se explica qué hacer, sin color de error.
    const detalle = !sinIdentificador ? undefined : !consultadas
      ? `falta el identificador del profesor para esta fuente. Regístralo en Profesores para consultarla.`
      : `${sinIdentificador} ${sinIdentificador === 1 ? "profesor no tiene" : "profesores no tienen"} identificador para esta fuente.`;
    // En una fuente que además falló, la nota va después del motivo de la falla.
    if (detalle && estado === "falló") notasIdentificador.set(NOMBRES_FUENTE[fuente], detalle);
    return { fuente: NOMBRES_FUENTE[fuente], estado, ...(obras ? { obras } : {}), ...(detalle && estado !== "falló" ? { detalle } : {}) };
  });
  const errores = erroresDeConsulta(resumen);
  // Un trabajo FALLIDO sin errores guardados se interrumpió; uno que solo careció de identificadores no falló.
  const conIncidencias = errores.length > 0 || (estado === "FALLIDO" && !resumen.errores.length);
  const parcial = conIncidencias && resumen.publicacionesGuardadas > 0;
  // El motivo de una fuente va en su propia línea; lo que no se atribuye a una fuente queda aparte.
  const incidencias = new Set<string>();
  for (const error of errores) {
    const nombre = /^(Scopus|OpenAlex|ORCID|Crossref|Google Scholar) \(Prof\. \d+\):/.exec(error)?.[1];
    if (!nombre) { incidencias.add("No se pudo completar una consulta o guardar todos sus resultados. Puedes reintentar el escaneo."); continue; }
    const linea = fuentes.find(f => f.fuente === nombre);
    if (!linea) { incidencias.add(`${nombre}: ${motivo(error)}`); continue; }
    // Una misma fuente puede fallar por varias causas en distintos profesores: se muestran todas, sin repetir.
    const motivos = linea.detalle ? linea.detalle.split(" · ") : [];
    if (!motivos.includes(motivo(error))) linea.detalle = [...motivos, motivo(error)].join(" · ");
  }
  for (const linea of fuentes) {
    const nota = notasIdentificador.get(linea.fuente);
    if (nota) linea.detalle = linea.detalle ? `${linea.detalle} · ${nota}` : nota;
  }
  if (conIncidencias && !incidencias.size && !fuentes.some(f => f.estado === "falló")) incidencias.add("El trabajo no pudo completarse. Puedes reintentar el escaneo.");
  return {
    tipo: cancelado || parcial ? "aviso" as const : conIncidencias ? "error" as const : "exito" as const,
    mensaje: `${cancelado ? "La búsqueda se canceló antes de terminar; se conserva lo guardado hasta ese momento." : parcial ? "Escaneo con resultados parciales." : conIncidencias ? "Escaneo con incidencias." : "Escaneo finalizado."} Publicaciones encontradas: ${resumen.publicacionesEncontradas}. Guardadas o actualizadas: ${resumen.publicacionesGuardadas}. Autorías nuevas: ${resumen.autoriasCreadas}.${resumen.autoriasRechazadasOmitidas ? ` Autorías omitidas por rechazo previo: ${resumen.autoriasRechazadasOmitidas}. No se volvieron a proponer para revisión.` : ""}${!cancelado && !conIncidencias && !resumen.publicacionesEncontradas ? " No se encontraron publicaciones para el periodo consultado." : ""}`,
    fuentes,
    incidencias: [...incidencias],
    // Para enlazar el resultado con Publicaciones (un solo profesor) y con Validación (autorías por revisar).
    autoriasNuevas: resumen.autoriasCreadas,
    profesorUnico: lectura.data.profesoresIds.length === 1 ? lectura.data.profesoresIds[0] : undefined,
  };
}
