// F3 de la importación 2027: completa los profesores «PEND» ya cargados con lo que traen los listados oficiales.
// Funciones puras: reciben lo que hay en la base y lo que trae el paquete, y devuelven un plan. No tocan la base
// ni el disco. Plan y criterio en docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (D-278 a D-282).
//
// Regla de oro: solo se llena un campo que todavía tiene su marcador (código «PEND…», correo «@pendiente.invalid»,
// género o contratación «PENDIENTE», grado, departamento o CVU vacío). Lo que una persona ya editó no se toca.
import { generarNombreNormalizado, registrarProfesor } from "../../src/modules/profesores/profesores";
import { DOMINIO_PENDIENTE, PREFIJO_CODIGO } from "./cargar-profesores";
import { limpiarTexto } from "./importar-profesores";

export const CAMPOS_COMPLETABLES = [
  "codigo",
  "correo",
  "genero",
  "tipoContratacion",
  "gradoId",
  "departamentoId",
  "cvu",
] as const;
export type CampoCompletable = (typeof CAMPOS_COMPLETABLES)[number];
export type Valor = string | number;
type Propuesta = Partial<Record<CampoCompletable, Valor>>;

const PENDIENTE = "PENDIENTE";

export interface ProfesorBase {
  id: number;
  codigo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nombreNormalizado: string;
  genero: string;
  tipoContratacion: string;
  gradoId: number | null;
  departamentoId: number | null;
  cvu: string | null;
}

/** Lo que usamos de un registro de `profesores.json` del paquete. */
export interface RegistroPaquete {
  nombres: string;
  apellidos: string;
  codigo_udg?: string | null;
  correo_institucional?: string | null;
  cvu?: string | null;
  sexo?: string | null;
  nombramiento_tipo?: string | null;
  grado?: string | null;
  departamento?: string | null;
}

export interface Catalogos {
  grados: { id: number; nomenclatura: string }[];
  departamentos: { id: number; nomenclatura: string }[];
}

export interface CambioCampo {
  campo: CampoCompletable;
  antes: Valor | null;
  despues: Valor;
}

export interface ProfesorActualizar {
  id: number;
  etiqueta: string;
  cambios: CambioCampo[];
}

export interface Conflicto {
  id: number;
  etiqueta: string;
  campo: CampoCompletable | "cruce";
  motivo: string;
}

export interface PlanCompletar {
  candidatos: number;
  actualizar: ProfesorActualizar[];
  /** Candidatos que cruzaron bien y no tienen nada que completar. */
  sinCambios: number;
  conflictos: Conflicto[];
}

// ─── Conversiones del formato del Excel al modelo del repo ───────────────────

const limpio = (valor: string | null | undefined) => limpiarTexto(valor ?? "");

/** El Excel usa H = hombre y M = mujer; el repo usa M = Masculino y F = Femenino (D-278). */
export function convertirGenero(sexo: string | null | undefined): "M" | "F" | null {
  const s = limpio(sexo).toUpperCase();
  if (s === "H") return "M";
  if (s === "M") return "F";
  return null;
}

/** Cualquier otro nombramiento queda en PENDIENTE (D-280): se devuelve null. */
export function convertirContratacion(tipo: string | null | undefined): "TIEMPO_COMPLETO" | "ASIGNATURA" | null {
  const t = limpio(tipo).toUpperCase();
  if (t === "PROFESOR_INVESTIGADOR" || t === "PROFESOR_DOCENTE") return "TIEMPO_COMPLETO";
  if (t === "PROFESOR_ASIGNATURA") return "ASIGNATURA";
  return null;
}

const GRADOS: Record<string, string> = {
  "DR.": "DR",
  "DRA.": "DR",
  "MTRO.": "MTRO",
  "MTRA.": "MTRO",
  "M.C.": "MTRO",
};
export const nomenclaturaGrado = (grado: string | null | undefined): string | null =>
  GRADOS[limpio(grado).toUpperCase()] ?? null;

const DEPARTAMENTOS: Record<string, string> = {
  CCI: "DCCI",
  CNE: "DCNE",
  CSH: "DCSH",
  CEA: "DCEA",
  CS: "DCS",
  CC: "DCCOM",
};
export const nomenclaturaDepartamento = (clave: string | null | undefined): string | null =>
  DEPARTAMENTOS[limpio(clave).toUpperCase()] ?? null;

