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
import {
  columnasSinDatosPersonales,
  coincideDepartamento,
  leerDepartamento,
  mismaSeleccion,
  textoCorreo,
  textoCvu,
  type FiltroDepartamento,
} from "./comun";
import { ETIQUETA_GENERO, type Genero } from "./convocatoria";
import { distincionVigente, SIN_GRADO, SIN_PROGRAMA, SIN_PRODEP, SIN_SNII } from "./matriz";
import { calcularSemaforo } from "./semaforo";
import { ETIQUETA_SEMAFORO, finDeCuerpo, formatoFecha, SIN_CORREO, SIN_CVU, SIN_DEPARTAMENTO } from "./vigencias";

// Reporte completo, adicional a vigencias, convocatoria y matriz.
// Una fila por profesor. La persona elige qué datos entran en esa fila.
// El SNII y el PRODEP se muestran solo si hoy están vigentes. Las publicaciones
// son las ya validadas. Los proyectos activos no existen en el sistema.

export const SIN_CUERPO = "Sin cuerpo académico";
export const SIN_CONVOCATORIA = "Sin convocatoria";
export const SIN_PUBLICACIONES = "Sin publicaciones";

export const COLUMNAS_COMPLETO = [
  "codigo", "nombre", "correo", "cvu", "genero", "departamento", "programas", "grado", "contratacion", "estatus",
  "snii", "sniiFin", "sniiSemaforo",
  "prodep", "prodepFin", "prodepSemaforo",
  "cuerpos", "caFin", "caSemaforo",
  "convocatoria", "publicaciones",
] as const;
export type ColumnaCompleto = (typeof COLUMNAS_COMPLETO)[number];

export const ETIQUETA_COLUMNA_COMPLETO: Record<ColumnaCompleto, string> = {
  codigo: "Código",
  nombre: "Nombre",
  correo: "Correo electrónico",
  cvu: "CVU",
  genero: "Género",
  departamento: "Departamento",
  programas: "Programa educativo",
  grado: "Grado",
  contratacion: "Contratación",
  estatus: "Estatus laboral",
  snii: "SNII",
  sniiFin: "Vencimiento SNII",
  sniiSemaforo: "Estatus SNII",
  prodep: "PRODEP",
  prodepFin: "Vencimiento PRODEP",
  prodepSemaforo: "Estatus PRODEP",
  cuerpos: "Cuerpo académico",
  caFin: "Vencimiento del cuerpo",
  caSemaforo: "Estatus del cuerpo",
  convocatoria: "Convocatoria",
  publicaciones: "Publicaciones",
};

export const GRUPOS_COMPLETO: { titulo: string; columnas: ColumnaCompleto[] }[] = [
  { titulo: "Directorio", columnas: ["codigo", "nombre", "correo", "cvu", "genero", "departamento", "programas", "grado", "contratacion", "estatus"] },
  { titulo: "SNII", columnas: ["snii", "sniiFin", "sniiSemaforo"] },
  { titulo: "PRODEP", columnas: ["prodep", "prodepFin", "prodepSemaforo"] },
  { titulo: "Cuerpo académico", columnas: ["cuerpos", "caFin", "caSemaforo"] },
  { titulo: "Convocatoria", columnas: ["convocatoria"] },
  { titulo: "Producción", columnas: ["publicaciones"] },
];

const ETIQUETA_NIVEL_SNII: Record<string, string> = {
  CANDIDATO: "Candidato",
  NIVEL_1: "Nivel I",
  NIVEL_2: "Nivel II",
  NIVEL_3: "Nivel III",
  EMERITO: "Emérito",
};

