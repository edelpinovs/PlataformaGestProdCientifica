// F7 de la importación 2027: crea los Cuerpos Académicos reales con sus integrantes y LGAC (#359).
// Funciones puras: reciben lo que hay en la base y lo que trae el paquete, y devuelven un plan. No tocan la base
// ni el disco. Plan y criterio en docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (P10, P11, D-287, D-288).
//
// Se aplican las reglas de la pantalla de Cuerpos Académicos: el CA se valida con `cuerpoAcademico` y `revisarCuerpo`
// (RF-012); los integrantes, en el orden del Excel, con `revisarAltaIntegrante` (RF-013, D-108, D-109); el líder solo
// si quedó como integrante (RF-014, D-111). Lo que no pasa se omite y se reporta; nada se ajusta ni se inventa.
import { cuerpoAcademico, revisarCuerpo, type NivelConsolidacion } from "../../src/modules/cuerpos-academicos/cuerpo";
import {
  revisarAltaIntegrante,
  type IntegranteResumen,
  type ProfesorParaCa,
} from "../../src/modules/cuerpos-academicos/integrantes";
import { normalizar, texto } from "../../src/modules/catalogos/comun";
import { limpiarTexto } from "./importar-profesores";
import { nomenclaturaDepartamento } from "./completar-profesores";

/**
 * Un CA se crea solo si al menos un integrante pasa las reglas. Con `true` se crearían también los CA sin integrantes
 * (y sin líder); como un CA que ya existe no se vuelve a tocar (contrato del plan), quedarían así hasta que alguien los
 * complete a mano. Cambiar este valor en una carga real exige una decisión nueva.
 */
export const CREAR_CA_SIN_INTEGRANTES_POR_OMISION = false;

const NIVELES: Record<string, NivelConsolidacion> = {
  CAEF: "EN_FORMACION",
  CAEC: "EN_CONSOLIDACION",
  CAC: "CONSOLIDADO",
};

/** Lo que usamos de un registro de `cuerpos_academicos.json`. */
export interface RegistroCuerpo {
  id: string;
  clave: string;
  nombre: string;
  nivel_vigente_2027?: string | null;
  area_prodep_original?: string | null;
  area_prodep?: string | null;
  disciplina?: string | null;
  anio_registro?: number | null;
  proxima_evaluacion?: number | null;
  lider_profesor_id?: string | null;
  departamento?: string | null;
}

/** Lo que usamos de un registro de `ca_integrantes.json`. */
export interface RegistroIntegrante {
  ca_id: string;
  profesor_id: string;
  orden?: number | null;
  estado?: string | null;
}

/** Lo que usamos de un registro de `ca_lgac.json`. */
export interface RegistroLgac {
  ca_id: string;
  orden?: number | null;
  lgac?: string | null;
}

/** Lo que usamos de un registro de `profesores.json`. */
export interface ProfesorPaqueteCa {
  id: string;
  codigo_udg?: string | null;
  nombre_completo?: string | null;
}

export interface ProfesorBaseCa {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  tipoContratacion: "TIEMPO_COMPLETO" | "ASIGNATURA" | "PENDIENTE";
  estatusLaboral: string;
  /** Si hoy tiene un PRODEP aprobado y vigente en la base (D-109). */
  prodepActivo: boolean;
}

export interface DepartamentoBase {
  id: number;
  nombre: string;
  nomenclatura: string;
}

export interface CuerpoACrear {
  etiqueta: string;
  clave: string;
  nombre: string;
  nivel: NivelConsolidacion;
  areaProdep: string;
  disciplina: string;
  departamentoId: number;
  anioRegistro: number;
  anioVencimiento: number;
  integrantes: { profesorId: number; etiqueta: string }[];
  liderId: number | null;
  lgacs: string[];
}

export type MotivoCuerpo =
  | "nivel_desconocido"
  | "sin_departamento"
  | "clave_repetida"
  | "dato_invalido"
  | "sin_integrantes";