// ─── Cruce por nombre ────────────────────────────────────────────────────────

const clavePalabras = (normalizado: string) =>
  limpiarTexto(normalizado).split(" ").filter(Boolean).sort().join(" ");
const claveExacta = (normalizado: string) => limpiarTexto(normalizado);

function indexar(paquete: RegistroPaquete[]) {
  const exacta = new Map<string, RegistroPaquete[]>();
  const palabras = new Map<string, RegistroPaquete[]>();
  const agregar = (mapa: Map<string, RegistroPaquete[]>, clave: string, r: RegistroPaquete) => {
    const lista = mapa.get(clave);
    if (lista) lista.push(r);
    else mapa.set(clave, [r]);
  };
  for (const r of paquete) {
    const normalizado = generarNombreNormalizado(r.nombres, r.apellidos);
    agregar(exacta, claveExacta(normalizado), r);
    agregar(palabras, clavePalabras(normalizado), r);
  }
  return { exacta, palabras };
}

const etiquetaDe = (p: ProfesorBase) => `${p.apellidos}, ${p.nombres}`;
const esPendiente = (p: ProfesorBase) => p.codigo.startsWith(PREFIJO_CODIGO);

// ─── Plan ────────────────────────────────────────────────────────────────────

export function planCompletar(base: ProfesorBase[], paquete: RegistroPaquete[], catalogos: Catalogos): PlanCompletar {
  const { exacta, palabras } = indexar(paquete);
  const candidatos = base.filter(esPendiente).sort((a, b) => a.id - b.id);
  const conflictos: Conflicto[] = [];
  const conflicto = (p: ProfesorBase, campo: Conflicto["campo"], motivo: string) =>
    conflictos.push({ id: p.id, etiqueta: etiquetaDe(p), campo, motivo });

  // 1. Cruce: nombre normalizado exacto y, si no hay, mismas palabras sin importar el orden.
  const cruzados = new Map<number, RegistroPaquete>();
  for (const p of candidatos) {
    let coincidencias = exacta.get(claveExacta(p.nombreNormalizado)) ?? [];
    if (coincidencias.length === 0) coincidencias = palabras.get(clavePalabras(p.nombreNormalizado)) ?? [];
    if (coincidencias.length === 0) conflicto(p, "cruce", "No aparece en el paquete por nombre; no se toca.");
    else if (coincidencias.length > 1) {
      conflicto(p, "cruce", `Hay ${coincidencias.length} registros del paquete con ese nombre; no se toca.`);
    } else cruzados.set(p.id, coincidencias[0]);
  }

  // Dos personas de la base que apuntan al mismo registro del paquete: ninguna se toca.
  const duenos = new Map<RegistroPaquete, ProfesorBase[]>();
  for (const p of candidatos) {
    const registro = cruzados.get(p.id);
    if (registro) duenos.set(registro, [...(duenos.get(registro) ?? []), p]);
  }
  for (const [, grupo] of duenos) {
    if (grupo.length < 2) continue;
    for (const p of grupo) {
      cruzados.delete(p.id);
      conflicto(p, "cruce", "Otra persona de la base cruza con el mismo registro del paquete; no se toca.");
    }
  }

  // 2. Propuestas crudas por candidato (solo campos que aún tienen su marcador).
  const gradoPorNomenclatura = new Map(catalogos.grados.map((g) => [g.nomenclatura, g.id]));
  const departamentoPorNomenclatura = new Map(catalogos.departamentos.map((d) => [d.nomenclatura, d.id]));
  const propuestas = new Map<number, Propuesta>();
  for (const p of candidatos) {
    const r = cruzados.get(p.id);
    if (!r) continue;
    const propuesta: Propuesta = {};

    const codigo = limpio(r.codigo_udg).toUpperCase();
    if (esPendiente(p) && codigo) propuesta.codigo = codigo;

    const correo = limpio(r.correo_institucional).toLowerCase();
    if (p.correo.endsWith(`@${DOMINIO_PENDIENTE}`) && correo) propuesta.correo = correo;

    if (p.genero === PENDIENTE) {
      const genero = convertirGenero(r.sexo);
      if (genero) propuesta.genero = genero;
    }
    if (p.tipoContratacion === PENDIENTE) {
      const contratacion = convertirContratacion(r.nombramiento_tipo);
      if (contratacion) propuesta.tipoContratacion = contratacion;
    }

    if (p.gradoId === null && limpio(r.grado)) {
      const nomenclatura = nomenclaturaGrado(r.grado);
      const id = nomenclatura ? gradoPorNomenclatura.get(nomenclatura) : undefined;
      if (id !== undefined) propuesta.gradoId = id;
      else conflicto(p, "gradoId", "El grado del paquete no tiene equivalente en el catálogo; se deja vacío.");
    }
    if (p.departamentoId === null && limpio(r.departamento)) {
      const nomenclatura = nomenclaturaDepartamento(r.departamento);
      const id = nomenclatura ? departamentoPorNomenclatura.get(nomenclatura) : undefined;
      if (id !== undefined) propuesta.departamentoId = id;
      else conflicto(p, "departamentoId", "El departamento del paquete no existe en el catálogo; se deja vacío.");
    }

    const cvu = limpio(r.cvu);
    if (p.cvu === null && cvu) {
      if (/^\d+$/.test(cvu)) propuesta.cvu = cvu;
      else conflicto(p, "cvu", "El CVU del paquete debe tener solo dígitos; se deja vacío.");
    }

    propuestas.set(p.id, propuesta);
  }

  // 3. Unicidad: contra el resto de la base y dentro del mismo lote.
  const enBase = {
    codigo: new Map(base.map((p) => [p.codigo, p.id])),
    correo: new Map(base.map((p) => [p.correo.toLowerCase(), p.id])),
    cvu: new Map(base.flatMap((p) => (p.cvu ? [[p.cvu, p.id] as const] : []))),
  };
  const repeticiones = { codigo: new Map<string, number>(), correo: new Map<string, number>(), cvu: new Map<string, number>() };
  const CAMPOS_UNICOS = ["codigo", "correo", "cvu"] as const;
  for (const propuesta of propuestas.values()) {
    for (const campo of CAMPOS_UNICOS) {
      const valor = propuesta[campo];
      if (typeof valor === "string") repeticiones[campo].set(valor, (repeticiones[campo].get(valor) ?? 0) + 1);
    }
  }

  const actualizar: ProfesorActualizar[] = [];
  let sinCambios = 0;
  for (const p of candidatos) {
    const propuesta = propuestas.get(p.id);
    if (!propuesta) continue;

    for (const campo of CAMPOS_UNICOS) {
      const valor = propuesta[campo];
      if (typeof valor !== "string") continue;
      const dueno = enBase[campo].get(campo === "correo" ? valor.toLowerCase() : valor);
      if (dueno !== undefined && dueno !== p.id) {
        conflicto(p, campo, "Ese valor ya lo tiene otra persona en la base; el campo no se escribe.");
        delete propuesta[campo];
      } else if ((repeticiones[campo].get(valor) ?? 0) > 1) {
        conflicto(p, campo, "Ese valor viene repetido para varias personas del paquete; el campo no se escribe.");
        delete propuesta[campo];
      }
    }

    // 4. Las mismas reglas que el formulario. `registrarProfesor` lleva un transform y no se puede revisar campo
    //    por campo: se arma un candidato completo y solo cuentan las incidencias de los campos que se proponen.
    const candidato = {
      codigo: String(propuesta.codigo ?? p.codigo),
      nombres: p.nombres,
      apellidos: p.apellidos,
      correo: String(propuesta.correo ?? p.correo),
      genero: String(propuesta.genero ?? "M"),
      tipoContratacion: String(propuesta.tipoContratacion ?? "ASIGNATURA"),
      estatusLaboral: "ACTIVO",
      departamentoId: propuesta.departamentoId === undefined ? "" : String(propuesta.departamentoId),
      gradoId: propuesta.gradoId === undefined ? "" : String(propuesta.gradoId),
      cvu: String(propuesta.cvu ?? ""),
      goceDeSueldo: false,
    };
    const resultado = registrarProfesor.safeParse(candidato);
    if (!resultado.success) {
      for (const incidencia of resultado.error.issues) {
        const campo = incidencia.path[0] as CampoCompletable;
        if (!(campo in propuesta)) continue;
        conflicto(p, campo, incidencia.message);
        delete propuesta[campo];
      }
    }

    const cambios: CambioCampo[] = CAMPOS_COMPLETABLES.flatMap((campo) =>
      propuesta[campo] === undefined ? [] : [{ campo, antes: p[campo], despues: propuesta[campo] as Valor }],
    );
    if (cambios.length === 0) sinCambios++;
    else actualizar.push({ id: p.id, etiqueta: etiquetaDe(p), cambios });
  }

  return { candidatos: candidatos.length, actualizar, sinCambios, conflictos };
}

