// F5 de la importación 2027: crea los reconocimientos SNII reales del paquete (#357).
// Funciones puras: reciben lo que hay en la base y lo que trae el paquete, y devuelven un plan. No tocan la base
// ni el disco. Plan y criterio en docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P7, D-284).
//
// Solo se carga un periodo si el paquete trae su tipo de participación (D-284, opción B): el tipo no se inventa.
// Se validan las mismas reglas del formulario de SNII (`reconocimientoSnii`, con D-225) y no se admiten traslapes
// (`hayTraslape`, D-103). El script nunca escribe el CVU: se valida con el que el profesor ya tiene en la base.
import { reconocimientoSnii } from "../../src/modules/reconocimientos/snii";
import { hayTraslape, type PeriodoVigencia } from "../../src/modules/reconocimientos/vigencia";
import { limpiarTexto } from "./importar-profesores";

/**
 * D-284 (P7): `solo_con_tipo` carga únicamente lo que trae su tipo; `inferir` aplicaría la opción A del plan.
 * `inferir` solo se usa en pruebas: usarlo en una carga real exigiría una decisión nueva que reemplace a D-284.
 */
export type EstrategiaP7 = "solo_con_tipo" | "inferir";
export const ESTRATEGIA_P7_POR_OMISION: EstrategiaP7 = "solo_con_tipo";

export type NivelSnii = "CANDIDATO" | "NIVEL_1" | "NIVEL_2" | "NIVEL_3" | "EMERITO";
export type TipoParticipacion = "NUEVO_INGRESO" | "RENOVACION";
export type EstadoPeriodo = "VIGENTE" | "POR_INICIAR" | "VENCIDO";

const NIVELES: Record<string, NivelSnii> = {
  C: "CANDIDATO",
  I: "NIVEL_1",
  II: "NIVEL_2",
  III: "NIVEL_3",
  E: "EMERITO",
};

/** Lo que usamos de un registro de `reconocimientos_snii.json`. */
export interface RegistroSnii {
  profesor_id: string;
  nivel: string;
  fecha_inicio: string;
  fecha_fin: string;
  nivel_anterior?: string | null;
  resultado_convocatoria?: string | null;
  estatus_observacion?: string | null;
}

/** Lo que usamos de un registro de `profesores.json`. */
export interface ProfesorPaquete {
  id: string;
  codigo_udg?: string | null;
  nombre_completo?: string | null;
}

export interface ProfesorBaseSnii {
  id: number;
  codigo: string;
  cvu: string | null;
}

export interface SniiExistente {
  profesorId: number;
  inicio: Date;
  fin: Date;
}

export interface ReconocimientoACrear {
  profesorId: number;
  etiqueta: string;
  nivel: NivelSnii;
  tipoParticipacion: TipoParticipacion;
  inicio: string;
  fin: string;
  estado: EstadoPeriodo;
}

export type MotivoOmision =
  | "nivel_desconocido"
  | "profesor_sin_registro"
  | "sin_codigo"
  | "fuera_de_la_base"
  | "sin_cvu"
  | "sin_tipo"
  | "dato_invalido"
  | "traslape";

export const ETIQUETA_MOTIVO: Record<MotivoOmision, string> = {
  nivel_desconocido: "Nivel que no se reconoce",
  profesor_sin_registro: "Profesor que no está en profesores.json",
  sin_codigo: "Profesor sin código UdeG",
  fuera_de_la_base: "Profesor que no está en la base",
  sin_cvu: "Profesor sin CVU en la base",
  sin_tipo: "Sin tipo de participación (D-284)",
  dato_invalido: "No pasa las reglas del formulario SNII",
  traslape: "Se traslapa con otro periodo",
};

export interface Omitido {
  etiqueta: string;
  motivo: MotivoOmision;
  detalle: string;
}

export interface PlanSnii {
  totalPaquete: number;
  crear: ReconocimientoACrear[];
  /** Ya hay un periodo del mismo profesor con las mismas fechas: no se vuelve a crear. */
  existentes: number;
  omitidos: Omitido[];
}

const limpio = (valor: string | null | undefined) => limpiarTexto(valor ?? "");
const aFecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const aIso = (fecha: Date) => fecha.toISOString().slice(0, 10);

