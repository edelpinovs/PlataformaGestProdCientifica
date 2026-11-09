import { datosLoteEsquema } from "./lotes";

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
  const conIncidencias = estado === "FALLIDO" || resumen.errores.length > 0;
  const parcial = conIncidencias && resumen.publicacionesGuardadas > 0;
  const incidencias = [...new Set(resumen.errores.map((error) => {
    const fuente = /^(Scopus|OpenAlex|ORCID) \(Prof\. \d+\):/.exec(error)?.[1];
    if (!fuente) return "No se pudo completar una consulta o guardar todos sus resultados. Puedes reintentar el escaneo.";
    return error.endsWith(": NO_API_KEY")
      ? `${fuente}: falta configurar la clave de acceso en el servidor.`
      : `${fuente}: no se pudo completar la consulta. Puedes reintentar el escaneo.`;
  }))];
  if (estado === "FALLIDO" && !incidencias.length) incidencias.push("El trabajo no pudo completarse. Puedes reintentar el escaneo.");
  return {
    tipo: parcial ? "aviso" as const : conIncidencias ? "error" as const : "exito" as const,
    mensaje: `${parcial ? "Escaneo con resultados parciales." : conIncidencias ? "Escaneo con incidencias." : "Escaneo finalizado."} Publicaciones encontradas: ${resumen.publicacionesEncontradas}. Guardadas o actualizadas: ${resumen.publicacionesGuardadas}. Autorías nuevas: ${resumen.autoriasCreadas}.${resumen.autoriasRechazadasOmitidas ? ` Autorías omitidas por rechazo previo: ${resumen.autoriasRechazadasOmitidas}. No se volvieron a proponer para revisión.` : ""}${!conIncidencias && !resumen.publicacionesEncontradas ? " No se encontraron publicaciones para el periodo consultado." : ""}`,
    incidencias,
  };
}
