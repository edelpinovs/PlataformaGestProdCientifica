import { z } from "zod";

import { ETIQUETA_NIVEL } from "@/modules/cuerpos-academicos/cuerpo";
import {
  analizarListado,
  paginar,
  type ConsultaListado,
  type DefinicionListado,
  type ErroresListado,
  type ParametrosListado,
  type Sentido,
} from "@/lib/listados/consulta";
import {
  columnasSinDatosPersonales,
  coincideDepartamento,
  leerDepartamento,
  mismaSeleccion,
  textoCorreo,
  textoCvu,
  type FiltroDepartamento,
} from "./comun";
import { calcularSemaforo, type Semaforo } from "./semaforo";

// Reporte de vigencias que arma la coordinación (RF-026, RF-027).
// Elige distinciones, columnas y el año de vencimiento. El estatus no se guarda:
// se calcula al consultar, con la fecha de hoy. Un cuerpo académico solo tiene año
// de vencimiento: el día que usa el estatus es el 31 de diciembre de ese año.

const ANIO_MINIMO = 1990;
const ANIO_MAXIMO = 2100;
const MENSAJE_ANIO = "El año debe tener cuatro dígitos, entre 1990 y 2100.";

export const TIPOS_DISTINCION = ["SNII", "PRODEP", "CA"] as const;
export type TipoDistincion = (typeof TIPOS_DISTINCION)[number];

export const COLUMNAS_VIGENCIA = ["tipo", "nombre", "correo", "cvu", "detalle", "departamento", "inicio", "fin", "semaforo"] as const;
export type ColumnaVigencia = (typeof COLUMNAS_VIGENCIA)[number];

export const ETIQUETA_TIPO: Record<TipoDistincion, string> = {
  SNII: "SNII",
  PRODEP: "PRODEP",
  CA: "Cuerpo académico",
};

export const ETIQUETA_COLUMNA: Record<ColumnaVigencia, string> = {
  tipo: "Distinción",
  nombre: "Nombre",
  correo: "Correo electrónico",
  cvu: "CVU",
  detalle: "Detalle",
  departamento: "Departamento",
  inicio: "Inicio",
  fin: "Vencimiento",
  semaforo: "Estatus",
};

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "Vigente",
  AMARILLO: "Por vencer",
  ROJO: "Vencido",
};

const ETIQUETA_NIVEL_SNII: Record<string, string> = {
  CANDIDATO: "Candidato",
  NIVEL_1: "Nivel I",
  NIVEL_2: "Nivel II",
  NIVEL_3: "Nivel III",
  EMERITO: "Emérito",
  NO_APROBADO: "No aprobado",
};

const ETIQUETA_PRODEP: Record<string, string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

export const SIN_DEPARTAMENTO = "Sin departamento";
export const SIN_CVU = "Sin CVU";
export const SIN_CORREO = "Sin correo";
export const NO_APLICA = "No aplica";

export const LISTADO_VIGENCIAS: DefinicionListado = {
  columnas: COLUMNAS_VIGENCIA,
  ordenInicial: { columna: "fin", dir: "asc" },
  filtros: { semaforo: ["VERDE", "AMARILLO", "ROJO"] },
};

export type FilaVigencia = {
  id: string;
  tipo: TipoDistincion;
  nombre: string;
  correo: string;
  cvu: string;
  detalle: string;
  departamento: string;
  departamentoId?: number | null;
  inicio: Date;
  fin: Date;
  semaforo: Semaforo;
};

export type EstadoReporte = {
  consulta: ConsultaListado;
  tipos: TipoDistincion[];
  columnas: ColumnaVigencia[];
  /** Año de la fecha de vencimiento. Null muestra todos los años. */
  anio: number | null;
  /** Null muestra todos. `sin` aísla a quien no tiene departamento. */
  departamentoId: FiltroDepartamento;
  errores: ErroresListado;
};

type DatosPersona = {
  id: number;
  inicio: Date;
  fin: Date;
  nombres: string;
  apellidos: string;
  departamento: string | null;
  departamentoId?: number | null;
  correo?: string | null;
  cvu?: string | null;
  resultado: string;
};