/** Tipo de participación que el paquete permite afirmar; `null` si no lo trae (D-284). */
export function tipoParticipacion(
  registro: Pick<RegistroSnii, "nivel_anterior" | "resultado_convocatoria" | "estatus_observacion">,
  nivel: NivelSnii,
  estrategia: EstrategiaP7 = ESTRATEGIA_P7_POR_OMISION,
): TipoParticipacion | null {
  const resultado = limpio(registro.resultado_convocatoria).toUpperCase();
  const estatus = limpio(registro.estatus_observacion).toUpperCase();
  if (resultado === "INGRESO") return "NUEVO_INGRESO";
  if (resultado === "PROMOVIDO") return "RENOVACION";
  if (resultado === "SE_MANTUVO" && estatus === "PARTICIPO_CONVOCATORIA_2026") return "RENOVACION";
  if (estrategia === "inferir") {
    // Opción A del plan: Candidato no renueva (D-225); con un periodo previo y otro nivel, se renueva.
    return nivel !== "CANDIDATO" && limpio(registro.nivel_anterior) ? "RENOVACION" : "NUEVO_INGRESO";
  }
  return null;
}

export function estadoDelPeriodo(inicio: string, fin: string, hoy: string): EstadoPeriodo {
  if (inicio > hoy) return "POR_INICIAR";
  if (fin < hoy) return "VENCIDO";
  return "VIGENTE";
}

export interface OpcionesPlanSnii {
  /** Fecha de hoy (AAAA-MM-DD) para calcular el estado de cada periodo. */
  hoy: string;
  estrategia?: EstrategiaP7;
}

export function planSnii(
  base: ProfesorBaseSnii[],
  existentes: SniiExistente[],
  registros: RegistroSnii[],
  profesoresPaquete: ProfesorPaquete[],
  { hoy, estrategia = ESTRATEGIA_P7_POR_OMISION }: OpcionesPlanSnii,
): PlanSnii {
  const porCodigo = new Map(base.map((p) => [p.codigo, p]));
  const paquetePorId = new Map(profesoresPaquete.map((p) => [p.id, p]));
  const periodosPorProfesor = new Map<number, PeriodoVigencia[]>();
  for (const e of existentes) {
    periodosPorProfesor.set(e.profesorId, [...(periodosPorProfesor.get(e.profesorId) ?? []), { inicio: e.inicio, fin: e.fin }]);
  }

  const plan: PlanSnii = { totalPaquete: registros.length, crear: [], existentes: 0, omitidos: [] };

  // Orden estable: por profesor y fecha de inicio, para que el plan no dependa del orden del archivo.
  const ordenados = [...registros].sort(
    (a, b) => a.profesor_id.localeCompare(b.profesor_id) || a.fecha_inicio.localeCompare(b.fecha_inicio),
  );

  for (const r of ordenados) {
    const paquete = paquetePorId.get(r.profesor_id);
    const etiqueta = limpio(paquete?.nombre_completo) || r.profesor_id;
    const omitir = (motivo: MotivoOmision, detalle: string) => plan.omitidos.push({ etiqueta, motivo, detalle });

    // 1. Nivel.
    const nivel = NIVELES[limpio(r.nivel).toUpperCase()];
    if (!nivel) {
      omitir("nivel_desconocido", `El nivel «${limpio(r.nivel)}» no se reconoce.`);
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

    // 3. CVU que el profesor ya tiene en la base (este script nunca lo escribe).
    if (!profesor.cvu) {
      omitir("sin_cvu", "El profesor no tiene CVU en la base; el formulario SNII lo exige.");
      continue;
    }

    // 4. Tipo de participación (P7, D-284).
    const tipo = tipoParticipacion(r, nivel, estrategia);
    if (!tipo) {
      omitir("sin_tipo", "El paquete no trae el tipo de participación y no se inventa (D-284).");
      continue;
    }

    // 5. Las mismas reglas del formulario SNII (incluida D-225 y fechas con inicio anterior a fin).
    const inicio = limpio(r.fecha_inicio);
    const fin = limpio(r.fecha_fin);
    const validacion = reconocimientoSnii.safeParse({
      profesorId: profesor.id,
      cvu: profesor.cvu,
      nivel,
      tipoParticipacion: tipo,
      fechaInicio: inicio,
      fechaFin: fin,
      enRecursoReconsideracion: false,
    });
    if (!validacion.success) {
      omitir("dato_invalido", validacion.error.issues[0]?.message ?? "No pasa las reglas del formulario.");
      continue;
    }

    // 6. Ya existe, o se traslapa con la base o con lo ya planeado (D-103).
    const periodos = periodosPorProfesor.get(profesor.id) ?? [];
    if (periodos.some((p) => aIso(p.inicio) === inicio && aIso(p.fin) === fin)) {
      plan.existentes++;
      continue;
    }
    const nuevo = { inicio: aFecha(inicio), fin: aFecha(fin) };
    const choque = hayTraslape(periodos, nuevo);
    if (choque) {
      omitir("traslape", `Se traslapa con otro periodo (${aIso(choque.inicio)} a ${aIso(choque.fin)}).`);
      continue;
    }

    periodosPorProfesor.set(profesor.id, [...periodos, nuevo]);
    plan.crear.push({
      profesorId: profesor.id,
      etiqueta,
      nivel,
      tipoParticipacion: tipo,
      inicio,
      fin,
      estado: estadoDelPeriodo(inicio, fin, hoy),
    });
  }

  return plan;
}

// ─── Informes ────────────────────────────────────────────────────────────────

export function contarOmitidos(plan: PlanSnii): Record<MotivoOmision, number> {
  const cuenta = Object.fromEntries(Object.keys(ETIQUETA_MOTIVO).map((m) => [m, 0])) as Record<MotivoOmision, number>;
  for (const o of plan.omitidos) cuenta[o.motivo]++;
  return cuenta;
}

export function contarPorNivelYEstado(plan: PlanSnii): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const r of plan.crear) {
    const clave = `${r.nivel} · ${r.estado}`;
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  return new Map([...cuenta].sort(([a], [b]) => a.localeCompare(b)));
}

