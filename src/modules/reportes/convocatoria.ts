import { z } from "zod";

import {
  analizarListado,
  paginar,
  type ConsultaListado,
  type DefinicionListado,
  type ErroresListado,
  type ParametrosListado,
  type Sentido,
} from "@/lib/listados/consulta";
import { SIN_DEPARTAMENTO } from "./vigencias";

// Reporte de convocatoria anual (RF-028).
// Cada dictamen ligado a una convocatoria cuenta una vez, desglosado por
// departamento y género. Una renovación SNII que sube de nivel es promoción;
// si el nivel no sube, la persona sigue vigente. PRODEP no tiene niveles:
// su renovación cuenta como vigente. En reconsideración el dictamen no entra.

const ANIO_MINIMO = 1990;
const ANIO_MAXIMO = 2100;
const MENSAJE_ANIO = "El año debe tener cuatro dígitos, entre 1990 y 2100.";
const ORDEN_NIVEL = ["CANDIDATO", "NIVEL_1", "NIVEL_2", "NIVEL_3", "EMERITO"];

export const PROGRAMAS = ["SNII", "PRODEP"] as const;
export type ProgramaConvocatoria = (typeof PROGRAMAS)[number];

export const COLUMNAS_CONVOCATORIA = [
  "departamento", "genero", "vigentes", "nuevosIngresos", "promociones", "noAprobados",
] as const;
export type ColumnaConvocatoria = (typeof COLUMNAS_CONVOCATORIA)[number];

export const ETIQUETA_COLUMNA_CONVOCATORIA: Record<ColumnaConvocatoria, string> = {
  departamento: "Departamento",
  genero: "Género",
  vigentes: "Vigentes",
  nuevosIngresos: "Nuevos ingresos",
  promociones: "Promociones",
  noAprobados: "No aprobados",
};

export const ETIQUETA_GENERO = { M: "Masculino", F: "Femenino" } as const;
export type Genero = keyof typeof ETIQUETA_GENERO;

export const LISTADO_CONVOCATORIA: DefinicionListado = {
  columnas: COLUMNAS_CONVOCATORIA,
  ordenInicial: { columna: "departamento", dir: "asc" },
  filtros: { programa: PROGRAMAS, genero: ["M", "F"] },
};

export type ClaseConvocatoria = "vigente" | "nuevo-ingreso" | "promocion" | "no-aprobado";

const CAMPO_CLASE: Record<ClaseConvocatoria, "vigentes" | "nuevosIngresos" | "promociones" | "noAprobados"> = {
  vigente: "vigentes",
  "nuevo-ingreso": "nuevosIngresos",
  promocion: "promociones",
  "no-aprobado": "noAprobados",
};

export type DictamenConvocatoria = {
  id: number;
  profesorId: number;
  programa: ProgramaConvocatoria;
  anio: number;
  departamento: string | null;
  genero: Genero;
  resultado: string;
  tipo: string;
  nivel: string | null;
  inicio: string;
};

export type ParticipacionReporte = {
  profesorId: number;
  programa: ProgramaConvocatoria;
  anio: number;
  departamento: string | null;
  genero: Genero;
  resultado: string | null;
};

export type HistorialSnii = { id: number; profesorId: number; nivel: string; inicio: string };

export type FilaConvocatoria = {
  id: string;
  departamento: string;
  genero: Genero;
  vigentes: number;
  nuevosIngresos: number;
  promociones: number;
  noAprobados: number;
};

export type EstadoConvocatoria = {
  consulta: ConsultaListado;
  columnas: ColumnaConvocatoria[];
  anio: number | null;
  errores: ErroresListado;
};

export function clasificarDictamen(dictamen: DictamenConvocatoria, historial: HistorialSnii[]): ClaseConvocatoria | null {
  if (dictamen.resultado === "EN_RECONSIDERACION") return null;
  if (dictamen.resultado === "NO_APROBADO") return "no-aprobado";
  if (dictamen.resultado !== "APROBADO") return null;

  if (dictamen.programa === "PRODEP") {
    if (dictamen.tipo === "PRIMER_RECONOCIMIENTO") return "nuevo-ingreso";
    if (dictamen.tipo === "RENOVACION") return "vigente";
    return null;
  }

  if (dictamen.tipo === "NUEVO_INGRESO" || dictamen.tipo === "REINGRESO_NO_VIGENTE") return "nuevo-ingreso";
  if (dictamen.tipo !== "RENOVACION") return null;

  const anterior = historial
    .filter((fila) => fila.profesorId === dictamen.profesorId && fila.id !== dictamen.id && fila.inicio < dictamen.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio) || b.id - a.id)[0];
  const sube = anterior !== undefined && ORDEN_NIVEL.indexOf(dictamen.nivel ?? "") > ORDEN_NIVEL.indexOf(anterior.nivel);
  return sube ? "promocion" : "vigente";
}