/** Un no aprobado no es una distinción vigente: no entra al estatus. */
export function cuentaParaSemaforo(resultado: string) {
  return resultado === "APROBADO" || resultado === "EN_RECONSIDERACION";
}

export function inicioDelDiaUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

export function inicioDeCuerpo(anio: number) {
  return new Date(Date.UTC(anio, 0, 1));
}

export function finDeCuerpo(anio: number) {
  return new Date(Date.UTC(anio, 11, 31));
}

export function formatoFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

function identificador(tipo: TipoDistincion, id: number) {
  return `${tipo.toLowerCase()}-${String(id).padStart(8, "0")}`;
}

function nombrePersona(nombres: string, apellidos: string) {
  return `${nombres} ${apellidos}`;
}

function detalleConReconsideracion(texto: string, resultado: string) {
  return resultado === "EN_RECONSIDERACION" ? `${texto} · En reconsideración` : texto;
}

export function filaSnii(datos: DatosPersona & { nivel: string }, hoy: Date): FilaVigencia {
  const nivel = ETIQUETA_NIVEL_SNII[datos.nivel] ?? datos.nivel;
  return {
    id: identificador("SNII", datos.id),
    tipo: "SNII",
    nombre: nombrePersona(datos.nombres, datos.apellidos),
    correo: textoCorreo(datos.correo, SIN_CORREO),
    cvu: textoCvu(datos.cvu, SIN_CVU),
    detalle: detalleConReconsideracion(nivel, datos.resultado),
    departamento: datos.departamento ?? SIN_DEPARTAMENTO,
    departamentoId: datos.departamentoId ?? null,
    inicio: datos.inicio,
    fin: datos.fin,
    semaforo: calcularSemaforo(datos.fin, hoy),
  };
}

export function filaProdep(datos: DatosPersona & { tipoSolicitud: string }, hoy: Date): FilaVigencia {
  const solicitud = ETIQUETA_PRODEP[datos.tipoSolicitud] ?? datos.tipoSolicitud;
  return {
    id: identificador("PRODEP", datos.id),
    tipo: "PRODEP",
    nombre: nombrePersona(datos.nombres, datos.apellidos),
    correo: textoCorreo(datos.correo, SIN_CORREO),
    cvu: textoCvu(datos.cvu, SIN_CVU),
    detalle: detalleConReconsideracion(solicitud, datos.resultado),
    departamento: datos.departamento ?? SIN_DEPARTAMENTO,
    departamentoId: datos.departamentoId ?? null,
    inicio: datos.inicio,
    fin: datos.fin,
    semaforo: calcularSemaforo(datos.fin, hoy),
  };
}

export function filaCuerpo(datos: {
  id: number;
  clave: string;
  nombre: string;
  nivel: string;
  anioRegistro: number;
  anioVencimiento: number;
  departamento: string;
  departamentoId?: number | null;
}, hoy: Date): FilaVigencia {
  const nivel = datos.nivel in ETIQUETA_NIVEL
    ? ETIQUETA_NIVEL[datos.nivel as keyof typeof ETIQUETA_NIVEL]
    : datos.nivel;
  return {
    id: identificador("CA", datos.id),
    tipo: "CA",
    nombre: `${datos.nombre} (${datos.clave})`,
    correo: NO_APLICA,
    cvu: NO_APLICA,
    detalle: nivel,
    departamento: datos.departamento,
    departamentoId: datos.departamentoId ?? null,
    inicio: inicioDeCuerpo(datos.anioRegistro),
    fin: finDeCuerpo(datos.anioVencimiento),
    semaforo: calcularSemaforo(finDeCuerpo(datos.anioVencimiento), hoy),
  };
}

