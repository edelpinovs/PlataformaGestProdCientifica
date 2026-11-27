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
import { ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "@/modules/profesores/profesores";
import { calcularSemaforo } from "./semaforo";
import { SIN_CORREO, SIN_CVU, SIN_DEPARTAMENTO } from "./vigencias";

// Matriz de profesores para acreditación (RF-029).
// Una fila por profesor. Se filtra por departamento o por programa educativo.
// El SNII y el PRODEP se muestran solo si hoy están vigentes. Los proyectos
// activos no entran: el plan los dejó fuera de alcance.

const ETIQUETA_NIVEL_SNII: Record<string, string> = {
  CANDIDATO: "Candidato",
  NIVEL_1: "Nivel I",
  NIVEL_2: "Nivel II",
  NIVEL_3: "Nivel III",
  EMERITO: "Emérito",
};

export const SIN_SNII = "Sin SNII";
export const SIN_PRODEP = "Sin PRODEP";
export const SIN_PROGRAMA = "Sin programa";
export const SIN_GRADO = "Sin grado";

export const COLUMNAS_MATRIZ = [
  "codigo", "nombre", "correo", "cvu", "departamento", "programas", "grado", "contratacion", "estatus", "snii", "prodep",
] as const;
export type ColumnaMatriz = (typeof COLUMNAS_MATRIZ)[number];

export const ETIQUETA_COLUMNA_MATRIZ: Record<ColumnaMatriz, string> = {
  codigo: "Código",
  nombre: "Nombre",
  correo: "Correo electrónico",
  cvu: "CVU",
  departamento: "Departamento",
  programas: "Programa educativo",
  grado: "Grado",
  contratacion: "Contratación",
  estatus: "Estatus",
  snii: "SNII",
  prodep: "PRODEP",
};

export const LISTADO_MATRIZ: DefinicionListado = {
  columnas: COLUMNAS_MATRIZ,
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export type FilaMatriz = {
  id: string;
  departamentoId: number | null;
  programaIds: number[];
  codigo: string;
  nombre: string;
  correo: string;
  cvu: string;
  departamento: string;
  programas: string;
  grado: string;
  contratacion: string;
  estatus: string;
  snii: string;
  prodep: string;
};

export type EstadoMatriz = {
  consulta: ConsultaListado;
  columnas: ColumnaMatriz[];
  departamentoId: number | null;
  programaId: number | null;
  errores: ErroresListado;
};

type Reconocimiento = { inicio: Date; fin: Date; nivel?: string };

export function distincionVigente(inicio: Date, fin: Date, hoy: Date) {
  return inicio <= hoy && calcularSemaforo(fin, hoy) !== "ROJO";
}

function nivelVigente(reconocimientos: Reconocimiento[], hoy: Date) {
  const vigente = reconocimientos
    .filter((fila) => distincionVigente(fila.inicio, fila.fin, hoy))
    .sort((a, b) => b.fin.getTime() - a.fin.getTime())[0];
  if (!vigente) return null;
  return ETIQUETA_NIVEL_SNII[vigente.nivel ?? ""] ?? vigente.nivel ?? SIN_SNII;
}

export function filaMatriz(datos: {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  correo?: string | null;
  cvu?: string | null;
  tipoContratacion: keyof typeof ETIQUETA_CONTRATACION;
  estatusLaboral: keyof typeof ETIQUETA_ESTATUS;
  departamento: { id: number; nombre: string } | null;
  grado: string | null;
  programas: { id: number; nombre: string }[];
  snii: Reconocimiento[];
  prodep: Reconocimiento[];
}, hoy: Date): FilaMatriz {
  const programas = [...datos.programas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const nivel = nivelVigente(datos.snii, hoy);
  return {
    id: `profesor-${String(datos.id).padStart(8, "0")}`,
    departamentoId: datos.departamento?.id ?? null,
    programaIds: programas.map((programa) => programa.id),
    codigo: datos.codigo,
    nombre: `${datos.nombres} ${datos.apellidos}`,
    correo: datos.correo?.trim() || SIN_CORREO,
    cvu: datos.cvu?.trim() || SIN_CVU,
    departamento: datos.departamento?.nombre ?? SIN_DEPARTAMENTO,
    programas: programas.map((programa) => programa.nombre).join(", ") || SIN_PROGRAMA,
    grado: datos.grado ?? SIN_GRADO,
    contratacion: ETIQUETA_CONTRATACION[datos.tipoContratacion],
    estatus: ETIQUETA_ESTATUS[datos.estatusLaboral],
    snii: nivel ?? SIN_SNII,
    prodep: datos.prodep.some((fila) => distincionVigente(fila.inicio, fila.fin, hoy)) ? "Vigente" : SIN_PRODEP,
  };
}

function esArmado(crudo: string | string[] | undefined) {
  return crudo === "1" || (Array.isArray(crudo) && crudo.includes("1"));
}

function leerColumnas(crudo: string | string[] | undefined, vacioForzado: boolean) {
  if (vacioForzado) return { valores: [] as ColumnaMatriz[], error: "Elige al menos una columna." };
  if (crudo === undefined) return { valores: [...COLUMNAS_MATRIZ] };
  const partes = (Array.isArray(crudo) ? crudo : [crudo]).flatMap((parte) => parte.split(",")).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length === 0) return { valores: [] as ColumnaMatriz[], error: "Elige al menos una columna." };
  const valores = COLUMNAS_MATRIZ.filter((columna) => partes.includes(columna));
  if (partes.some((parte) => !(COLUMNAS_MATRIZ as readonly string[]).includes(parte))) {
    return { valores, error: "Hay una columna que no existe." };
  }
  return { valores };
}

function leerId(crudo: string | string[] | undefined, permitidos: readonly number[], mensajes: { repetido: string; inexistente: string }) {
  if (crudo === undefined || crudo === "") return { id: null };
  const resultado = z.string({ error: mensajes.repetido }).regex(/^\d+$/, mensajes.inexistente).transform(Number).safeParse(crudo);
  if (!resultado.success || !permitidos.includes(resultado.data)) {
    return { id: null, error: resultado.success ? mensajes.inexistente : resultado.error.issues[0]?.message ?? mensajes.inexistente };
  }
  return { id: resultado.data };
}

export function analizarMatriz(
  parametros: ParametrosListado,
  catalogo: { departamentos: readonly number[]; programas: readonly number[] },
): EstadoMatriz {
  const { consulta, errores } = analizarListado(LISTADO_MATRIZ, parametros);
  const columnas = leerColumnas(parametros.columnas, esArmado(parametros.armado) && parametros.columnas === undefined);
  const departamento = leerId(parametros.departamento, catalogo.departamentos, {
    repetido: "Elige un solo departamento.",
    inexistente: "Elige un departamento que exista.",
  });
  const programa = leerId(parametros.programa, catalogo.programas, {
    repetido: "Elige un solo programa educativo.",
    inexistente: "Elige un programa educativo que exista.",
  });
  if (columnas.error) errores.columnas = columnas.error;
  if (departamento.error) errores.departamento = departamento.error;
  if (programa.error) errores.programa = programa.error;
  return { consulta, columnas: columnas.valores, departamentoId: departamento.id, programaId: programa.id, errores };
}

export function textoMatriz(fila: FilaMatriz, columna: ColumnaMatriz) {
  return fila[columna];
}

export function consultarMatriz(filas: FilaMatriz[], estado: EstadoMatriz, completo = false) {
  if (estado.columnas.length === 0) return { filas: [] as FilaMatriz[], paginacion: paginar(0, estado.consulta) };
  const texto = estado.consulta.q.trim().toLocaleLowerCase("es-MX");
  const coinciden = filas.filter((fila) => {
    if (estado.departamentoId !== null && fila.departamentoId !== estado.departamentoId) return false;
    if (estado.programaId !== null && !fila.programaIds.includes(estado.programaId)) return false;
    if (!texto) return true;
    return estado.columnas.some((columna) => fila[columna].toLocaleLowerCase("es-MX").includes(texto));
  });
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden) ? estado.consulta.orden as ColumnaMatriz : estado.columnas[0];
  coinciden.sort((a, b) => {
    const resultado = a[orden].localeCompare(b[orden], "es");
    const desempatado = resultado === 0 ? a.id.localeCompare(b.id, "es") : resultado;
    return estado.consulta.dir === "asc" ? desempatado : -desempatado;
  });
  const paginacion = paginar(coinciden.length, estado.consulta);
  return {
    filas: completo ? coinciden : coinciden.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
  };
}

export function enlaceMatriz(base: string, estado: EstadoMatriz, cambios: { pagina?: number; orden?: string; dir?: Sentido } = {}) {
  const orden = cambios.orden ?? estado.consulta.orden;
  const dir = cambios.dir ?? estado.consulta.dir;
  const cambiaOrden = cambios.orden !== undefined || cambios.dir !== undefined;
  const pagina = cambios.pagina ?? (cambiaOrden ? 1 : estado.consulta.pagina);
  const parametros = new URLSearchParams();
  if (estado.columnas.length === 0) parametros.set("armado", "1");
  else if (estado.columnas.length !== COLUMNAS_MATRIZ.length) parametros.set("columnas", estado.columnas.join(","));
  if (estado.departamentoId !== null) parametros.set("departamento", String(estado.departamentoId));
  if (estado.programaId !== null) parametros.set("programa", String(estado.programaId));
  if (estado.consulta.q) parametros.set("q", estado.consulta.q);
  if (orden !== LISTADO_MATRIZ.ordenInicial.columna || dir !== LISTADO_MATRIZ.ordenInicial.dir) {
    parametros.set("orden", orden);
    parametros.set("dir", dir);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}
