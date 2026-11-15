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
import { calcularSemaforo, type Semaforo } from "./semaforo";

// Reporte de vigencias que arma la coordinación (RF-026).
// Elige distinciones y columnas; el semáforo no se guarda: se calcula al consultar,
// con la fecha de hoy. Un cuerpo académico solo tiene año de vencimiento: el día
// que usa el semáforo es el 31 de diciembre de ese año.

export const TIPOS_DISTINCION = ["SNII", "PRODEP", "CA"] as const;
export type TipoDistincion = (typeof TIPOS_DISTINCION)[number];

export const COLUMNAS_VIGENCIA = ["tipo", "nombre", "detalle", "departamento", "inicio", "fin", "semaforo"] as const;
export type ColumnaVigencia = (typeof COLUMNAS_VIGENCIA)[number];

export const ETIQUETA_TIPO: Record<TipoDistincion, string> = {
  SNII: "SNII",
  PRODEP: "PRODEP",
  CA: "Cuerpo académico",
};

export const ETIQUETA_COLUMNA: Record<ColumnaVigencia, string> = {
  tipo: "Distinción",
  nombre: "Nombre",
  detalle: "Detalle",
  departamento: "Departamento",
  inicio: "Inicio",
  fin: "Vencimiento",
  semaforo: "Semáforo",
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

export const LISTADO_VIGENCIAS: DefinicionListado = {
  columnas: COLUMNAS_VIGENCIA,
  ordenInicial: { columna: "fin", dir: "asc" },
  filtros: { semaforo: ["VERDE", "AMARILLO", "ROJO"] },
};

export type FilaVigencia = {
  id: string;
  tipo: TipoDistincion;
  nombre: string;
  detalle: string;
  departamento: string;
  inicio: Date;
  fin: Date;
  semaforo: Semaforo;
};

export type EstadoReporte = {
  consulta: ConsultaListado;
  tipos: TipoDistincion[];
  columnas: ColumnaVigencia[];
  errores: ErroresListado;
};

type DatosPersona = {
  id: number;
  inicio: Date;
  fin: Date;
  nombres: string;
  apellidos: string;
  departamento: string | null;
  resultado: string;
};

/** Un no aprobado no es una distinción vigente: no entra al semáforo. */
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
    detalle: detalleConReconsideracion(nivel, datos.resultado),
    departamento: datos.departamento ?? SIN_DEPARTAMENTO,
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
    detalle: detalleConReconsideracion(solicitud, datos.resultado),
    departamento: datos.departamento ?? SIN_DEPARTAMENTO,
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
}, hoy: Date): FilaVigencia {
  const nivel = datos.nivel in ETIQUETA_NIVEL
    ? ETIQUETA_NIVEL[datos.nivel as keyof typeof ETIQUETA_NIVEL]
    : datos.nivel;
  return {
    id: identificador("CA", datos.id),
    tipo: "CA",
    nombre: `${datos.nombre} (${datos.clave})`,
    detalle: nivel,
    departamento: datos.departamento,
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
) {
  if (vacioForzado) return { valores: [] as T[], error: mensajes.vacio };
  if (crudo === undefined) return { valores: [...permitidos] };
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

/** Lee la URL del reporte. Un valor inválido no rompe la pantalla: se avisa y se ignora. */
export function analizarReporte(parametros: ParametrosListado): EstadoReporte {
  const { consulta, errores } = analizarListado(LISTADO_VIGENCIAS, parametros);
  const armado = esArmado(parametros.armado);
  const tipos = leerSeleccion(parametros.tipos, armado && parametros.tipos === undefined, TIPOS_DISTINCION, {
    vacio: "Elige al menos una distinción.",
    desconocido: "Hay una distinción que no existe.",
  });
  const columnas = leerSeleccion(parametros.columnas, armado && parametros.columnas === undefined, COLUMNAS_VIGENCIA, {
    vacio: "Elige al menos una columna.",
    desconocido: "Hay una columna que no existe.",
  });
  if (tipos.error) errores.tipos = tipos.error;
  if (columnas.error) errores.columnas = columnas.error;
  return { consulta, tipos: tipos.valores, columnas: columnas.valores, errores };
}

function valorOrdenable(fila: FilaVigencia, columna: string) {
  if (columna === "inicio" || columna === "fin") return fila[columna].getTime();
  if (columna === "tipo" || columna === "nombre" || columna === "detalle" || columna === "departamento" || columna === "semaforo") {
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

/** Filtra, ordena y corta de 10 en 10 el reporte ya armado. */
export function consultarVigencias(filas: FilaVigencia[], estado: EstadoReporte) {
  if (estado.tipos.length === 0 || estado.columnas.length === 0) {
    return { filas: [], paginacion: paginar(0, estado.consulta) };
  }
  const semaforo = estado.consulta.filtros.semaforo;
  const filtradas = filas.filter((fila) => estado.tipos.includes(fila.tipo) && coincide(fila, estado) && (!semaforo || fila.semaforo === semaforo));
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden)
    ? estado.consulta.orden
    : estado.columnas[0];
  const ordenadas = [...filtradas].sort((a, b) => comparar(a, b, orden, estado.consulta.dir));
  const paginacion = paginar(ordenadas.length, estado.consulta);
  return {
    filas: ordenadas.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
  };
}

/** Conserva distinciones, columnas, búsqueda y semáforo al ordenar o cambiar de página. */
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
  if (estado.columnas.length > 0 && estado.columnas.length !== COLUMNAS_VIGENCIA.length) {
    parametros.set("columnas", estado.columnas.join(","));
  }
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