function clavePersona(profesorId: number, programa: ProgramaConvocatoria, anio: number) {
  return `${profesorId}|${programa}|${anio}`;
}

/** Dictámenes del año y programa elegidos, más el no aprobado que solo está en la participación. */
export function hechosConvocatoria(
  dictamenes: DictamenConvocatoria[],
  participaciones: ParticipacionReporte[],
  historial: HistorialSnii[],
  programas: readonly ProgramaConvocatoria[],
  anio: number | null,
) {
  const entran = dictamenes.filter((fila) => programas.includes(fila.programa) && (anio === null || fila.anio === anio));
  const conDictamen = new Set(entran.map((fila) => clavePersona(fila.profesorId, fila.programa, fila.anio)));
  const hechos: { departamento: string | null; genero: Genero; clase: ClaseConvocatoria }[] = [];

  for (const dictamen of entran) {
    const clase = clasificarDictamen(dictamen, historial);
    if (clase) hechos.push({ departamento: dictamen.departamento, genero: dictamen.genero, clase });
  }
  for (const participacion of participaciones) {
    if (participacion.resultado !== "NO_APROBADO") continue;
    if (!programas.includes(participacion.programa) || (anio !== null && participacion.anio !== anio)) continue;
    if (conDictamen.has(clavePersona(participacion.profesorId, participacion.programa, participacion.anio))) continue;
    hechos.push({ departamento: participacion.departamento, genero: participacion.genero, clase: "no-aprobado" });
  }
  return hechos;
}

export function agruparConvocatoria(hechos: { departamento: string | null; genero: Genero; clase: ClaseConvocatoria }[]) {
  const grupos = new Map<string, FilaConvocatoria>();
  for (const hecho of hechos) {
    const departamento = hecho.departamento?.trim() || SIN_DEPARTAMENTO;
    const id = `${departamento}|${hecho.genero}`;
    const fila = grupos.get(id) ?? {
      id, departamento, genero: hecho.genero, vigentes: 0, nuevosIngresos: 0, promociones: 0, noAprobados: 0,
    };
    fila[CAMPO_CLASE[hecho.clase]] += 1;
    grupos.set(id, fila);
  }
  return [...grupos.values()];
}

export function aniosConvocatoria(
  dictamenes: DictamenConvocatoria[],
  participaciones: ParticipacionReporte[],
  anio: number | null,
) {
  const anios = [...dictamenes.map((fila) => fila.anio), ...participaciones.map((fila) => fila.anio)];
  if (anio !== null) anios.push(anio);
  return [...new Set(anios)].sort((a, b) => a - b);
}

export function textoConvocatoria(fila: FilaConvocatoria, columna: ColumnaConvocatoria) {
  if (columna === "departamento") return fila.departamento;
  if (columna === "genero") return ETIQUETA_GENERO[fila.genero];
  return String(fila[columna]);
}

function esArmado(crudo: string | string[] | undefined) {
  return crudo === "1" || (Array.isArray(crudo) && crudo.includes("1"));
}

function leerColumnas(crudo: string | string[] | undefined, vacioForzado: boolean) {
  if (vacioForzado) return { valores: [] as ColumnaConvocatoria[], error: "Elige al menos una columna." };
  if (crudo === undefined) return { valores: [...COLUMNAS_CONVOCATORIA] };
  const partes = (Array.isArray(crudo) ? crudo : [crudo]).flatMap((parte) => parte.split(",")).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length === 0) return { valores: [] as ColumnaConvocatoria[], error: "Elige al menos una columna." };
  const valores = COLUMNAS_CONVOCATORIA.filter((columna) => partes.includes(columna));
  if (partes.some((parte) => !(COLUMNAS_CONVOCATORIA as readonly string[]).includes(parte))) {
    return { valores, error: "Hay una columna que no existe." };
  }
  return { valores };
}