export type MotivoIntegrante =
  | "estado_no_activo"
  | "profesor_sin_registro"
  | "sin_codigo"
  | "fuera_de_la_base"
  | "contratacion_pendiente"
  | "sin_tiempo_completo"
  | "no_activo"
  | "sin_prodep"
  | "repetido"
  | "lider_no_integrante";

export type MotivoLgac = "lgac_invalida" | "lgac_repetida";

export const ETIQUETA_MOTIVO_CUERPO: Record<MotivoCuerpo, string> = {
  nivel_desconocido: "Nivel de consolidación que no se reconoce",
  sin_departamento: "Departamento que no existe en el catálogo",
  clave_repetida: "Clave repetida en el paquete",
  dato_invalido: "No pasa las reglas del formulario de CA",
  sin_integrantes: "Ningún integrante pasa las reglas (D-108, D-109)",
};

export const ETIQUETA_MOTIVO_INTEGRANTE: Record<MotivoIntegrante, string> = {
  estado_no_activo: "Alta o baja solicitada en 2026 (D-252)",
  profesor_sin_registro: "Profesor que no está en profesores.json",
  sin_codigo: "Profesor sin código UdeG",
  fuera_de_la_base: "Profesor que no está en la base",
  contratacion_pendiente: "Contratación pendiente en la base",
  sin_tiempo_completo: "No es de tiempo completo (D-108)",
  no_activo: "Sin estatus laboral activo (D-108)",
  sin_prodep: "Sin PRODEP activo y nadie con PRODEP antes (D-109)",
  repetido: "Ya es integrante de ese CA",
  lider_no_integrante: "El líder del Excel no quedó como integrante (D-111)",
};

export const ETIQUETA_MOTIVO_LGAC: Record<MotivoLgac, string> = {
  lgac_invalida: "LGAC vacía o demasiado larga",
  lgac_repetida: "LGAC repetida en el mismo CA",
};

export interface Omitido<M extends string> {
  /** Clave del CA. */
  cuerpo: string;
  /** Nombre de la persona o de la LGAC; vacío cuando el aviso es del CA. */
  etiqueta: string;
  motivo: M;
  detalle: string;
}

export interface PlanCuerpos {
  totalCuerpos: number;
  totalIntegrantes: number;
  totalLgac: number;
  crear: CuerpoACrear[];
  /** Ya existe un CA con esa clave: no se modifica. */
  existentes: number;
  cuerposOmitidos: Omitido<MotivoCuerpo>[];
  integrantesOmitidos: Omitido<MotivoIntegrante>[];
  lgacOmitidas: Omitido<MotivoLgac>[];
}

export interface OpcionesPlanCuerpos {
  crearSinIntegrantes?: boolean;
}

const limpio = (valor: string | null | undefined) => limpiarTexto(valor ?? "");
const ordenar = (a: number | null | undefined, b: number | null | undefined) =>
  (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER);
const nombreDe = (p: ProfesorBaseCa) => `${p.apellidos} ${p.nombres} (${p.codigo})`;

