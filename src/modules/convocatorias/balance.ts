import { clasificarDictamen, type HistorialSnii } from "@/modules/reportes/convocatoria";

// RF-019 (CU-010): balance de una carga en revisión. Para no tener dos definiciones de
// «promoción» o «renovación», cada persona se clasifica con clasificarDictamen del reporte de
// convocatoria anual (RF-028, D-228). El listado no dice si alguien renueva: se deduce de su
// historial aprobado en M3. Nada de esto se guarda; la confirmación queda pendiente (#24).

export type CriterioRenglon = "CVU" | "CODIGO" | "NOMBRE" | "MANUAL" | "AMBIGUO" | "SIN_COINCIDENCIA";

export type RenglonRevision = {
  id: number;
  numero: number;
  nombre: string;
  profesorId: number | null;
  criterio: CriterioRenglon | null;
  nivel: string | null;
};

export const CLASIFICACIONES = ["PROMOCION", "RENOVACION", "NUEVO_INGRESO", "NO_APROBADO", "DUDOSO", "SIN_COINCIDENCIA"] as const;
export type Clasificacion = (typeof CLASIFICACIONES)[number];

export type FilaRevision = {
  clave: string;
  renglonId: number | null;
  numero: number | null;
  nombreListado: string | null;
  profesorId: number | null;
  criterio: CriterioRenglon | null;
  clasificacion: Clasificacion;
};

export type EntradaBalance = {
  programa: "SNII" | "PRODEP";
  anio: number;
  renglones: RenglonRevision[];
  /** Reconocimientos SNII aprobados de M3. */
  historialSnii: HistorialSnii[];
  /** Reconocimientos PRODEP aprobados de M3. */
  historialProdep: { id: number; profesorId: number; inicio: string }[];
  /** Profesores registrados como participantes de la convocatoria. */
  participantes: number[];
};

const CLASE: Record<string, Clasificacion> = { promocion: "PROMOCION", vigente: "RENOVACION", "nuevo-ingreso": "NUEVO_INGRESO" };

export function clasificarCarga(e: EntradaBalance) {
  // La vigencia real está pendiente (D-224); con el 31 de diciembre cuenta como anterior todo
  // reconocimiento que empezó hasta el año de la convocatoria.
  const inicio = `${e.anio}-12-31`;
  const historial = e.programa === "SNII" ? e.historialSnii : e.historialProdep;
  const tieneAnterior = new Set(historial.filter((h) => h.inicio < inicio).map((h) => h.profesorId));

  const filas: FilaRevision[] = e.renglones.map((r) => {
    const fila = { clave: `r${r.id}`, renglonId: r.id, numero: r.numero, nombreListado: r.nombre, profesorId: r.profesorId, criterio: r.criterio };
    if (r.profesorId === null) return { ...fila, clasificacion: r.criterio === "AMBIGUO" ? "DUDOSO" : "SIN_COINCIDENCIA" };
    const renueva = tieneAnterior.has(r.profesorId);
    const tipo = renueva ? "RENOVACION" : e.programa === "SNII" ? "NUEVO_INGRESO" : "PRIMER_RECONOCIMIENTO";
    const clase = clasificarDictamen({
      id: -r.id, profesorId: r.profesorId, programa: e.programa, anio: e.anio, departamento: null, genero: "F",
      resultado: "APROBADO", tipo, nivel: e.programa === "SNII" ? r.nivel : null, inicio,
    }, e.historialSnii);
    return { ...fila, clasificacion: CLASE[clase ?? "vigente"] };
  });

  const enListado = new Set(e.renglones.flatMap((r) => (r.profesorId === null ? [] : [r.profesorId])));
  for (const profesorId of new Set(e.participantes)) {
    if (enListado.has(profesorId)) continue;
    filas.push({ clave: `p${profesorId}`, renglonId: null, numero: null, nombreListado: null, profesorId, criterio: null, clasificacion: "NO_APROBADO" });
  }

  // Un profesor repetido en el listado cuenta una vez; los renglones sin profesor, cada uno.
  const balance = Object.fromEntries(CLASIFICACIONES.map((c) => [c, 0])) as Record<Clasificacion, number>;
  const contados = new Set<number>();
  for (const f of filas) {
    if (f.profesorId !== null) {
      if (contados.has(f.profesorId)) continue;
      contados.add(f.profesorId);
    }
    balance[f.clasificacion]++;
  }
  return { filas, balance };
}
