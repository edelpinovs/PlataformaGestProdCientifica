// F4 de la importación 2027: da de alta a los profesores del paquete que todavía no están en la base (#356).
// Funciones puras: reciben lo que hay en la base y lo que trae el paquete, y devuelven un plan. No tocan la base
// ni el disco. Plan y criterio en docs/PLAN_IMPORTACION_DATOS_REALES_2027.md (decisión P6, D-283).
//
// Solo se crea a quien tiene código UdeG real y correo institucional. Quien no los tiene va al informe para el
// cliente: no se inventa nada. Las conversiones son las mismas de F3 (se importan, no se duplican).
import { generarNombreNormalizado } from "../../src/modules/profesores/profesores";
import { PREFIJO_CODIGO, capitalizarNombre } from "./cargar-profesores";
import {
  convertirContratacion,
  convertirGenero,
  incidenciasDeRegistro,
  nomenclaturaDepartamento,
  nomenclaturaGrado,
  type Catalogos,
  type RegistroPaquete,
} from "./completar-profesores";
import { limpiarTexto } from "./importar-profesores";

export interface ProfesorEnBase {
  codigo: string;
  correo: string;
  nombreNormalizado: string;
  cvu: string | null;
}

export interface ProfesorACrear {
  codigo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nombreNormalizado: string;
  genero: "M" | "F" | "PENDIENTE";
  tipoContratacion: "TIEMPO_COMPLETO" | "ASIGNATURA" | "PENDIENTE";
  gradoId: number | null;
  departamentoId: number | null;
  cvu: string | null;
}

export type MotivoOmision =
  | "sin_codigo"
  | "sin_correo"
  | "nombre_repetido_en_paquete"
  | "codigo_repetido_en_paquete"
  | "correo_repetido_en_paquete"
  | "codigo_en_uso"
  | "correo_en_uso"
  | "dato_invalido";

export const ETIQUETA_MOTIVO: Record<MotivoOmision, string> = {
  sin_codigo: "Sin código UdeG real",
  sin_correo: "Sin correo institucional",
  nombre_repetido_en_paquete: "Nombre repetido en el paquete",
  codigo_repetido_en_paquete: "Código repetido en el paquete",
  correo_repetido_en_paquete: "Correo repetido en el paquete",
  codigo_en_uso: "El código ya lo tiene otra persona",
  correo_en_uso: "El correo ya lo tiene otra persona",
  dato_invalido: "Dato que no pasa las reglas del formulario",
};

export interface Omitido {
  etiqueta: string;
  motivo: MotivoOmision;
  detalle: string;
}

export interface AjusteAlta {
  etiqueta: string;
  campo: "cvu" | "gradoId" | "departamentoId";
  detalle: string;
}

export interface PlanAltas {
  totalPaquete: number;
  conCodigo: number;
  crear: ProfesorACrear[];
  /** Ya hay alguien con ese nombre en la base (lo esperado para los PEND): no se vuelve a crear. */
  existentes: number;
  omitidos: Omitido[];
  ajustes: AjusteAlta[];
  /** Profesores PEND que siguen en la base: si F3 no se aplicó, uno podría duplicarse con otro nombre. */
  pendientesEnBase: number;
}

const limpio = (valor: string | null | undefined) => limpiarTexto(valor ?? "");
const clavePalabras = (normalizado: string) => limpiarTexto(normalizado).split(" ").filter(Boolean).sort().join(" ");
const CAMPOS_OBLIGATORIOS = new Set(["codigo", "correo", "nombres", "apellidos"]);

function contar<T>(valores: T[]): Map<T, number> {
  const cuenta = new Map<T, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return cuenta;
}