export function planCuerpos(
  profesores: ProfesorBaseCa[],
  departamentos: DepartamentoBase[],
  clavesExistentes: string[],
  cuerpos: RegistroCuerpo[],
  integrantes: RegistroIntegrante[],
  lgacs: RegistroLgac[],
  profesoresPaquete: ProfesorPaqueteCa[],
  { crearSinIntegrantes = CREAR_CA_SIN_INTEGRANTES_POR_OMISION }: OpcionesPlanCuerpos = {},
): PlanCuerpos {
  const porCodigo = new Map(profesores.map((p) => [p.codigo, p]));
  const paquetePorId = new Map(profesoresPaquete.map((p) => [p.id, p]));
  const departamentoPorNomenclatura = new Map(departamentos.map((d) => [d.nomenclatura, d]));
  const clavesBase = new Set(clavesExistentes.map(normalizar));
  const clavesLote = new Set<string>();

  const plan: PlanCuerpos = {
    totalCuerpos: cuerpos.length,
    totalIntegrantes: integrantes.length,
    totalLgac: lgacs.length,
    crear: [],
    existentes: 0,
    cuerposOmitidos: [],
    integrantesOmitidos: [],
    lgacOmitidas: [],
  };

  // Persona del paquete → persona de la base, con el motivo si no se puede.
  function resolver(idPaquete: string): { profesor: ProfesorBaseCa } | { motivo: MotivoIntegrante; detalle: string } {
    const paquete = paquetePorId.get(idPaquete);
    if (!paquete) return { motivo: "profesor_sin_registro", detalle: "La persona no aparece en profesores.json." };
    const codigo = limpio(paquete.codigo_udg).toUpperCase();
    if (!codigo) return { motivo: "sin_codigo", detalle: "La persona no tiene código UdeG; no se puede cruzar con la base." };
    const profesor = porCodigo.get(codigo);
    if (!profesor) return { motivo: "fuera_de_la_base", detalle: "La persona no está en la base (por ejemplo, no se dio de alta en F4)." };
    return { profesor };
  }
  const etiquetaPaquete = (idPaquete: string) => limpio(paquetePorId.get(idPaquete)?.nombre_completo) || idPaquete;

  // Orden estable por clave, para que el plan no dependa del orden del archivo.
  for (const r of [...cuerpos].sort((a, b) => limpio(a.clave).localeCompare(limpio(b.clave)))) {
    const clave = limpio(r.clave).toUpperCase();
    const omitirCuerpo = (motivo: MotivoCuerpo, detalle: string) =>
      plan.cuerposOmitidos.push({ cuerpo: clave, etiqueta: "", motivo, detalle });

    // 1. Clave: si ya existe en la base no se toca; repetida dentro del paquete, solo entra la primera.
    if (clavesBase.has(normalizar(clave))) {
      plan.existentes++;
      continue;
    }
    if (clavesLote.has(normalizar(clave))) {
      omitirCuerpo("clave_repetida", "La clave aparece más de una vez en el paquete.");
      continue;
    }

    // 2. Nivel y departamento.
    const nivel = NIVELES[limpio(r.nivel_vigente_2027).toUpperCase()];
    if (!nivel) {
      omitirCuerpo("nivel_desconocido", `El nivel «${limpio(r.nivel_vigente_2027)}» no se reconoce.`);
      continue;
    }
    const nomenclatura = nomenclaturaDepartamento(r.departamento);
    const departamento = nomenclatura ? departamentoPorNomenclatura.get(nomenclatura) : undefined;
    if (!departamento) {
      omitirCuerpo("sin_departamento", `El departamento «${limpio(r.departamento)}» no existe en el catálogo.`);
      continue;
    }

    // 3. Las mismas reglas del formulario de CA (RF-012). anioVencimiento = próxima evaluación (D-287).
    const validacion = cuerpoAcademico.safeParse({
      nombre: limpio(r.nombre),
      clave,
      nivel,
      areaProdep: limpio(r.area_prodep_original) || limpio(r.area_prodep),
      disciplina: limpio(r.disciplina),
      departamentoId: departamento.id,
      anioRegistro: r.anio_registro,
      anioVencimiento: r.proxima_evaluacion,
    });
    if (!validacion.success) {
      omitirCuerpo("dato_invalido", validacion.error.issues[0]?.message ?? "No pasa las reglas del formulario.");
      continue;
    }
    const datos = validacion.data;
    const problema = revisarCuerpo(
      datos,
      { departamentos, cuerpos: [...clavesBase, ...clavesLote].map((c) => ({ clave: c })) },
    );
    if (problema) {
      omitirCuerpo("dato_invalido", problema.mensaje);
      continue;
    }

    // 4. Integrantes, en el orden del Excel, con las reglas de la pantalla (D-108, D-109).
    const aceptados: { profesor: ProfesorBaseCa; etiqueta: string }[] = [];
    const sinProdep: { profesor: ProfesorBaseCa; etiqueta: string }[] = [];
    const omitirIntegrante = (etiqueta: string, motivo: MotivoIntegrante, detalle: string) =>
      plan.integrantesOmitidos.push({ cuerpo: clave, etiqueta, motivo, detalle });

    const delCuerpo = integrantes
      .filter((i) => i.ca_id === r.id)
      .sort((a, b) => ordenar(a.orden, b.orden) || a.profesor_id.localeCompare(b.profesor_id));

    const resumen = (): IntegranteResumen[] =>
      aceptados.map((a) => ({ profesorId: a.profesor.id, nombre: nombreDe(a.profesor), prodepActivo: a.profesor.prodepActivo }));
    const paraCa = (p: ProfesorBaseCa): ProfesorParaCa => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      codigo: p.codigo,
      tipoContratacion: p.tipoContratacion,
      estatusLaboral: p.estatusLaboral,
      prodepActivo: p.prodepActivo,
    });

    function intentar(profesor: ProfesorBaseCa, etiqueta: string, aplazarSinProdep: boolean) {
      const rechazo = revisarAltaIntegrante(paraCa(profesor), resumen());
      if (!rechazo) {
        aceptados.push({ profesor, etiqueta });
        return;
      }
      // La razón se deduce de los datos de la persona, no del texto del mensaje.
      if (profesor.tipoContratacion === "PENDIENTE") omitirIntegrante(etiqueta, "contratacion_pendiente", rechazo.mensaje);
      else if (profesor.tipoContratacion !== "TIEMPO_COMPLETO") omitirIntegrante(etiqueta, "sin_tiempo_completo", rechazo.mensaje);
      else if (profesor.estatusLaboral !== "ACTIVO") omitirIntegrante(etiqueta, "no_activo", rechazo.mensaje);
      else if (aceptados.some((a) => a.profesor.id === profesor.id)) omitirIntegrante(etiqueta, "repetido", rechazo.mensaje);
      else if (aplazarSinProdep) sinProdep.push({ profesor, etiqueta });
      else omitirIntegrante(etiqueta, "sin_prodep", rechazo.mensaje);
    }

    for (const i of delCuerpo) {
      const etiqueta = etiquetaPaquete(i.profesor_id);
      if (limpio(i.estado).toUpperCase() !== "ACTIVO") {
        omitirIntegrante(etiqueta, "estado_no_activo", `Su estado en el paquete es «${limpio(i.estado) || "sin estado"}»; no se carga hasta que exista el historial de CA.`);
        continue;
      }
      const persona = resolver(i.profesor_id);
      if ("motivo" in persona) {
        omitirIntegrante(etiqueta, persona.motivo, persona.detalle);
        continue;
      }
      intentar(persona.profesor, etiqueta, true);
    }
    // Quien quedó esperando por no tener PRODEP cuando aún no había nadie con PRODEP puede entrar
    // si después llegó un integrante con PRODEP (D-109 solo pide que el primero lo tenga).
    for (const pendiente of sinProdep) intentar(pendiente.profesor, pendiente.etiqueta, false);

    if (aceptados.length === 0 && !crearSinIntegrantes) {
      omitirCuerpo("sin_integrantes", "Ningún integrante pasa las reglas; el CA no se crea para no dejarlo vacío.");
      continue;
    }

    // 5. Líder: solo si quedó como integrante (D-111).
    let liderId: number | null = null;
    if (limpio(r.lider_profesor_id)) {
      const lider = resolver(r.lider_profesor_id!);
      const etiqueta = etiquetaPaquete(r.lider_profesor_id!);
      if ("motivo" in lider) {
        omitirIntegrante(etiqueta, "lider_no_integrante", `El líder no se asigna: ${lider.detalle}`);
      } else if (aceptados.some((a) => a.profesor.id === lider.profesor.id)) {
        liderId = lider.profesor.id;
      } else {
        omitirIntegrante(etiqueta, "lider_no_integrante", "El líder del Excel no pasó las reglas de integrante; el CA queda sin líder.");
      }
    }

    // 6. LGAC: una por renglón, sin profesores (el Excel no los trae).
    const nombresLgac: string[] = [];
    const vistas = new Set<string>();
    const delCuerpoLgac = lgacs.filter((l) => l.ca_id === r.id).sort((a, b) => ordenar(a.orden, b.orden));
    for (const l of delCuerpoLgac) {
      const valida = texto("El nombre", 200).safeParse(l.lgac ?? "");
      if (!valida.success) {
        plan.lgacOmitidas.push({
          cuerpo: clave,
          etiqueta: limpio(l.lgac).slice(0, 60),
          motivo: "lgac_invalida",
          detalle: valida.error.issues[0]?.message ?? "La LGAC no es válida.",
        });
        continue;
      }
      const nombre = valida.data;
      if (vistas.has(normalizar(nombre))) {
        plan.lgacOmitidas.push({ cuerpo: clave, etiqueta: nombre.slice(0, 60), motivo: "lgac_repetida", detalle: "Ya hay una LGAC con ese nombre en el CA." });
        continue;
      }
      vistas.add(normalizar(nombre));
      nombresLgac.push(nombre);
    }

    clavesLote.add(normalizar(clave));
    plan.crear.push({
      etiqueta: limpio(r.nombre) || clave,
      clave: datos.clave,
      nombre: datos.nombre,
      nivel: datos.nivel,
      areaProdep: datos.areaProdep,
      disciplina: datos.disciplina,
      departamentoId: datos.departamentoId,
      anioRegistro: datos.anioRegistro,
      anioVencimiento: datos.anioVencimiento,
      integrantes: aceptados.map((a) => ({ profesorId: a.profesor.id, etiqueta: a.etiqueta })),
      liderId,
      lgacs: nombresLgac,
    });
  }

  return plan;
}