/** Solo conteos, sin nombres: es lo único que se imprime en la terminal. */
export function resumenAnonimo(plan: PlanSnii): string {
  const omitidos = contarOmitidos(plan);
  const porNivel = [...contarPorNivelYEstado(plan)].map(([clave, n]) => `  ${clave.padEnd(28)} ${n}`);
  return [
    `Periodos en el paquete:      ${plan.totalPaquete}`,
    `A crear:                     ${plan.crear.length}`,
    `Ya existen en la base:       ${plan.existentes}`,
    `Omitidos (al informe):       ${plan.omitidos.length}`,
    "",
    "A crear por nivel y estado:",
    ...(porNivel.length > 0 ? porNivel : ["  (ninguno)"]),
    "",
    "Omitidos por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO) as MotivoOmision[]).map((m) => `  ${ETIQUETA_MOTIVO[m].padEnd(42)} ${omitidos[m]}`),
  ].join("\n");
}

/** Con nombres: se escribe solo en datos-reales/, que git ignora. */
export function informePlanSnii(plan: PlanSnii): string {
  const partes = ["# Plan de reconocimientos SNII (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push("```", resumenAnonimo(plan), "```", "");
  if (plan.omitidos.length > 0) {
    partes.push("## Omitidos: se informan al cliente", "");
    for (const o of plan.omitidos) partes.push(`- ${o.etiqueta} — ${ETIQUETA_MOTIVO[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  partes.push("## A crear", "");
  for (const r of plan.crear) {
    partes.push(`- ${r.etiqueta} · ${r.nivel} · ${r.tipoParticipacion} · ${r.inicio} a ${r.fin} · ${r.estado}`);
  }
  return partes.join("\n");
}

// ─── Bitácora y reversión ────────────────────────────────────────────────────

export interface CreadoSnii {
  id: number;
  profesorId: number;
  nivel: string;
  inicio: string;
  fin: string;
}

export interface BitacoraSnii {
  fase: "snii";
  fecha: string;
  host: string;
  creados: CreadoSnii[];
}

export function crearBitacoraSnii(creados: CreadoSnii[], fecha: Date, host: string): BitacoraSnii {
  return { fase: "snii", fecha: fecha.toISOString(), host, creados };
}

export interface SniiActual {
  profesorId: number;
  nivel: string;
  inicio: string;
  fin: string;
  convocatoriaId: number | null;
}

/**
 * Solo se borra lo que conserva los valores de la bitácora y sigue sin convocatoria (contrato §4.8). Un resultado
 * oficial de convocatoria no se borra (D-107); el resto se reporta.
 */
export function prepararReversionSnii(bitacora: BitacoraSnii, actuales: Map<number, SniiActual>) {
  const borrar: CreadoSnii[] = [];
  const conflictos: { id: number; motivo: string }[] = [];
  for (const c of bitacora.creados) {
    const actual = actuales.get(c.id);
    if (!actual) conflictos.push({ id: c.id, motivo: "El reconocimiento ya no existe en la base." });
    else if (actual.convocatoriaId !== null) {
      conflictos.push({ id: c.id, motivo: "Ya forma parte de un resultado de convocatoria (D-107); no se borra." });
    } else if (
      actual.profesorId !== c.profesorId ||
      actual.nivel !== c.nivel ||
      actual.inicio !== c.inicio ||
      actual.fin !== c.fin
    ) {
      conflictos.push({ id: c.id, motivo: "El reconocimiento cambió después de la carga; no se toca." });
    } else borrar.push(c);
  }
  return { borrar, conflictos };
}