export function textoColumna(fila: FilaVigencia, columna: ColumnaVigencia) {
  switch (columna) {
    case "tipo":
      return ETIQUETA_TIPO[fila.tipo];
    case "nombre":
      return fila.nombre;
    case "correo":
      return fila.correo;
    case "cvu":
      return fila.cvu;
    case "detalle":
      return fila.detalle;
    case "departamento":
      return fila.departamento;
    case "inicio":
      return formatoFecha(fila.inicio);
    case "fin":
      return formatoFecha(fila.fin);
    case "semaforo":
      return ETIQUETA_SEMAFORO[fila.semaforo];
  }
}

function esArmado(crudo: string | string[] | undefined) {
  return crudo === "1" || (Array.isArray(crudo) && crudo.includes("1"));
}

function leerSeleccion<T extends string>(
  crudo: string | string[] | undefined,
  vacioForzado: boolean,
  permitidos: readonly T[],
  mensajes: { vacio: string; desconocido: string },
  porOmision?: readonly T[],
) {
  if (vacioForzado) return { valores: [] as T[], error: mensajes.vacio };
  if (crudo === undefined) return { valores: [...(porOmision ?? permitidos)] };
  const partes = (Array.isArray(crudo) ? crudo : [crudo])
    .flatMap((parte) => parte.split(","))
    .map((parte) => parte.trim())
    .filter(Boolean);
  if (partes.length === 0) return { valores: [] as T[], error: mensajes.vacio };
  const valores = permitidos.filter((permitido) => partes.includes(permitido));
  if (partes.some((parte) => !permitidos.includes(parte as T))) {
    return { valores, error: mensajes.desconocido };
  }
  return { valores };
}

const MENSAJES_TIPOS = {
  vacio: "Elige al menos una distinción.",
  desconocido: "Hay una distinción que no existe.",
};

/** Distinciones que hay que cargar. Un valor inválido no recorta la consulta: el aviso lo da analizarReporte. */
export function tiposPedidos(parametros: ParametrosListado) {
  const tipos = leerSeleccion(
    parametros.tipos,
    esArmado(parametros.armado) && parametros.tipos === undefined,
    TIPOS_DISTINCION,
    MENSAJES_TIPOS,
  );
  return tipos.valores.length > 0 ? tipos.valores : [...TIPOS_DISTINCION];
}

/** Lee la URL del reporte. Un valor inválido no rompe la pantalla: se avisa y se ignora. */
export function analizarReporte(
  parametros: ParametrosListado,
  catalogo: { departamentos: readonly number[] },
): EstadoReporte {
  const { consulta, errores } = analizarListado(LISTADO_VIGENCIAS, parametros);
  const armado = esArmado(parametros.armado);
  const tipos = leerSeleccion(parametros.tipos, armado && parametros.tipos === undefined, TIPOS_DISTINCION, MENSAJES_TIPOS);
  const columnas = leerSeleccion(
    parametros.columnas,
    armado && parametros.columnas === undefined,
    COLUMNAS_VIGENCIA,
    { vacio: "Elige al menos una columna.", desconocido: "Hay una columna que no existe." },
    columnasSinDatosPersonales(COLUMNAS_VIGENCIA),
  );
  if (tipos.error) errores.tipos = tipos.error;
  if (columnas.error) errores.columnas = columnas.error;
  const anio = leerAnio(parametros.anio);
  if (anio.error) errores.anio = anio.error;
  const departamento = leerDepartamento(parametros.departamento, catalogo.departamentos);
  if (departamento.error) errores.departamento = departamento.error;
  return {
    consulta,
    tipos: tipos.valores,
    columnas: columnas.valores,
    anio: anio.anio,
    departamentoId: departamento.id,
    errores,
  };
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
  if (!resultado.success) {
    return { anio: null, error: resultado.error.issues[0]?.message ?? MENSAJE_ANIO };
  }
  return { anio: resultado.data };
}

/** Años de vencimiento que hay en el reporte, más el elegido si no tiene filas. */
export function opcionesAnio(filas: FilaVigencia[], anio: number | null) {
  const anios = filas.map((fila) => fila.fin.getUTCFullYear());
  if (anio !== null) anios.push(anio);
  return [...new Set(anios)].sort((a, b) => a - b);
}