// ─── Informes ────────────────────────────────────────────────────────────────

function contar<M extends string>(lista: Omitido<M>[], motivos: Record<M, string>): Record<M, number> {
  const cuenta = Object.fromEntries(Object.keys(motivos).map((m) => [m, 0])) as Record<M, number>;
  for (const o of lista) cuenta[o.motivo]++;
  return cuenta;
}

/** Solo conteos, sin nombres ni claves: es lo único que se imprime en la terminal. */
export function resumenAnonimo(plan: PlanCuerpos): string {
  const cuerpos = contar(plan.cuerposOmitidos, ETIQUETA_MOTIVO_CUERPO);
  const integrantes = contar(plan.integrantesOmitidos, ETIQUETA_MOTIVO_INTEGRANTE);
  const lgac = contar(plan.lgacOmitidas, ETIQUETA_MOTIVO_LGAC);
  const porNivel = new Map<string, number>();
  for (const c of plan.crear) porNivel.set(c.nivel, (porNivel.get(c.nivel) ?? 0) + 1);
  const totalIntegrantes = plan.crear.reduce((suma, c) => suma + c.integrantes.length, 0);
  const totalLgac = plan.crear.reduce((suma, c) => suma + c.lgacs.length, 0);
  const conLider = plan.crear.filter((c) => c.liderId !== null).length;
  const linea = (texto: string, n: number, ancho = 50) => `  ${texto.padEnd(ancho)} ${n}`;
  return [
    `Cuerpos académicos en el paquete:  ${plan.totalCuerpos}`,
    `A crear:                           ${plan.crear.length}`,
    `Ya existen en la base:             ${plan.existentes}`,
    `Omitidos (al informe):             ${plan.cuerposOmitidos.length}`,
    "",
    "A crear por nivel:",
    ...(porNivel.size > 0 ? [...porNivel].sort(([a], [b]) => a.localeCompare(b)).map(([n, k]) => linea(n, k)) : ["  (ninguno)"]),
    "",
    `Integrantes en el paquete:         ${plan.totalIntegrantes}`,
    linea("A cargar", totalIntegrantes),
    linea("CA con líder asignado", conLider),
    `LGAC en el paquete:                ${plan.totalLgac}`,
    linea("A cargar", totalLgac),
    "",
    "CA omitidos por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO_CUERPO) as MotivoCuerpo[]).map((m) => linea(ETIQUETA_MOTIVO_CUERPO[m], cuerpos[m])),
    "",
    "Integrantes omitidos por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO_INTEGRANTE) as MotivoIntegrante[]).map((m) => linea(ETIQUETA_MOTIVO_INTEGRANTE[m], integrantes[m])),
    "",
    "LGAC omitidas por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO_LGAC) as MotivoLgac[]).map((m) => linea(ETIQUETA_MOTIVO_LGAC[m], lgac[m])),
  ].join("\n");
}

