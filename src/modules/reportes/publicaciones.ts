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
import { ETIQUETAS_FUENTE, ETIQUETAS_TIPO } from "@/modules/produccion/consulta";
import { coincideDepartamento, incluyeBusqueda, leerDepartamento, type FiltroDepartamento } from "./comun";
import { SIN_DEPARTAMENTO } from "./vigencias";

// Resultados de publicaciones (D-304). Una fila por profesor.
// El total y el desglose cuentan autorías validadas. Pendientes y rechazadas
// van en columnas aparte y no se suman. El año es el de la fecha de publicación.

export const SIN_ANIO = "Sin año";
export const SIN_OBRAS = "Sin obras validadas";
export const ACTIVIDAD_ACTIVA = "Activo";
export const ACTIVIDAD_NO_ACTIVA = "No activo";
export const ACTIVIDADES_REPORTE = ["activa", "no-activa"] as const;
export type ActividadReporte = (typeof ACTIVIDADES_REPORTE)[number];

export const TIPOS_REPORTE = ["ARTICULO", "LIBRO", "CAPITULO", "MEMORIA_CONGRESO", "REGISTRO_SOFTWARE", "PATENTE", "OTRO"] as const;
export const FUENTES_REPORTE = ["SCOPUS", "OPENALEX", "ORCID", "CROSSREF", "GOOGLE_SCHOLAR", "MANUAL"] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];
export type FuenteReporte = (typeof FUENTES_REPORTE)[number];
export type EstadoObra = "PENDIENTE" | "VALIDADA" | "RECHAZADA";

const MENSAJE_ANIO = "Elige un año que aparezca en el reporte.";
const MENSAJE_ANIO_REPETIDO = "Elige un solo año.";
const MENSAJE_TIPO = "Elige un tipo de publicación.";
const MENSAJE_TIPO_REPETIDO = "Elige un solo tipo de publicación.";
const MENSAJE_FUENTE = "Elige una fuente principal.";
const MENSAJE_FUENTE_REPETIDA = "Elige una sola fuente principal.";
const MENSAJE_ACTIVIDAD = "Elige Activo o No activo.";
const MENSAJE_ACTIVIDAD_REPETIDA = "Elige una sola actividad.";

export const COLUMNAS_RESULTADOS = [
  "codigo", "nombre", "departamento", "actividad",
  "validadas", "pendientes", "rechazadas",
  "porAnio", "porTipo", "porFuente",
] as const;
export type ColumnaResultado = (typeof COLUMNAS_RESULTADOS)[number];

const COLUMNAS_NUMERICAS = new Set<ColumnaResultado>(["validadas", "pendientes", "rechazadas"]);

export const ETIQUETA_COLUMNA_RESULTADOS: Record<ColumnaResultado, string> = {
  codigo: "Código",
  nombre: "Nombre",
  departamento: "Departamento",
  actividad: "Actividad",
  validadas: "Obras validadas",
  pendientes: "Pendientes",
  rechazadas: "Rechazadas",
  porAnio: "Por año",
  porTipo: "Por tipo",
  porFuente: "Por fuente principal",
};

export const LISTADO_RESULTADOS: DefinicionListado = {
  columnas: COLUMNAS_RESULTADOS,
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export type ObraResultado = {
  publicacionId: number;
  estado: EstadoObra;
  tipo: TipoReporte;
  fuente: FuenteReporte;
  anio: number | null;
};

export type DatosResultado = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  estatusLaboral: "ACTIVO" | "LICENCIA" | "ESTANCIA_POSDOCTORAL";
  departamento: { id: number; nombre: string } | null;
  obras: ObraResultado[];
};

export type CorteObras = {
  anio: number | "sin" | null;
  tipo: TipoReporte | null;
  fuente: FuenteReporte | null;
};

export type FilaResultado = {
  id: string;
  departamentoId: number | null;
  idsValidadas: number[];
  codigo: string;
  nombre: string;
  departamento: string;
  actividad: string;
  validadas: number;
  pendientes: number;
  rechazadas: number;
  porAnio: string;
  porTipo: string;
  porFuente: string;
};

