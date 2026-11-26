// F6 de la importación 2027: crea los Perfiles Deseables PRODEP reales del paquete (#358).
// Funciones puras: reciben lo que hay en la base y lo que trae el paquete, y devuelven un plan. No tocan la base
// ni el disco. Plan y criterio en docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P8, P9, D-285).
//
// Se aplican las mismas reglas que la pantalla de PRODEP: tiempo completo (`validarContratacionProdep`), la vigencia
// de 3 o 6 años que calcula el repo según el historial (`crearEsquemaReconocimientoProdep`, RF-010, D-232) y que
// no haya traslapes (`hayTraslapeProdep`, RF-011). Si la fecha de fin del Excel no coincide con la que calcula el
// repo, NO se ajusta: se reporta.
import {
  crearEsquemaReconocimientoProdep,
  hayTraslapeProdep,
  validarContratacionProdep,
  type PeriodoProdep,
  type RegistroHistorialProdep,
} from "../../src/modules/reconocimientos/prodep";
import { estadoDelPeriodo, type EstadoPeriodo } from "./importar-snii";
import { limpiarTexto } from "./importar-profesores";

export type TipoSolicitudProdep = "PRIMER_RECONOCIMIENTO" | "RENOVACION";

/** Lo que usamos de un registro de `reconocimientos_prodep.json`. */
export interface RegistroProdep {
  profesor_id: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

/** Lo que usamos de un registro de `profesores.json`. */
export interface ProfesorPaqueteProdep {
  id: string;
  codigo_udg?: string | null;
  nombre_completo?: string | null;
}

export interface ProfesorBaseProdep {
  id: number;
  codigo: string;
  tipoContratacion: string;
}

export interface ProdepExistente {
  profesorId: number;
  tipoSolicitud: TipoSolicitudProdep;
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
  inicio: Date;
  fin: Date;
}

export interface PerfilACrear {
  profesorId: number;
  etiqueta: string;
  tipoSolicitud: TipoSolicitudProdep;
  duracionAnios: 3 | 6;
  inicio: string;
  fin: string;
  estado: EstadoPeriodo;
}

export type MotivoOmision =
  | "sin_fechas"
  | "profesor_sin_registro"
  | "sin_codigo"
  | "fuera_de_la_base"
  | "contratacion_pendiente"
  | "sin_tiempo_completo"
  | "duracion_desconocida"
  | "sin_tipo"
  | "fecha_fin_distinta"
  | "dato_invalido"
  | "traslape";

export const ETIQUETA_MOTIVO: Record<MotivoOmision, string> = {
  sin_fechas: "Sin fecha de inicio o de fin",
  profesor_sin_registro: "Profesor que no está en profesores.json",
  sin_codigo: "Profesor sin código UdeG",
  fuera_de_la_base: "Profesor que no está en la base",
  contratacion_pendiente: "Contratación pendiente en la base",
  sin_tiempo_completo: "No es de tiempo completo (P9)",
  duracion_desconocida: "Vigencia que no es de 3 ni de 6 años",
  sin_tipo: "Perfil de 3 años sin tipo de solicitud (D-285)",
  fecha_fin_distinta: "La fecha de fin no es la que calcula el repo",
  dato_invalido: "No pasa las reglas del formulario PRODEP",
  traslape: "Se traslapa con otro periodo",
};

export interface Omitido {
  etiqueta: string;
  motivo: MotivoOmision;
  detalle: string;
}

export interface PlanProdep {
  totalPaquete: number;
  crear: PerfilACrear[];
  /** Ya hay un periodo del mismo profesor con las mismas fechas: no se vuelve a crear. */
  existentes: number;
  omitidos: Omitido[];
}

export interface OpcionesPlanProdep {
  /** Fecha de hoy (AAAA-MM-DD) para calcular el estado de cada periodo. */
  hoy: string;
  /**
   * Tipo de solicitud de los Perfiles de 3 años. Por omisión `null`: no se cargan (D-285). Un valor solo se usa en
   * pruebas, o en una carga real cuando una decisión nueva reemplace a D-285.
   */
  tipoSolicitud3Anios?: TipoSolicitudProdep | null;
}

const limpio = (valor: string | null | undefined) => limpiarTexto(valor ?? "");
const aFecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const aIso = (fecha: Date) => fecha.toISOString().slice(0, 10);

/** Años de vigencia que insinúan las fechas del paquete: 3 o 6; `null` si no es ninguno de los dos. */
export function duracionDelPaquete(inicio: string, fin: string): 3 | 6 | null {
  const dias = (aFecha(fin).getTime() - aFecha(inicio).getTime()) / 86_400_000;
  const anios = Math.round(dias / 365.25);
  return anios === 3 || anios === 6 ? anios : null;
}

/** D-285 (P8): los de 6 años son `RENOVACION`; los de 3 años dependen de la decisión (por omisión, sin tipo). */
export function tipoSolicitudDelPerfil(
  duracion: 3 | 6,
  tipoSolicitud3Anios: TipoSolicitudProdep | null = null,
): TipoSolicitudProdep | null {
  return duracion === 6 ? "RENOVACION" : tipoSolicitud3Anios;
}

export function planProdep(
  base: ProfesorBaseProdep[],
  existentes: ProdepExistente[],
  registros: RegistroProdep[],
  profesoresPaquete: ProfesorPaqueteProdep[],
  { hoy, tipoSolicitud3Anios = null }: OpcionesPlanProdep,
): PlanProdep {
  const porCodigo = new Map(base.map((p) => [p.codigo, p]));
  const paquetePorId = new Map(profesoresPaquete.map((p) => [p.id, p]));
  // El historial del profesor, como lo arma la pantalla: lo que ya tiene en la base más lo ya planeado en este lote.
  const historial = new Map<number, ProdepExistente[]>();
  for (const e of existentes) historial.set(e.profesorId, [...(historial.get(e.profesorId) ?? []), e]);

  const plan: PlanProdep = { totalPaquete: registros.length, crear: [], existentes: 0, omitidos: [] };

  // Orden estable: por profesor y fecha de inicio, para que el plan no dependa del orden del archivo.
  const ordenados = [...registros].sort(
    (a, b) => a.profesor_id.localeCompare(b.profesor_id) || limpio(a.fecha_inicio).localeCompare(limpio(b.fecha_inicio)),
  );

  for (const r of ordenados) {
    const paquete = paquetePorId.get(r.profesor_id);
    const etiqueta = limpio(paquete?.nombre_completo) || r.profesor_id;
    const omitir = (motivo: MotivoOmision, detalle: string) => plan.omitidos.push({ etiqueta, motivo, detalle });

    // 1. Fechas: sin ellas no hay periodo que cargar.
    const inicio = limpio(r.fecha_inicio);
    const fin = limpio(r.fecha_fin);
    if (!inicio || !fin) {
      omitir("sin_fechas", "El Perfil vigente no trae fecha de inicio o de fin; no se puede cargar.");
      continue;
    }

    // 2. Profesor: id del paquete → código UdeG → profesor de la base.
    if (!paquete) {
      omitir("profesor_sin_registro", "El profesor no aparece en profesores.json.");
      continue;
    }
    const codigo = limpio(paquete.codigo_udg).toUpperCase();
    if (!codigo) {
      omitir("sin_codigo", "El profesor no tiene código UdeG; no se puede cruzar con la base.");
      continue;
    }
    const profesor = porCodigo.get(codigo);
    if (!profesor) {
      omitir("fuera_de_la_base", "El profesor no está en la base (por ejemplo, no se dio de alta en F4).");
      continue;
    }

    // 3. Ya existe un periodo del mismo profesor con las mismas fechas: no se vuelve a crear (idempotencia).
    const previos = historial.get(profesor.id) ?? [];
    if (previos.some((p) => aIso(p.inicio) === inicio && aIso(p.fin) === fin)) {
      plan.existentes++;
      continue;
    }

    // 4. Tiempo completo, con la misma regla de la pantalla (P9).
    const errorContratacion = validarContratacionProdep(profesor.tipoContratacion);
    if (errorContratacion) {
      if (profesor.tipoContratacion === "PENDIENTE") omitir("contratacion_pendiente", errorContratacion);
      else omitir("sin_tiempo_completo", errorContratacion);
      continue;
    }

    // 5. Duración y tipo de solicitud (P8, D-285).
    const duracion = duracionDelPaquete(inicio, fin);
    if (!duracion) {
      omitir("duracion_desconocida", `Las fechas ${inicio} a ${fin} no corresponden a una vigencia de 3 ni de 6 años.`);
      continue;
    }
    const tipo = tipoSolicitudDelPerfil(duracion, tipoSolicitud3Anios);
    if (!tipo) {
      omitir("sin_tipo", "El Excel no dice si es primer reconocimiento o renovación y no se inventa (D-285).");
      continue;
    }

    // 6. Las mismas reglas del formulario, incluida la fecha de fin que calcula el repo según el historial.
    const registrosHistorial: RegistroHistorialProdep[] = previos.map((p) => ({
      tipoSolicitud: p.tipoSolicitud,
      resultado: p.resultado,
      fechaInicio: aIso(p.inicio),
      fechaFin: aIso(p.fin),
    }));
    const validacion = crearEsquemaReconocimientoProdep(registrosHistorial).safeParse({
      profesorId: profesor.id,
      tipoSolicitud: tipo,
      resultado: "APROBADO",
      fechaInicio: inicio,
      fechaFin: fin,
    });
    if (!validacion.success) {
      const problema = validacion.error.issues[0];
      const mensaje = problema?.message ?? "No pasa las reglas del formulario.";
      if (problema?.path.includes("fechaFin") && mensaje.startsWith("La fecha de fin debe ser")) {
        omitir("fecha_fin_distinta", `El Excel trae ${fin}. ${mensaje} No se ajusta.`);
      } else {
        omitir("dato_invalido", mensaje);
      }
      continue;
    }

    // 7. Se traslapa con la base o con lo ya planeado (RF-011).
    const nuevo: PeriodoProdep = { inicio: aFecha(inicio), fin: aFecha(fin), resultado: "APROBADO" };
    const choque = hayTraslapeProdep(
      previos.map((p) => ({ inicio: p.inicio, fin: p.fin, resultado: p.resultado })),
      nuevo,
    );
    if (choque) {
      omitir("traslape", `Se traslapa con otro periodo (${aIso(choque.inicio)} a ${aIso(choque.fin)}).`);
      continue;
    }

    historial.set(profesor.id, [
      ...previos,
      { profesorId: profesor.id, tipoSolicitud: tipo, resultado: "APROBADO", inicio: nuevo.inicio, fin: nuevo.fin },
    ]);
    plan.crear.push({
      profesorId: profesor.id,
      etiqueta,
      tipoSolicitud: tipo,
      duracionAnios: duracion,
      inicio,
      fin,
      estado: estadoDelPeriodo(inicio, fin, hoy),
    });
  }

  return plan;
}

// ─── Informes ────────────────────────────────────────────────────────────────

export function contarOmitidos(plan: PlanProdep): Record<MotivoOmision, number> {
  const cuenta = Object.fromEntries(Object.keys(ETIQUETA_MOTIVO).map((m) => [m, 0])) as Record<MotivoOmision, number>;
  for (const o of plan.omitidos) cuenta[o.motivo]++;
  return cuenta;
}

export function contarPorTipoYEstado(plan: PlanProdep): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const r of plan.crear) {
    const clave = `${r.tipoSolicitud} (${r.duracionAnios} años) · ${r.estado}`;
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  return new Map([...cuenta].sort(([a], [b]) => a.localeCompare(b)));
}

