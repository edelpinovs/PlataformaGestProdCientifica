import { calcularVigenciaProdep, hayTraslapeProdep, validarContratacionProdep } from "@/modules/reconocimientos/prodep";
import { hayTraslape } from "@/modules/reconocimientos/vigencia";
import type { CriterioRenglon } from "./balance";
import type { Nivel } from "./lectura";

// RF-019 (CU-010): qué registra en M3 la confirmación de una carga (la «actualización masiva»).
// Reutiliza las reglas de M3 (RF-008 a RF-011) en lugar de reescribirlas. Lo dudoso no se adivina:
// se omite y se muestra en la previsualización para registrarlo a mano (como D-260). El resultado de
// los participantes lo guarda recalcularConvocatoria (RF-018) al confirmar.

export type RenglonConfirmacion = {
  id: number;
  numero: number;
  nombre: string;
  profesorId: number | null;
  criterio: CriterioRenglon | null;
  nivel: Nivel | null;
  /** Vigencia que trae el archivo («aaaa-mm-dd»), o null. */
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
};

type Resultado = "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
type TipoSolicitud = "PRIMER_RECONOCIMIENTO" | "RENOVACION";

export type EntradaConfirmacion = {
  programa: "SNII" | "PRODEP";
  anio: number;
  renglones: RenglonConfirmacion[];
  /** Tipo de contratación de cada profesor que coincidió (PRODEP exige tiempo completo). */
  contratacion: Record<number, string>;
  historialSnii: { id: number; profesorId: number; resultado: Resultado; inicio: string; fin: string }[];
  historialProdep: { id: number; profesorId: number; tipoSolicitud: TipoSolicitud; resultado: Resultado; inicio: string; fin: string }[];
};

export type NuevoSnii = {
  renglonId: number; numero: number; profesorId: number;
  nivel: Exclude<Nivel, "EMERITO">; tipoParticipacion: "NUEVO_INGRESO" | "RENOVACION"; inicio: string; fin: string;
};
export type NuevoProdep = { renglonId: number; numero: number; profesorId: number; tipoSolicitud: TipoSolicitud; inicio: string; fin: string };
export type Omitido = { renglonId: number; numero: number; nombre: string; profesorId: number; motivo: string };

export type PlanConfirmacion = { bloqueo: string | null; snii: NuevoSnii[]; prodep: NuevoProdep[]; omitidos: Omitido[] };

/**
 * D-292 sigue pendiente de que la Coordinación la confirme y confirmar no se puede deshacer
 * (revisión del #369, hallazgo 1): mientras sea false, un SNII que el listado trae sin vigencia se
 * omite en lugar de calcular la vigencia con vigenciaSnii. Al confirmarse D-292 se cambia a true.
 */
export const VIGENCIA_SNII_CONFIRMADA = false;

/**
 * D-224, opción (a), pendiente de confirmar con la Coordinación (D-292): el listado del SNII no trae
 * vigencia; los resultados de la convocatoria del año N empiezan el 1 de enero de N+1 y terminan el
 * 31 de diciembre, 4 años los de Candidato y 5 los de nivel I a III. Emérito no tiene regla: null.
 */
export function vigenciaSnii(nivel: Nivel, anio: number): { inicio: string; fin: string } | null {
  if (nivel === "EMERITO") return null;
  const anios = nivel === "CANDIDATO" ? 4 : 5;
  return { inicio: `${anio + 1}-01-01`, fin: `${anio + anios}-12-31` };
}

const fecha = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
const traslape = (choque: { inicio: Date; fin: Date }) =>
  `Se traslapa con el periodo registrado del ${choque.inicio.toISOString().slice(0, 10)} al ${choque.fin.toISOString().slice(0, 10)}.`;