export type CatalogoResultados = {
  departamentos: readonly number[];
  anios: readonly number[];
  haySinAnio: boolean;
};

export type EstadoResultados = CorteObras & {
  consulta: ConsultaListado;
  columnas: ColumnaResultado[];
  departamentoId: FiltroDepartamento;
  actividad: ActividadReporte | null;
  errores: ErroresListado;
};

export function anioDePublicacion(fecha: Date | null) {
  return fecha === null ? null : fecha.getUTCFullYear();
}

function coincideObra(obra: ObraResultado, corte: CorteObras) {
  if (corte.anio === "sin" && obra.anio !== null) return false;
  if (typeof corte.anio === "number" && obra.anio !== corte.anio) return false;
  if (corte.tipo !== null && obra.tipo !== corte.tipo) return false;
  if (corte.fuente !== null && obra.fuente !== corte.fuente) return false;
  return true;
}

function textoConteo(partes: { etiqueta: string; total: number }[]) {
  const visibles = partes.filter((parte) => parte.total > 0);
  if (visibles.length === 0) return SIN_OBRAS;
  return visibles.map((parte) => `${parte.etiqueta} (${parte.total})`).join("; ");
}

function desgloseAnio(obras: ObraResultado[]) {
  const cuentas = new Map<number | "sin", number>();
  for (const obra of obras) {
    const clave = obra.anio ?? "sin";
    cuentas.set(clave, (cuentas.get(clave) ?? 0) + 1);
  }
  const anios = [...cuentas.keys()].filter((clave) => clave !== "sin").sort((a, b) => Number(b) - Number(a));
  const orden = cuentas.has("sin") ? [...anios, "sin" as const] : anios;
  return textoConteo(orden.map((clave) => ({
    etiqueta: clave === "sin" ? SIN_ANIO : String(clave),
    total: cuentas.get(clave) ?? 0,
  })));
}

function desgloseClaves<T extends string>(obras: ObraResultado[], clave: "tipo" | "fuente", orden: readonly T[], etiquetas: Record<T, string>) {
  const cuentas = new Map<T, number>();
  for (const obra of obras) {
    const valor = obra[clave] as T;
    cuentas.set(valor, (cuentas.get(valor) ?? 0) + 1);
  }
  const conocidas = orden.filter((valor) => cuentas.has(valor));
  const resto = [...cuentas.keys()].filter((valor) => !orden.includes(valor));
  return textoConteo([...conocidas, ...resto].map((valor) => ({
    etiqueta: etiquetas[valor],
    total: cuentas.get(valor) ?? 0,
  })));
}

export function filaResultados(datos: DatosResultado, corte: CorteObras): FilaResultado {
  const elegidas = datos.obras.filter((obra) => coincideObra(obra, corte));
  const validadas = elegidas.filter((obra) => obra.estado === "VALIDADA");
  return {
    id: `profesor-${String(datos.id).padStart(8, "0")}`,
    departamentoId: datos.departamento?.id ?? null,
    idsValidadas: validadas.map((obra) => obra.publicacionId),
    codigo: datos.codigo,
    nombre: `${datos.nombres} ${datos.apellidos}`,
    departamento: datos.departamento?.nombre ?? SIN_DEPARTAMENTO,
    actividad: datos.estatusLaboral === "ACTIVO" ? ACTIVIDAD_ACTIVA : ACTIVIDAD_NO_ACTIVA,
    validadas: validadas.length,
    pendientes: elegidas.filter((obra) => obra.estado === "PENDIENTE").length,
    rechazadas: elegidas.filter((obra) => obra.estado === "RECHAZADA").length,
    porAnio: desgloseAnio(validadas),
    porTipo: desgloseClaves(validadas, "tipo", TIPOS_REPORTE, ETIQUETAS_TIPO),
    porFuente: desgloseClaves(validadas, "fuente", FUENTES_REPORTE, ETIQUETAS_FUENTE),
  };
}