// ─── Informes ────────────────────────────────────────────────────────────────

export function contarPorCampo(plan: PlanCompletar): Record<CampoCompletable, number> {
  const cuenta = Object.fromEntries(CAMPOS_COMPLETABLES.map((c) => [c, 0])) as Record<CampoCompletable, number>;
  for (const p of plan.actualizar) for (const c of p.cambios) cuenta[c.campo]++;
  return cuenta;
}

/** Solo conteos, sin nombres: es lo único que se imprime en la terminal. */
export function resumenAnonimo(plan: PlanCompletar): string {
  const cuenta = contarPorCampo(plan);
  const porCampo = (campo: Conflicto["campo"]) => plan.conflictos.filter((c) => c.campo === campo).length;
  return [
    `Candidatos con código ${PREFIJO_CODIGO}:  ${plan.candidatos}`,
    `A actualizar:                ${plan.actualizar.length}`,
    `Sin nada que completar:      ${plan.sinCambios}`,
    `Conflictos (no se tocan):    ${plan.conflictos.length}`,
    "",
    "Campos que se completarían:",
    ...CAMPOS_COMPLETABLES.map((c) => `  ${c.padEnd(18)} ${cuenta[c]}`),
    "",
    "Conflictos por campo:",
    ...(["cruce", ...CAMPOS_COMPLETABLES] as const).map((c) => `  ${c.padEnd(18)} ${porCampo(c)}`),
  ].join("\n");
}