export function planearConfirmacion(
  e: EntradaConfirmacion,
  { vigenciaSniiConfirmada = VIGENCIA_SNII_CONFIRMADA }: { vigenciaSniiConfirmada?: boolean } = {},
): PlanConfirmacion {
  const plan: PlanConfirmacion = { bloqueo: null, snii: [], prodep: [], omitidos: [] };

  // Un dudoso es alguien de CUValles que el cruce no supo distinguir: confirmarlo sin él lo dejaría
  // fuera. Los «sin coincidencia» no bloquean: en el listado nacional casi todos son de otras instituciones.
  const dudosos = e.renglones.filter((r) => r.profesorId === null && r.criterio === "AMBIGUO").length;
  if (dudosos) {
    plan.bloqueo = dudosos === 1
      ? "Resuelve el renglón dudoso antes de confirmar: asígnale su profesor."
      : `Resuelve los ${dudosos} renglones dudosos antes de confirmar: asígnales su profesor.`;
  }

  const primerRenglon = new Map<number, number>();
  for (const r of e.renglones) {
    if (r.profesorId === null) continue;
    const profesorId = r.profesorId;
    const omitir = (motivo: string) => plan.omitidos.push({ renglonId: r.id, numero: r.numero, nombre: r.nombre, profesorId, motivo });

    const anterior = primerRenglon.get(profesorId);
    if (anterior !== undefined) { omitir(`El profesor ya está en el renglón ${anterior}.`); continue; }
    primerRenglon.set(profesorId, r.numero);

    if (e.programa === "SNII") {
      if (!r.nivel) { omitir("El listado no trae un nivel reconocible."); continue; }
      const delArchivo = r.vigenciaInicio && r.vigenciaFin ? { inicio: r.vigenciaInicio, fin: r.vigenciaFin } : null;
      if (!delArchivo && !vigenciaSniiConfirmada && r.nivel !== "EMERITO") {
        omitir("El listado no trae la vigencia y falta confirmar la regla de la Coordinación (D-292).");
        continue;
      }
      const vigencia = delArchivo ?? vigenciaSnii(r.nivel, e.anio);
      if (!vigencia || r.nivel === "EMERITO") { omitir("La vigencia de Emérito aún no está definida (D-224)."); continue; }
      // Un «No aprobado» no otorga vigencia ni cuenta como periodo anterior (D-104).
      const periodos = e.historialSnii.filter((h) => h.profesorId === profesorId && h.resultado !== "NO_APROBADO");
      const renueva = periodos.some((h) => h.inicio < vigencia.inicio);
      // Misma regla que el esquema de M3 (reconocimientoSnii, RF-008, D-225).
      if (r.nivel === "CANDIDATO" && renueva) { omitir("El nivel Candidato no admite renovación (D-225); regístralo a mano en SNII y PRODEP."); continue; }
      const choque = hayTraslape(periodos.map((h) => ({ inicio: fecha(h.inicio), fin: fecha(h.fin) })), { inicio: fecha(vigencia.inicio), fin: fecha(vigencia.fin) });
      if (choque) { omitir(traslape(choque)); continue; }
      plan.snii.push({
        renglonId: r.id, numero: r.numero, profesorId, nivel: r.nivel,
        tipoParticipacion: renueva ? "RENOVACION" : "NUEVO_INGRESO", inicio: vigencia.inicio, fin: vigencia.fin,
      });
      continue;
    }

    const contratacion = validarContratacionProdep(e.contratacion[profesorId]);
    if (contratacion) { omitir(contratacion); continue; }
    if (!r.vigenciaInicio) { omitir("El listado no trae la vigencia de esta persona."); continue; }
    const historial = e.historialProdep.filter((h) => h.profesorId === profesorId);
    const tipoSolicitud: TipoSolicitud = historial.some((h) => h.resultado === "APROBADO" && h.inicio < r.vigenciaInicio!)
      ? "RENOVACION" : "PRIMER_RECONOCIMIENTO";
    const { fechaFin } = calcularVigenciaProdep(
      { tipoSolicitud, resultado: "APROBADO", fechaInicio: r.vigenciaInicio },
      historial.map((h) => ({ id: h.id, tipoSolicitud: h.tipoSolicitud, resultado: h.resultado, fechaInicio: h.inicio, fechaFin: h.fin })),
    );
    // Como en la importación (#358): si el archivo trae otro fin, no se ajusta; se informa.
    if (r.vigenciaFin && r.vigenciaFin !== fechaFin) {
      omitir(`La fecha de fin del listado (${r.vigenciaFin}) no coincide con la vigencia de RF-010 (${fechaFin}).`);
      continue;
    }
    const choque = hayTraslapeProdep(
      historial.map((h) => ({ id: h.id, inicio: fecha(h.inicio), fin: fecha(h.fin), resultado: h.resultado })),
      { inicio: fecha(r.vigenciaInicio), fin: fecha(fechaFin), resultado: "APROBADO" },
    );
    if (choque) { omitir(traslape(choque)); continue; }
    plan.prodep.push({ renglonId: r.id, numero: r.numero, profesorId, tipoSolicitud, inicio: r.vigenciaInicio, fin: fechaFin });
  }
  return plan;
}