/** Solo conteos, sin nombres: es lo único que se imprime en la terminal. */
export function resumenAnonimo(plan: PlanProdep): string {
  const omitidos = contarOmitidos(plan);
  const porTipo = [...contarPorTipoYEstado(plan)].map(([clave, n]) => `  ${clave.padEnd(46)} ${n}`);
  return [
    `Perfiles en el paquete:      ${plan.totalPaquete}`,
    `A crear:                     ${plan.crear.length}`,
    `Ya existen en la base:       ${plan.existentes}`,
    `Omitidos (al informe):       ${plan.omitidos.length}`,
    "",
    "A crear por tipo y estado:",
    ...(porTipo.length > 0 ? porTipo : ["  (ninguno)"]),
    "",
    "Omitidos por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO) as MotivoOmision[]).map((m) => `  ${ETIQUETA_MOTIVO[m].padEnd(48)} ${omitidos[m]}`),
  ].join("\n");
}

/** Con nombres: se escribe solo en datos-reales/, que git ignora. */
export function informePlanProdep(plan: PlanProdep): string {
  const partes = ["# Plan de Perfiles PRODEP (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push("```", resumenAnonimo(plan), "```", "");
  if (plan.omitidos.length > 0) {
    partes.push("## Omitidos: se informan al cliente", "");
    for (const o of plan.omitidos) partes.push(`- ${o.etiqueta} — ${ETIQUETA_MOTIVO[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  partes.push("## A crear", "");
  for (const r of plan.crear) {
    partes.push(`- ${r.etiqueta} · ${r.tipoSolicitud} · ${r.inicio} a ${r.fin} · ${r.estado}`);
  }
  return partes.join("\n");
}

// ─── Bitácora y reversión ────────────────────────────────────────────────────

export interface CreadoProdep {
  id: number;
  profesorId: number;
  tipoSolicitud: string;
  inicio: string;
  fin: string;
}

export interface BitacoraProdep {
  fase: "prodep";
  fecha: string;
  host: string;
  creados: CreadoProdep[];
}

export function crearBitacoraProdep(creados: CreadoProdep[], fecha: Date, host: string): BitacoraProdep {
  return { fase: "prodep", fecha: fecha.toISOString(), host, creados };
}

export interface ProdepActual {
  profesorId: number;
  tipoSolicitud: string;
  resultado: string;
  inicio: string;
  fin: string;
  convocatoriaId: number | null;
}

/**
 * Solo se borra lo que conserva los valores de la bitácora, sigue aprobado y sin convocatoria (contrato §4.8). Un
 * resultado oficial de convocatoria no se borra (D-107); el resto se reporta.
 */
export function prepararReversionProdep(bitacora: BitacoraProdep, actuales: Map<number, ProdepActual>) {
  const borrar: CreadoProdep[] = [];
  const conflictos: { id: number; motivo: string }[] = [];
  for (const c of bitacora.creados) {
    const actual = actuales.get(c.id);
    if (!actual) conflictos.push({ id: c.id, motivo: "El Perfil ya no existe en la base." });
    else if (actual.convocatoriaId !== null) {
      conflictos.push({ id: c.id, motivo: "Ya forma parte de un resultado de convocatoria (D-107); no se borra." });
    } else if (
      actual.profesorId !== c.profesorId ||
      actual.tipoSolicitud !== c.tipoSolicitud ||
      actual.resultado !== "APROBADO" ||
      actual.inicio !== c.inicio ||
      actual.fin !== c.fin
    ) {
      conflictos.push({ id: c.id, motivo: "El Perfil cambió después de la carga; no se toca." });
    } else borrar.push(c);
  }
  return { borrar, conflictos };
}
