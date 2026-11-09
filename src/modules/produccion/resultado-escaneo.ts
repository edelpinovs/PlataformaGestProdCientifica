import { datosLoteEsquema } from "./lotes";
import { FUENTES_ESCANEO, NOMBRES_FUENTE } from "./fuentes";

/** Presenta únicamente mensajes permitidos; nunca devuelve errores técnicos guardados. */
export function presentarResultadoEscaneo(estado: string, datos: unknown) {
  if (estado !== "COMPLETADO" && estado !== "FALLIDO") return null;
  const lectura = datosLoteEsquema.safeParse(datos);
  if (!lectura.success) return {
    tipo: estado === "FALLIDO" ? "error" as const : "exito" as const,
    mensaje: estado === "FALLIDO" ? "No se pudo completar el escaneo. Puedes reintentarlo." : "Escaneo finalizado.",
    incidencias: [] as string[],
  };
  const resumen = lectura.data.resumen;
  const fuentes = (resumen.consultasFuentes?.length ? FUENTES_ESCANEO : []).map(fuente => {
    const consultas = resumen.consultasFuentes!.filter(c => c.fuente === fuente);
    const estado = consultas.every(c => c.estado === "NO_SELECCIONADA") ? "no seleccionada" : consultas.some(c => c.estado === "INCIDENCIA") ? "con incidencias" : consultas.every(c => c.estado === "SIN_RESULTADOS" || c.estado === "NO_SELECCIONADA") ? "sin resultados" : "consultada";
    return `${NOMBRES_FUENTE[fuente]}: ${estado}.`;
  });
  const conIncidencias = estado === "FALLIDO" || resumen.errores.length > 0;
  const parcial = conIncidencias && resumen.publicacionesGuardadas > 0;
  const incidencias = [...new Set(resumen.errores.map((error) => {
    const fuente = /^(Scopus|OpenAlex|ORCID|Crossref|Google Scholar) \(Prof\. \d+\):/.exec(error)?.[1];
    if (!fuente) return "No se pudo completar una consulta o guardar todos sus resultados. Puedes reintentar el escaneo.";
    if (error.endsWith(": FALTA_IDENTIFICADOR")) return `${fuente}: falta un identificador o perfil necesario para consultar.`;
    if (error.endsWith(": HTTP_429")) return `${fuente}: se alcanzó el límite del proveedor. Reintenta más tarde.`;
    return error.endsWith(": NO_API_KEY")
      ? `${fuente}: falta configurar la clave de acceso en el servidor.`
      : `${fuente}: no se pudo completar la consulta. Puedes reintentar el escaneo.`;
  }))];
  if (estado === "FALLIDO" && !incidencias.length) incidencias.push("El trabajo no pudo completarse. Puedes reintentar el escaneo.");
  return {
    tipo: parcial ? "aviso" as const : conIncidencias ? "error" as const : "exito" as const,
    mensaje: `${parcial ? "Escaneo con resultados parciales." : conIncidencias ? "Escaneo con incidencias." : "Escaneo finalizado."} Publicaciones encontradas: ${resumen.publicacionesEncontradas}. Guardadas o actualizadas: ${resumen.publicacionesGuardadas}. Autorías nuevas: ${resumen.autoriasCreadas}.${!conIncidencias && !resumen.publicacionesEncontradas ? " No se encontraron publicaciones para el periodo consultado." : ""}`,
    incidencias: [...fuentes,...incidencias],
  };
}