function leerAnio(crudo: string | string[] | undefined) {
  if (crudo === undefined || crudo === "") return { anio: null };
  const texto = typeof crudo === "string" ? crudo.trim() : crudo;
  if (texto === "") return { anio: null };
  const resultado = z.string({ error: "Elige un solo año." })
    .regex(/^\d{4}$/, MENSAJE_ANIO)
    .transform(Number)
    .refine((valor) => valor >= ANIO_MINIMO && valor <= ANIO_MAXIMO, MENSAJE_ANIO)
    .safeParse(texto);
  if (!resultado.success) return { anio: null, error: resultado.error.issues[0]?.message ?? MENSAJE_ANIO };
  return { anio: resultado.data };
}

export function analizarConvocatoria(parametros: ParametrosListado): EstadoConvocatoria {
  const { consulta, errores } = analizarListado(LISTADO_CONVOCATORIA, parametros);
  const columnas = leerColumnas(parametros.columnas, esArmado(parametros.armado) && parametros.columnas === undefined);
  const anio = leerAnio(parametros.anio);
  if (columnas.error) errores.columnas = columnas.error;
  if (anio.error) errores.anio = anio.error;
  return { consulta, columnas: columnas.valores, anio: anio.anio, errores };
}

function programasElegidos(estado: EstadoConvocatoria): ProgramaConvocatoria[] {
  const programa = estado.consulta.filtros.programa;
  return programa === "SNII" || programa === "PRODEP" ? [programa] : [...PROGRAMAS];
}

export function consultarConvocatoria(
  dictamenes: DictamenConvocatoria[],
  participaciones: ParticipacionReporte[],
  historial: HistorialSnii[],
  estado: EstadoConvocatoria,
  completo = false,
) {
  if (estado.columnas.length === 0) return { filas: [] as FilaConvocatoria[], paginacion: paginar(0, estado.consulta) };
  const genero = estado.consulta.filtros.genero;
  const hechos = hechosConvocatoria(dictamenes, participaciones, historial, programasElegidos(estado), estado.anio);
  const texto = estado.consulta.q.trim().toLocaleLowerCase("es-MX");
  const filas = agruparConvocatoria(hechos).filter((fila) => {
    if (genero && fila.genero !== genero) return false;
    if (!texto) return true;
    return estado.columnas.some((columna) => textoConvocatoria(fila, columna).toLocaleLowerCase("es-MX").includes(texto));
  });
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden) ? estado.consulta.orden : estado.columnas[0];
  filas.sort((a, b) => comparar(a, b, orden, estado.consulta.dir));
  const paginacion = paginar(filas.length, estado.consulta);
  return {
    filas: completo ? filas : filas.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
  };
}

function comparar(a: FilaConvocatoria, b: FilaConvocatoria, columna: string, dir: Sentido) {
  const numerica = columna === "vigentes" || columna === "nuevosIngresos" || columna === "promociones" || columna === "noAprobados";
  const resultado = numerica
    ? a[columna] - b[columna]
    : textoConvocatoria(a, columna as ColumnaConvocatoria).localeCompare(textoConvocatoria(b, columna as ColumnaConvocatoria), "es");
  const desempatado = resultado === 0 ? a.id.localeCompare(b.id, "es") : resultado;
  return dir === "asc" ? desempatado : -desempatado;
}

export function enlaceConvocatoria(
  base: string,
  estado: EstadoConvocatoria,
  cambios: { pagina?: number; orden?: string; dir?: Sentido } = {},
) {
  const orden = cambios.orden ?? estado.consulta.orden;
  const dir = cambios.dir ?? estado.consulta.dir;
  const cambiaOrden = cambios.orden !== undefined || cambios.dir !== undefined;
  const pagina = cambios.pagina ?? (cambiaOrden ? 1 : estado.consulta.pagina);
  const parametros = new URLSearchParams();
  if (estado.columnas.length === 0) parametros.set("armado", "1");
  else if (estado.columnas.length !== COLUMNAS_CONVOCATORIA.length) parametros.set("columnas", estado.columnas.join(","));
  if (estado.anio !== null) parametros.set("anio", String(estado.anio));
  if (estado.consulta.filtros.programa) parametros.set("programa", estado.consulta.filtros.programa);
  if (estado.consulta.filtros.genero) parametros.set("genero", estado.consulta.filtros.genero);
  if (estado.consulta.q) parametros.set("q", estado.consulta.q);
  if (orden !== LISTADO_CONVOCATORIA.ordenInicial.columna || dir !== LISTADO_CONVOCATORIA.ordenInicial.dir) {
    parametros.set("orden", orden);
    parametros.set("dir", dir);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}
