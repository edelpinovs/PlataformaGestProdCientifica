import { datosLoteEsquema } from "./lotes";
import { FUENTES_ESCANEO, NOMBRES_FUENTE } from "./fuentes";

export type EstadoFuenteResultado = "consultada" | "sin resultados" | "con incidencias" | "no seleccionada";
/** Una línea por fuente; `detalle` explica la incidencia de esa fuente, si la hubo. */
export type FuenteResultado = { fuente: string; estado: EstadoFuenteResultado; detalle?: string };

/** Motivo legible de un error guardado de una fuente; nunca repite el texto técnico. */
function motivo(error: string): string {
  if (error.endsWith(": FALTA_IDENTIFICADOR")) return "falta un identificador o perfil necesario para consultar.";
  if (error.endsWith(": HTTP_429")) return "se alcanzó el límite del proveedor. Reintenta más tarde.";
  if (error.endsWith(": NO_API_KEY")) return "falta configurar la clave de acceso en el servidor.";
  return "no se pudo completar la consulta. Puedes reintentar el escaneo.";
}

/** Presenta únicamente mensajes permitidos; nunca devuelve errores técnicos guardados. */
export function presentarResultadoEscaneo(estado: string, datos: unknown) {
  if (estado !== "COMPLETADO" && estado !== "FALLIDO") return null;
  const lectura = datosLoteEsquema.safeParse(datos);
  if (!lectura.success) return {
    tipo: estado === "FALLIDO" ? "error" as const : "exito" as const,
    mensaje: estado === "FALLIDO" ? "No se pudo completar el escaneo. Puedes reintentarlo." : "Escaneo finalizado.",
    fuentes: [] as FuenteResultado[],
    incidencias: [] as string[],
  };
  const resumen = lectura.data.resumen;
  const fuentes: FuenteResultado[] = (resumen.consultasFuentes?.length ? FUENTES_ESCANEO : []).map(fuente => {
    const consultas = resumen.consultasFuentes!.filter(c => c.fuente === fuente);
    const estado: EstadoFuenteResultado = consultas.every(c => c.estado === "NO_SELECCIONADA") ? "no seleccionada" : consultas.some(c => c.estado === "INCIDENCIA") ? "con incidencias" : consultas.every(c => c.estado === "SIN_RESULTADOS" || c.estado === "NO_SELECCIONADA") ? "sin resultados" : "consultada";
    return { fuente: NOMBRES_FUENTE[fuente], estado };
  });
  const conIncidencias = estado === "FALLIDO" || resumen.errores.length > 0;
  const parcial = conIncidencias && resumen.publicacionesGuardadas > 0;
  // El motivo de una fuente va en su propia línea; lo que no se atribuye a una fuente queda aparte.
  const incidencias = new Set<string>();
  for (const error of resumen.errores) {
    const nombre = /^(Scopus|OpenAlex|ORCID|Crossref|Google Scholar) \(Prof\. \d+\):/.exec(error)?.[1];
    if (!nombre) { incidencias.add("No se pudo completar una consulta o guardar todos sus resultados. Puedes reintentar el escaneo."); continue; }
    const linea = fuentes.find(f => f.fuente === nombre);
    if (linea && !linea.detalle) linea.detalle = motivo(error);
    else if (!linea) incidencias.add(`${nombre}: ${motivo(error)}`);
  }
  if (estado === "FALLIDO" && !incidencias.size && !fuentes.some(f => f.detalle)) incidencias.add("El trabajo no pudo completarse. Puedes reintentar el escaneo.");
  return {
    tipo: parcial ? "aviso" as const : conIncidencias ? "error" as const : "exito" as const,
    mensaje: `${parcial ? "Escaneo con resultados parciales." : conIncidencias ? "Escaneo con incidencias." : "Escaneo finalizado."} Publicaciones encontradas: ${resumen.publicacionesEncontradas}. Guardadas o actualizadas: ${resumen.publicacionesGuardadas}. Autorías nuevas: ${resumen.autoriasCreadas}.${resumen.autoriasRechazadasOmitidas ? ` Autorías omitidas por rechazo previo: ${resumen.autoriasRechazadasOmitidas}. No se volvieron a proponer para revisión.` : ""}${!conIncidencias && !resumen.publicacionesEncontradas ? " No se encontraron publicaciones para el periodo consultado." : ""}`,
    fuentes,
    incidencias: [...incidencias],
  };
}