function valorOrdenable(fila: FilaVigencia, columna: string) {
  if (columna === "inicio" || columna === "fin") return fila[columna].getTime();
  if (columna === "tipo" || columna === "nombre" || columna === "correo" || columna === "cvu" || columna === "detalle" || columna === "departamento" || columna === "semaforo") {
    return textoColumna(fila, columna);
  }
  return fila.id;
}

function comparar(a: FilaVigencia, b: FilaVigencia, columna: string, dir: Sentido) {
  const va = valorOrdenable(a, columna);
  const vb = valorOrdenable(b, columna);
  const resultado = typeof va === "number" && typeof vb === "number"
    ? va - vb
    : String(va).localeCompare(String(vb), "es");
  const desempatado = resultado === 0 ? a.id.localeCompare(b.id, "es") : resultado;
  return dir === "asc" ? desempatado : -desempatado;
}

function coincide(fila: FilaVigencia, estado: EstadoReporte) {
  const texto = estado.consulta.q.trim().toLocaleLowerCase("es-MX");
  if (!texto) return true;
  return estado.columnas.some((columna) => textoColumna(fila, columna).toLocaleLowerCase("es-MX").includes(texto));
}

/** Filtra, ordena y corta de 10 en 10 el reporte ya armado. Con `completo`, devuelve todas las filas filtradas. */
export function consultarVigencias(filas: FilaVigencia[], estado: EstadoReporte, completo = false) {
  if (estado.tipos.length === 0 || estado.columnas.length === 0) {
    return { filas: [], paginacion: paginar(0, estado.consulta) };
  }
  const semaforo = estado.consulta.filtros.semaforo;
  const filtradas = filas.filter((fila) =>
    estado.tipos.includes(fila.tipo)
    && coincide(fila, estado)
    && (!semaforo || fila.semaforo === semaforo)
    && (estado.anio === null || fila.fin.getUTCFullYear() === estado.anio)
    && coincideDepartamento(fila.departamentoId, estado.departamentoId));
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden)
    ? estado.consulta.orden
    : estado.columnas[0];
  const ordenadas = [...filtradas].sort((a, b) => comparar(a, b, orden, estado.consulta.dir));
  const paginacion = paginar(ordenadas.length, estado.consulta);
  return {
    filas: completo ? ordenadas : ordenadas.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
  };
}

/** Conserva distinciones, columnas, año, departamento, búsqueda y estatus al ordenar o cambiar de página. */
export function enlaceReporte(
  base: string,
  estado: EstadoReporte,
  cambios: { pagina?: number; orden?: string; dir?: Sentido } = {},
) {
  const orden = cambios.orden ?? estado.consulta.orden;
  const dir = cambios.dir ?? estado.consulta.dir;
  const cambiaOrden = cambios.orden !== undefined || cambios.dir !== undefined;
  const pagina = cambios.pagina ?? (cambiaOrden ? 1 : estado.consulta.pagina);
  const parametros = new URLSearchParams();
  if (estado.tipos.length === 0 || estado.columnas.length === 0) parametros.set("armado", "1");
  if (estado.tipos.length > 0 && estado.tipos.length !== TIPOS_DISTINCION.length) {
    parametros.set("tipos", estado.tipos.join(","));
  }
  if (estado.columnas.length > 0 && !mismaSeleccion(estado.columnas, columnasSinDatosPersonales(COLUMNAS_VIGENCIA))) {
    parametros.set("columnas", estado.columnas.join(","));
  }
  if (estado.anio !== null) parametros.set("anio", String(estado.anio));
  if (estado.departamentoId !== null) parametros.set("departamento", String(estado.departamentoId));
  if (estado.consulta.q) parametros.set("q", estado.consulta.q);
  if (estado.consulta.filtros.semaforo) parametros.set("semaforo", estado.consulta.filtros.semaforo);
  if (orden !== LISTADO_VIGENCIAS.ordenInicial.columna || dir !== LISTADO_VIGENCIAS.ordenInicial.dir) {
    parametros.set("orden", orden);
    parametros.set("dir", dir);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}