export function planAltas(base: ProfesorEnBase[], paquete: RegistroPaquete[], catalogos: Catalogos): PlanAltas {
  const codigosEnBase = new Set(base.map((p) => p.codigo));
  const correosEnBase = new Set(base.map((p) => p.correo.toLowerCase()));
  const cvusEnBase = new Set(base.flatMap((p) => (p.cvu ? [p.cvu] : [])));
  const nombresExactos = new Set(base.map((p) => limpiarTexto(p.nombreNormalizado)));
  const nombresPalabras = new Set(base.map((p) => clavePalabras(p.nombreNormalizado)));
  const gradoPorNomenclatura = new Map(catalogos.grados.map((g) => [g.nomenclatura, g.id]));
  const departamentoPorNomenclatura = new Map(catalogos.departamentos.map((d) => [d.nomenclatura, d.id]));

  const preparados = paquete
    .map((origen) => {
      const apellidos = capitalizarNombre(origen.apellidos);
      const nombres = capitalizarNombre(origen.nombres);
      const nombreNormalizado = generarNombreNormalizado(nombres, apellidos);
      const codigo = limpio(origen.codigo_udg).toUpperCase();
      const correo = limpio(origen.correo_institucional).toLowerCase();
      return { origen, apellidos, nombres, nombreNormalizado, codigo, correo, palabras: clavePalabras(nombreNormalizado) };
    })
    .sort((a, b) => a.nombreNormalizado.localeCompare(b.nombreNormalizado, "es"));

  // Repetidos dentro del propio paquete: ninguna de las personas implicadas se crea.
  const porNombre = contar(preparados.map((p) => p.palabras));
  const porCodigo = contar(preparados.filter((p) => p.codigo).map((p) => p.codigo));
  const porCorreo = contar(preparados.filter((p) => p.correo).map((p) => p.correo));
  const porCvu = contar(preparados.flatMap((p) => (limpio(p.origen.cvu) ? [limpio(p.origen.cvu)] : [])));

  const plan: PlanAltas = {
    totalPaquete: paquete.length,
    conCodigo: preparados.filter((p) => p.codigo && !p.codigo.startsWith(PREFIJO_CODIGO)).length,
    crear: [],
    existentes: 0,
    omitidos: [],
    ajustes: [],
    pendientesEnBase: base.filter((p) => p.codigo.startsWith(PREFIJO_CODIGO)).length,
  };

  for (const p of preparados) {
    const etiqueta = `${p.apellidos}, ${p.nombres}`;
    const omitir = (motivo: MotivoOmision, detalle: string) => plan.omitidos.push({ etiqueta, motivo, detalle });

    // 1. Ya existe por nombre: es lo esperado para los PEND y no se vuelve a crear.
    if (nombresExactos.has(limpiarTexto(p.nombreNormalizado)) || nombresPalabras.has(p.palabras)) {
      plan.existentes++;
      continue;
    }

    // 2. Requisitos de P6: código UdeG real y correo institucional.
    if (!p.codigo || p.codigo.startsWith(PREFIJO_CODIGO)) {
      omitir("sin_codigo", "No trae código UdeG real; se informa al cliente.");
      continue;
    }
    if (!p.correo) {
      omitir("sin_correo", "No trae correo institucional; se informa al cliente.");
      continue;
    }

    // 3. Ambigüedad y choques con la base o dentro del paquete.
    if ((porNombre.get(p.palabras) ?? 0) > 1) {
      omitir("nombre_repetido_en_paquete", "Hay más de un registro con ese nombre; no se sabe cuál es.");
      continue;
    }
    if ((porCodigo.get(p.codigo) ?? 0) > 1) {
      omitir("codigo_repetido_en_paquete", "El código viene repetido para varias personas.");
      continue;
    }
    if ((porCorreo.get(p.correo) ?? 0) > 1) {
      omitir("correo_repetido_en_paquete", "El correo viene repetido para varias personas.");
      continue;
    }
    if (codigosEnBase.has(p.codigo)) {
      omitir("codigo_en_uso", "El código ya lo tiene otra persona de la base con distinto nombre.");
      continue;
    }
    if (correosEnBase.has(p.correo)) {
      omitir("correo_en_uso", "El correo ya lo tiene otra persona de la base.");
      continue;
    }

    // 4. Campos opcionales: se completan solo si hay equivalente claro; si no, quedan vacíos y anotados.
    const ajustes: AjusteAlta[] = [];
    const ajustar = (campo: AjusteAlta["campo"], detalle: string) => ajustes.push({ etiqueta, campo, detalle });

    let gradoId: number | null = null;
    if (limpio(p.origen.grado)) {
      const nomenclatura = nomenclaturaGrado(p.origen.grado);
      const id = nomenclatura ? gradoPorNomenclatura.get(nomenclatura) : undefined;
      if (id !== undefined) gradoId = id;
      else ajustar("gradoId", "El grado del paquete no tiene equivalente en el catálogo; se deja vacío.");
    }
    let departamentoId: number | null = null;
    if (limpio(p.origen.departamento)) {
      const nomenclatura = nomenclaturaDepartamento(p.origen.departamento);
      const id = nomenclatura ? departamentoPorNomenclatura.get(nomenclatura) : undefined;
      if (id !== undefined) departamentoId = id;
      else ajustar("departamentoId", "El departamento del paquete no existe en el catálogo; se deja vacío.");
    }
    let cvu: string | null = null;
    const cvuOrigen = limpio(p.origen.cvu);
    if (cvuOrigen) {
      if (!/^\d+$/.test(cvuOrigen)) ajustar("cvu", "El CVU del paquete debe tener solo dígitos; se deja vacío.");
      else if (cvusEnBase.has(cvuOrigen)) ajustar("cvu", "Ese CVU ya lo tiene otra persona de la base; se deja vacío.");
      else if ((porCvu.get(cvuOrigen) ?? 0) > 1) ajustar("cvu", "Ese CVU viene repetido en el paquete; se deja vacío.");
      else cvu = cvuOrigen;
    }

    const genero = convertirGenero(p.origen.sexo);
    const tipoContratacion = convertirContratacion(p.origen.nombramiento_tipo);

    // 5. Las mismas reglas que el formulario. Un dato obligatorio inválido manda a la persona al informe;
    //    uno opcional se descarta y se anota.
    const incidencias = incidenciasDeRegistro({
      codigo: p.codigo,
      nombres: p.nombres,
      apellidos: p.apellidos,
      correo: p.correo,
      genero: genero ?? undefined,
      tipoContratacion: tipoContratacion ?? undefined,
      departamentoId: departamentoId ?? undefined,
      gradoId: gradoId ?? undefined,
      cvu: cvu ?? undefined,
    });
    const obligatoria = incidencias.find((i) => CAMPOS_OBLIGATORIOS.has(i.campo));
    if (obligatoria) {
      omitir("dato_invalido", obligatoria.mensaje);
      continue;
    }
    for (const incidencia of incidencias) {
      if (incidencia.campo === "cvu") cvu = null;
      if (incidencia.campo === "gradoId") gradoId = null;
      if (incidencia.campo === "departamentoId") departamentoId = null;
      if (incidencia.campo === "cvu" || incidencia.campo === "gradoId" || incidencia.campo === "departamentoId") {
        ajustar(incidencia.campo, incidencia.mensaje);
      }
    }
    plan.ajustes.push(...ajustes);

    plan.crear.push({
      codigo: p.codigo,
      correo: p.correo,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombreNormalizado: p.nombreNormalizado,
      genero: genero ?? "PENDIENTE",
      tipoContratacion: tipoContratacion ?? "PENDIENTE",
      gradoId,
      departamentoId,
      cvu,
    });
  }

  return plan;
}