export function contarObrasDistintas(filas: FilaResultado[]) {
  return new Set(filas.flatMap((fila) => fila.idsValidadas)).size;
}

function esArmado(crudo: string | string[] | undefined) {
  return crudo === "1" || (Array.isArray(crudo) && crudo.includes("1"));
}

function leerColumnas(crudo: string | string[] | undefined, vacioForzado: boolean) {
  if (vacioForzado) return { valores: [] as ColumnaResultado[], error: "Elige al menos una columna." };
  if (crudo === undefined) return { valores: [...COLUMNAS_RESULTADOS] };
  const partes = (Array.isArray(crudo) ? crudo : [crudo]).flatMap((parte) => parte.split(",")).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length === 0) return { valores: [] as ColumnaResultado[], error: "Elige al menos una columna." };
  const valores = COLUMNAS_RESULTADOS.filter((columna) => partes.includes(columna));
  if (partes.some((parte) => !(COLUMNAS_RESULTADOS as readonly string[]).includes(parte))) {
    return { valores, error: "Hay una columna que no existe." };
  }
  return { valores };
}

function leerOpcion<T extends string>(crudo: string | string[] | undefined, valores: readonly T[], mensajes: { repetido: string; invalido: string }) {
  if (crudo === undefined || crudo === "") return { valor: null as T | null };
  if (Array.isArray(crudo)) return { valor: null as T | null, error: mensajes.repetido };
  const texto = crudo.trim();
  if (texto === "") return { valor: null as T | null };
  const resultado = z.enum(valores as [T, ...T[]], { error: mensajes.invalido }).safeParse(texto);
  if (!resultado.success) return { valor: null as T | null, error: resultado.error.issues[0]?.message ?? mensajes.invalido };
  return { valor: resultado.data };
}

function leerAnio(crudo: string | string[] | undefined, catalogo: CatalogoResultados) {
  if (crudo === undefined || crudo === "") return { anio: null as CorteObras["anio"] };
  if (Array.isArray(crudo)) return { anio: null as CorteObras["anio"], error: MENSAJE_ANIO_REPETIDO };
  const texto = crudo.trim();
  if (texto === "") return { anio: null as CorteObras["anio"] };
  if (texto === "sin") {
    return catalogo.haySinAnio
      ? { anio: "sin" as const }
      : { anio: null as CorteObras["anio"], error: MENSAJE_ANIO };
  }
  const resultado = z.string({ error: MENSAJE_ANIO_REPETIDO }).regex(/^\d{4}$/, MENSAJE_ANIO).transform(Number).safeParse(texto);
  if (!resultado.success || !catalogo.anios.includes(resultado.data)) {
    return { anio: null as CorteObras["anio"], error: resultado.success ? MENSAJE_ANIO : resultado.error.issues[0]?.message ?? MENSAJE_ANIO };
  }
  return { anio: resultado.data };
}

export function analizarResultados(parametros: ParametrosListado, catalogo: CatalogoResultados): EstadoResultados {
  const { consulta, errores } = analizarListado(LISTADO_RESULTADOS, parametros);
  const columnas = leerColumnas(parametros.columnas, esArmado(parametros.armado) && parametros.columnas === undefined);
  const departamento = leerDepartamento(parametros.departamento, catalogo.departamentos);
  const anio = leerAnio(parametros.anio, catalogo);
  const tipo = leerOpcion(parametros.tipo, TIPOS_REPORTE, { repetido: MENSAJE_TIPO_REPETIDO, invalido: MENSAJE_TIPO });
  const fuente = leerOpcion(parametros.fuente, FUENTES_REPORTE, { repetido: MENSAJE_FUENTE_REPETIDA, invalido: MENSAJE_FUENTE });
  const actividad = leerOpcion(parametros.actividad, ACTIVIDADES_REPORTE, { repetido: MENSAJE_ACTIVIDAD_REPETIDA, invalido: MENSAJE_ACTIVIDAD });
  if (columnas.error) errores.columnas = columnas.error;
  if (departamento.error) errores.departamento = departamento.error;
  if (anio.error) errores.anio = anio.error;
  if (tipo.error) errores.tipo = tipo.error;
  if (fuente.error) errores.fuente = fuente.error;
  if (actividad.error) errores.actividad = actividad.error;
  return {
    consulta,
    columnas: columnas.valores,
    departamentoId: departamento.id,
    actividad: actividad.valor,
    anio: anio.anio,
    tipo: tipo.valor,
    fuente: fuente.valor,
    errores,
  };
}