/** Con nombres: se escribe solo en datos-reales/, que git ignora. */
export function informePlanCuerpos(plan: PlanCuerpos): string {
  const partes = ["# Plan de Cuerpos Académicos (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push("```", resumenAnonimo(plan), "```", "");
  if (plan.cuerposOmitidos.length > 0) {
    partes.push("## CA omitidos: se informan al cliente", "");
    for (const o of plan.cuerposOmitidos) partes.push(`- ${o.cuerpo} — ${ETIQUETA_MOTIVO_CUERPO[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  if (plan.integrantesOmitidos.length > 0) {
    partes.push("## Integrantes omitidos: se informan al cliente", "");
    for (const o of plan.integrantesOmitidos) partes.push(`- ${o.cuerpo} · ${o.etiqueta} — ${ETIQUETA_MOTIVO_INTEGRANTE[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  if (plan.lgacOmitidas.length > 0) {
    partes.push("## LGAC omitidas", "");
    for (const o of plan.lgacOmitidas) partes.push(`- ${o.cuerpo} · ${o.etiqueta} — ${ETIQUETA_MOTIVO_LGAC[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  partes.push("## A crear", "");
  for (const c of plan.crear) {
    partes.push(`- ${c.clave} · ${c.nombre} · ${c.nivel} · vence ${c.anioVencimiento} · ${c.integrantes.length} integrantes · ${c.lgacs.length} LGAC`);
    for (const i of c.integrantes) partes.push(`  - ${i.etiqueta}${i.profesorId === c.liderId ? " (líder)" : ""}`);
  }
  return partes.join("\n");
}

// ─── Bitácora y reversión ────────────────────────────────────────────────────

export interface CreadoCuerpo {
  id: number;
  clave: string;
  profesorIds: number[];
  lgacIds: number[];
  liderId: number | null;
}

export interface BitacoraCuerpos {
  fase: "cuerpos";
  fecha: string;
  host: string;
  creados: CreadoCuerpo[];
}

export function crearBitacoraCuerpos(creados: CreadoCuerpo[], fecha: Date, host: string): BitacoraCuerpos {
  return { fase: "cuerpos", fecha: fecha.toISOString(), host, creados };
}

export interface CuerpoActual {
  clave: string;
  profesorIds: number[];
  lgacs: { id: number; profesores: number }[];
  liderId: number | null;
}

const mismos = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Solo se borra un CA que conserva exactamente lo que se creó: misma clave, mismos integrantes, mismo líder y las mismas
 * LGAC sin profesores asignados. Si alguien lo cambió después, se reporta y no se toca (contrato §4.8).
 */
export function prepararReversionCuerpos(bitacora: BitacoraCuerpos, actuales: Map<number, CuerpoActual>) {
  const borrar: CreadoCuerpo[] = [];
  const conflictos: { id: number; motivo: string }[] = [];
  for (const c of bitacora.creados) {
    const a = actuales.get(c.id);
    if (!a) conflictos.push({ id: c.id, motivo: "El cuerpo académico ya no existe en la base." });
    else if (a.clave !== c.clave) conflictos.push({ id: c.id, motivo: "La clave cambió después de la carga; no se toca." });
    else if (!mismos(a.profesorIds, c.profesorIds)) conflictos.push({ id: c.id, motivo: "Sus integrantes cambiaron después de la carga; no se toca." });
    else if (a.liderId !== c.liderId) conflictos.push({ id: c.id, motivo: "Su líder cambió después de la carga; no se toca." });
    else if (!mismos(a.lgacs.map((l) => l.id), c.lgacIds)) conflictos.push({ id: c.id, motivo: "Sus LGAC cambiaron después de la carga; no se toca." });
    else if (a.lgacs.some((l) => l.profesores > 0)) conflictos.push({ id: c.id, motivo: "Una LGAC ya tiene profesores asignados; no se toca." });
    else borrar.push(c);
  }
  return { borrar, conflictos };
}