// ─── Informes ────────────────────────────────────────────────────────────────

export function contarOmitidos(plan: PlanAltas): Record<MotivoOmision, number> {
  const cuenta = Object.fromEntries(Object.keys(ETIQUETA_MOTIVO).map((m) => [m, 0])) as Record<MotivoOmision, number>;
  for (const o of plan.omitidos) cuenta[o.motivo]++;
  return cuenta;
}

/** Solo conteos, sin nombres: es lo único que se imprime en la terminal. */
export function resumenAnonimo(plan: PlanAltas): string {
  const omitidos = contarOmitidos(plan);
  return [
    `Registros en el paquete:       ${plan.totalPaquete}`,
    `Con código UdeG real:          ${plan.conCodigo}`,
    `Ya existen en la base:         ${plan.existentes}`,
    `A dar de alta:                 ${plan.crear.length}`,
    `Omitidos (al informe):         ${plan.omitidos.length}`,
    `Campos opcionales ajustados:   ${plan.ajustes.length}`,
    "",
    "Omitidos por motivo:",
    ...(Object.keys(ETIQUETA_MOTIVO) as MotivoOmision[]).map(
      (m) => `  ${ETIQUETA_MOTIVO[m].padEnd(42)} ${omitidos[m]}`,
    ),
    "",
    `Profesores PEND que siguen en la base: ${plan.pendientesEnBase}${
      plan.pendientesEnBase > 0 ? " (conviene aplicar antes F3 para no duplicar a nadie)" : ""
    }`,
  ].join("\n");
}

/** Con nombres: se escribe solo en datos-reales/, que git ignora. */
export function informePlanAltas(plan: PlanAltas): string {
  const partes = ["# Plan de altas (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push("```", resumenAnonimo(plan), "```", "");
  if (plan.omitidos.length > 0) {
    partes.push("## Omitidos: se informan al cliente", "");
    for (const o of plan.omitidos) partes.push(`- ${o.etiqueta} — ${ETIQUETA_MOTIVO[o.motivo]}: ${o.detalle}`);
    partes.push("");
  }
  if (plan.ajustes.length > 0) {
    partes.push("## Campos opcionales ajustados", "");
    for (const a of plan.ajustes) partes.push(`- ${a.etiqueta} — ${a.campo}: ${a.detalle}`);
    partes.push("");
  }
  partes.push("## A dar de alta", "");
  for (const p of plan.crear) {
    partes.push(`- ${p.codigo} · ${p.apellidos}, ${p.nombres} · género ${p.genero} · ${p.tipoContratacion}`);
  }
  return partes.join("\n");
}

// ─── Bitácora y reversión ────────────────────────────────────────────────────

export interface CreadoBitacora {
  id: number;
  codigo: string;
  correo: string;
}

export interface BitacoraAltas {
  fase: "altas";
  fecha: string;
  host: string;
  creados: CreadoBitacora[];
}

export function crearBitacoraAltas(creados: CreadoBitacora[], fecha: Date, host: string): BitacoraAltas {
  return { fase: "altas", fecha: fecha.toISOString(), host, creados };
}

/** Solo se borra a quien conserva el código y el correo de la bitácora (contrato §4.8); el resto se reporta. */
export function prepararReversionAltas(
  bitacora: BitacoraAltas,
  actuales: Map<number, { codigo: string; correo: string }>,
) {
  const borrar: CreadoBitacora[] = [];
  const conflictos: { id: number; motivo: string }[] = [];
  for (const creado of bitacora.creados) {
    const actual = actuales.get(creado.id);
    if (!actual) conflictos.push({ id: creado.id, motivo: "La persona ya no existe en la base." });
    else if (actual.codigo !== creado.codigo || actual.correo !== creado.correo) {
      conflictos.push({ id: creado.id, motivo: "El código o el correo cambió después de la alta; no se toca." });
    } else borrar.push(creado);
  }
  return { borrar, conflictos };
}