/** Con nombres: se escribe solo en datos-reales/, que git ignora. */
export function informePlanCompletar(plan: PlanCompletar): string {
  const partes = ["# Plan para completar profesores (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push("```", resumenAnonimo(plan), "```", "");
  if (plan.conflictos.length > 0) {
    partes.push("## Conflictos (no se tocan)", "");
    for (const c of plan.conflictos) partes.push(`- ${c.etiqueta} — ${c.campo}: ${c.motivo}`);
    partes.push("");
  }
  partes.push("## A actualizar", "");
  for (const p of plan.actualizar) {
    partes.push(`- ${p.etiqueta}: ${p.cambios.map((c) => `${c.campo} ${c.antes ?? "∅"} → ${c.despues}`).join("; ")}`);
  }
  return partes.join("\n");
}

// ─── Bitácora y reversión ────────────────────────────────────────────────────

export interface CambioBitacora extends CambioCampo {
  id: number;
}

export interface Bitacora {
  fase: "completar";
  fecha: string;
  host: string;
  cambios: CambioBitacora[];
}

export function crearBitacora(plan: PlanCompletar, fecha: Date, host: string): Bitacora {
  return {
    fase: "completar",
    fecha: fecha.toISOString(),
    host,
    cambios: plan.actualizar.flatMap((p) => p.cambios.map((c) => ({ id: p.id, ...c }))),
  };
}

export type EstadoActual = Map<number, Partial<Record<CampoCompletable, Valor | null>>>;

/** Deshace solo lo que todavía conserva el valor que puso el script; lo demás se reporta (contrato §4.8). */
export function prepararReversion(bitacora: Bitacora, actuales: EstadoActual) {
  const revertir: CambioBitacora[] = [];
  const conflictos: { id: number; campo: CampoCompletable; motivo: string }[] = [];
  for (const cambio of bitacora.cambios) {
    const actual = actuales.get(cambio.id);
    if (!actual) {
      conflictos.push({ id: cambio.id, campo: cambio.campo, motivo: "La persona ya no existe en la base." });
    } else if (actual[cambio.campo] !== cambio.despues) {
      conflictos.push({ id: cambio.id, campo: cambio.campo, motivo: "El valor cambió después de la carga; no se toca." });
    } else revertir.push(cambio);
  }
  return { revertir, conflictos };
}