export function textoResultados(fila: FilaResultado, columna: ColumnaResultado) {
  const valor = fila[columna];
  return typeof valor === "number" ? String(valor) : valor;
}

function valorOrdenable(fila: FilaResultado, columna: ColumnaResultado) {
  return COLUMNAS_NUMERICAS.has(columna) ? fila[columna] as number : textoResultados(fila, columna);
}

export function consultarResultados(filas: FilaResultado[], estado: EstadoResultados, completo = false) {
  if (estado.columnas.length === 0) {
    return { filas: [] as FilaResultado[], paginacion: paginar(0, estado.consulta), obrasDistintas: 0 };
  }
  const busqueda = estado.consulta.q.trim().toLocaleLowerCase("es-MX");
  const coinciden = filas.filter((fila) => {
    if (!coincideDepartamento(fila.departamentoId, estado.departamentoId)) return false;
    if (estado.actividad === "activa" && fila.actividad !== ACTIVIDAD_ACTIVA) return false;
    if (estado.actividad === "no-activa" && fila.actividad !== ACTIVIDAD_NO_ACTIVA) return false;
    if (!busqueda) return true;
    return estado.columnas.some((columna) => incluyeBusqueda(textoResultados(fila, columna), busqueda));
  });
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden)
    ? estado.consulta.orden as ColumnaResultado
    : estado.columnas[0];
  coinciden.sort((a, b) => {
    const va = valorOrdenable(a, orden);
    const vb = valorOrdenable(b, orden);
    const resultado = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
    const desempatado = resultado === 0 ? a.id.localeCompare(b.id, "es") : resultado;
    return estado.consulta.dir === "asc" ? desempatado : -desempatado;
  });
  const paginacion = paginar(coinciden.length, estado.consulta);
  return {
    filas: completo ? coinciden : coinciden.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
    obrasDistintas: contarObrasDistintas(coinciden),
  };
}

export function enlaceResultados(base: string, estado: EstadoResultados, cambios: { pagina?: number; orden?: string; dir?: Sentido } = {}) {
  const orden = cambios.orden ?? estado.consulta.orden;
  const dir = cambios.dir ?? estado.consulta.dir;
  const cambiaOrden = cambios.orden !== undefined || cambios.dir !== undefined;
  const pagina = cambios.pagina ?? (cambiaOrden ? 1 : estado.consulta.pagina);
  const parametros = new URLSearchParams();
  if (estado.columnas.length === 0) parametros.set("armado", "1");
  else if (estado.columnas.length !== COLUMNAS_RESULTADOS.length) parametros.set("columnas", estado.columnas.join(","));
  if (estado.departamentoId !== null) parametros.set("departamento", String(estado.departamentoId));
  if (estado.anio !== null) parametros.set("anio", String(estado.anio));
  if (estado.tipo !== null) parametros.set("tipo", estado.tipo);
  if (estado.fuente !== null) parametros.set("fuente", estado.fuente);
  if (estado.actividad !== null) parametros.set("actividad", estado.actividad);
  if (estado.consulta.q) parametros.set("q", estado.consulta.q);
  if (orden !== LISTADO_RESULTADOS.ordenInicial.columna || dir !== LISTADO_RESULTADOS.ordenInicial.dir) {
    parametros.set("orden", orden);
    parametros.set("dir", dir);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}