const ETIQUETA_RESULTADO: Record<string, string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export const LISTADO_COMPLETO: DefinicionListado = {
  columnas: COLUMNAS_COMPLETO,
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export type FilaCompleto = {
  id: string;
  departamentoId: number | null;
  programaIds: number[];
  sniiFinOrden: number;
  prodepFinOrden: number;
  caFinOrden: number;
} & Record<ColumnaCompleto, string>;

export type EstadoCompleto = {
  consulta: ConsultaListado;
  columnas: ColumnaCompleto[];
  departamentoId: FiltroDepartamento;
  programaId: number | null;
  errores: ErroresListado;
};

type Reconocimiento = { inicio: Date; fin: Date; nivel?: string };

function distincionActual<T extends Reconocimiento>(filas: T[], hoy: Date) {
  return filas
    .filter((fila) => distincionVigente(fila.inicio, fila.fin, hoy))
    .sort((a, b) => b.fin.getTime() - a.fin.getTime())[0] ?? null;
}

function textoDistincion(actual: Reconocimiento | null, etiqueta: string, ausente: string, hoy: Date) {
  if (!actual) return { texto: ausente, fin: ausente, semaforo: ausente, orden: 0 };
  return {
    texto: etiqueta,
    fin: formatoFecha(actual.fin),
    semaforo: ETIQUETA_SEMAFORO[calcularSemaforo(actual.fin, hoy)],
    orden: actual.fin.getTime(),
  };
}

export function filaCompleto(datos: {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  correo?: string | null;
  cvu?: string | null;
  genero: Genero;
  tipoContratacion: keyof typeof ETIQUETA_CONTRATACION;
  estatusLaboral: keyof typeof ETIQUETA_ESTATUS;
  departamento: { id: number; nombre: string } | null;
  grado: string | null;
  programas: { id: number; nombre: string }[];
  snii: Reconocimiento[];
  prodep: Reconocimiento[];
  cuerpos: { nombre: string; anioVencimiento: number }[];
  participaciones: { programa: "SNII" | "PRODEP"; anio: number; resultado: string | null }[];
  publicaciones: string[];
}, hoy: Date): FilaCompleto {
  const programas = [...datos.programas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const snii = distincionActual(datos.snii, hoy);
  const prodep = distincionActual(datos.prodep, hoy);
  const sniiTexto = textoDistincion(snii, ETIQUETA_NIVEL_SNII[snii?.nivel ?? ""] ?? snii?.nivel ?? SIN_SNII, SIN_SNII, hoy);
  const prodepTexto = textoDistincion(prodep, "Vigente", SIN_PRODEP, hoy);
  const cuerpos = [...datos.cuerpos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.anioVencimiento - b.anioVencimiento);
  const proximo = [...cuerpos].sort((a, b) => a.anioVencimiento - b.anioVencimiento)[0];
  const finCuerpo = proximo ? finDeCuerpo(proximo.anioVencimiento) : null;
  const participaciones = [...datos.participaciones]
    .sort((a, b) => a.anio - b.anio || a.programa.localeCompare(b.programa, "es"))
    .map((fila) => `${fila.programa} ${fila.anio} · ${fila.resultado ? ETIQUETA_RESULTADO[fila.resultado] ?? fila.resultado : "Sin resultado"}`);
  const publicaciones = [...new Set(datos.publicaciones)].sort((a, b) => a.localeCompare(b, "es"));

  return {
    id: `profesor-${String(datos.id).padStart(8, "0")}`,
    departamentoId: datos.departamento?.id ?? null,
    programaIds: programas.map((programa) => programa.id),
    sniiFinOrden: sniiTexto.orden,
    prodepFinOrden: prodepTexto.orden,
    caFinOrden: finCuerpo?.getTime() ?? 0,
    codigo: datos.codigo,
    nombre: `${datos.nombres} ${datos.apellidos}`,
    correo: textoCorreo(datos.correo, SIN_CORREO),
    cvu: textoCvu(datos.cvu, SIN_CVU),
    genero: ETIQUETA_GENERO[datos.genero],
    departamento: datos.departamento?.nombre ?? SIN_DEPARTAMENTO,
    programas: programas.map((programa) => programa.nombre).join(", ") || SIN_PROGRAMA,
    grado: datos.grado ?? SIN_GRADO,
    contratacion: ETIQUETA_CONTRATACION[datos.tipoContratacion],
    estatus: ETIQUETA_ESTATUS[datos.estatusLaboral],
    snii: sniiTexto.texto,
    sniiFin: sniiTexto.fin,
    sniiSemaforo: sniiTexto.semaforo,
    prodep: prodepTexto.texto,
    prodepFin: prodepTexto.fin,
    prodepSemaforo: prodepTexto.semaforo,
    cuerpos: cuerpos.map((cuerpo) => cuerpo.nombre).join(", ") || SIN_CUERPO,
    caFin: finCuerpo ? formatoFecha(finCuerpo) : SIN_CUERPO,
    caSemaforo: finCuerpo ? ETIQUETA_SEMAFORO[calcularSemaforo(finCuerpo, hoy)] : SIN_CUERPO,
    convocatoria: participaciones.join("; ") || SIN_CONVOCATORIA,
    publicaciones: publicaciones.join("; ") || SIN_PUBLICACIONES,
  };
}

function esArmado(crudo: string | string[] | undefined) {
  return crudo === "1" || (Array.isArray(crudo) && crudo.includes("1"));
}

function leerColumnas(crudo: string | string[] | undefined, vacioForzado: boolean) {
  if (vacioForzado) return { valores: [] as ColumnaCompleto[], error: "Elige al menos una columna." };
  if (crudo === undefined) return { valores: columnasSinDatosPersonales(COLUMNAS_COMPLETO) };
  const partes = (Array.isArray(crudo) ? crudo : [crudo]).flatMap((parte) => parte.split(",")).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length === 0) return { valores: [] as ColumnaCompleto[], error: "Elige al menos una columna." };
  const valores = COLUMNAS_COMPLETO.filter((columna) => partes.includes(columna));
  if (partes.some((parte) => !(COLUMNAS_COMPLETO as readonly string[]).includes(parte))) {
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

export function analizarCompleto(
  parametros: ParametrosListado,
  catalogo: { departamentos: readonly number[]; programas: readonly number[] },
): EstadoCompleto {
  const { consulta, errores } = analizarListado(LISTADO_COMPLETO, parametros);
  const columnas = leerColumnas(parametros.columnas, esArmado(parametros.armado) && parametros.columnas === undefined);
  const departamento = leerDepartamento(parametros.departamento, catalogo.departamentos);
  const programa = leerId(parametros.programa, catalogo.programas, {
    repetido: "Elige un solo programa educativo.",
    inexistente: "Elige un programa educativo que exista.",
  });
  if (columnas.error) errores.columnas = columnas.error;
  if (departamento.error) errores.departamento = departamento.error;
  if (programa.error) errores.programa = programa.error;
  return { consulta, columnas: columnas.valores, departamentoId: departamento.id, programaId: programa.id, errores };
}

export function textoCompleto(fila: FilaCompleto, columna: ColumnaCompleto) {
  return fila[columna];
}

function valorOrden(fila: FilaCompleto, columna: ColumnaCompleto) {
  if (columna === "sniiFin") return fila.sniiFinOrden;
  if (columna === "prodepFin") return fila.prodepFinOrden;
  if (columna === "caFin") return fila.caFinOrden;
  return fila[columna];
}

export function consultarCompleto(filas: FilaCompleto[], estado: EstadoCompleto, completo = false) {
  if (estado.columnas.length === 0) return { filas: [] as FilaCompleto[], paginacion: paginar(0, estado.consulta) };
  const texto = estado.consulta.q.trim().toLocaleLowerCase("es-MX");
  const coinciden = filas.filter((fila) => {
    if (!coincideDepartamento(fila.departamentoId, estado.departamentoId)) return false;
    if (estado.programaId !== null && !fila.programaIds.includes(estado.programaId)) return false;
    if (!texto) return true;
    return estado.columnas.some((columna) => fila[columna].toLocaleLowerCase("es-MX").includes(texto));
  });
  const orden = (estado.columnas as readonly string[]).includes(estado.consulta.orden) ? estado.consulta.orden as ColumnaCompleto : estado.columnas[0];
  coinciden.sort((a, b) => {
    const va = valorOrden(a, orden);
    const vb = valorOrden(b, orden);
    const resultado = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
    const desempatado = resultado === 0 ? a.id.localeCompare(b.id, "es") : resultado;
    return estado.consulta.dir === "asc" ? desempatado : -desempatado;
  });
  const paginacion = paginar(coinciden.length, estado.consulta);
  return {
    filas: completo ? coinciden : coinciden.slice(paginacion.salto, paginacion.salto + paginacion.tamanio),
    paginacion,
  };
}

export function enlaceCompleto(base: string, estado: EstadoCompleto, cambios: { pagina?: number; orden?: string; dir?: Sentido } = {}) {
  const orden = cambios.orden ?? estado.consulta.orden;
  const dir = cambios.dir ?? estado.consulta.dir;
  const cambiaOrden = cambios.orden !== undefined || cambios.dir !== undefined;
  const pagina = cambios.pagina ?? (cambiaOrden ? 1 : estado.consulta.pagina);
  const parametros = new URLSearchParams();
  if (estado.columnas.length === 0) parametros.set("armado", "1");
  else if (!mismaSeleccion(estado.columnas, columnasSinDatosPersonales(COLUMNAS_COMPLETO))) parametros.set("columnas", estado.columnas.join(","));
  if (estado.departamentoId !== null) parametros.set("departamento", String(estado.departamentoId));
  if (estado.programaId !== null) parametros.set("programa", String(estado.programaId));
  if (estado.consulta.q) parametros.set("q", estado.consulta.q);
  if (orden !== LISTADO_COMPLETO.ordenInicial.columna || dir !== LISTADO_COMPLETO.ordenInicial.dir) {
    parametros.set("orden", orden);
    parametros.set("dir", dir);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}
