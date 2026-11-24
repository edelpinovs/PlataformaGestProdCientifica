// Fechas del panel de administración. Las fechas con hora (alta de usuarios, bitácora) se muestran
// y se buscan en hora de Ciudad de México, como el resto del panel.

export const ZONA_ADMINISTRACION = "America/Mexico_City";

export const formatoFechaAlta = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: ZONA_ADMINISTRACION });

const partesEnZona = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_ADMINISTRACION, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/** Instante en que empieza el día indicado en Ciudad de México (el mes va de 1 a 12). */
export function inicioDelDiaMexico(anio: number, mes: number, dia: number): Date {
  const comoUtc = Date.UTC(anio, mes - 1, dia);
  const partes = Object.fromEntries(partesEnZona.formatToParts(comoUtc).map((p) => [p.type, Number(p.value)]));
  const vistoEnZona = Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
  // La diferencia entre lo que marca el reloj de la zona y UTC es el desfase de ese día.
  return new Date(comoUtc + (comoUtc - vistoEnZona));
}

/**
 * Convierte la búsqueda libre en un periodo cuando es una fecha, con el mismo formato que la
 * búsqueda de PRODEP: `2026` (año), `2026-11` (mes) o `2026-11-24` (día). Los límites son los del
 * día en Ciudad de México. Cualquier otro texto, o una fecha que no existe, devuelve null.
 */
export function rangoFechaBusqueda(texto: string): { desde: Date; hasta: Date } | null {
  const valor = texto.trim();
  let coincidencia = valor.match(/^(\d{4})$/);
  if (coincidencia) {
    const anio = Number(coincidencia[1]);
    if (anio < 1) return null;
    return { desde: inicioDelDiaMexico(anio, 1, 1), hasta: inicioDelDiaMexico(anio + 1, 1, 1) };
  }
  coincidencia = valor.match(/^(\d{4})-(\d{2})$/);
  if (coincidencia) {
    const [anio, mes] = [Number(coincidencia[1]), Number(coincidencia[2])];
    if (anio < 1 || mes < 1 || mes > 12) return null;
    return {
      desde: inicioDelDiaMexico(anio, mes, 1),
      hasta: mes === 12 ? inicioDelDiaMexico(anio + 1, 1, 1) : inicioDelDiaMexico(anio, mes + 1, 1),
    };
  }
  coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (coincidencia) {
    const [anio, mes, dia] = coincidencia.slice(1).map(Number);
    const calendario = new Date(Date.UTC(anio, mes - 1, dia));
    if (anio < 1 || calendario.getUTCMonth() !== mes - 1 || calendario.getUTCDate() !== dia) return null;
    const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
    return {
      desde: inicioDelDiaMexico(anio, mes, dia),
      hasta: inicioDelDiaMexico(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, siguiente.getUTCDate()),
    };
  }
  return null;
}
