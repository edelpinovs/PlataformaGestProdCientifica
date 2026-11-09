import type { Programa } from "./carga";

// RF-017 (CU-010): convierte la tabla de un listado oficial (Excel, o PDF ya agrupado en filas)
// en un renglón por persona con lo que el archivo trae: CVU, Código, Nombre, Nivel Otorgado y
// Vigencia. Los encabezados se reconocen por nombre, no por posición, porque el formato cambia
// de un año a otro (plan §7). Nada se inventa: el listado del SNII no trae Código ni Vigencia y
// esos campos quedan vacíos. Cruzar con el directorio es RF-018; las reglas de vigencia, M3.

export type Nivel = "CANDIDATO" | "NIVEL_1" | "NIVEL_2" | "NIVEL_3" | "EMERITO";

export type RenglonLeido = {
  numero: number;
  cvu: string | null;
  codigo: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombres: string;
  nivelTexto: string | null;
  nivel: Nivel | null;
  vigenciaInicio: Date | null;
  vigenciaFin: Date | null;
};

export type AvisoLectura = { renglon: number; mensaje: string };

export type ResumenLectura = {
  renglones: number;
  conCvu: number;
  conVigencia: number;
  porNivel: Record<string, number>;
  avisos: AvisoLectura[];
  totalAvisos: number;
};

export type ResultadoLectura =
  | { ok: true; renglones: RenglonLeido[]; resumen: ResumenLectura }
  | { ok: false; error: string };

export const MAXIMO_AVISOS = 50;

const SIN_COLUMNAS_SNII = "No se encontraron las columnas de nombre y nivel otorgado en el archivo.";
const SIN_COLUMNAS_PRODEP = "No se encontró la columna de nombre en el archivo.";
const SIN_RENGLONES = "El archivo no tiene ningún renglón con nombre.";
const SIN_NIVEL = "Sin nivel";

type Columna = "cvu" | "codigo" | "paterno" | "materno" | "nombres" | "nombreCompleto" | "nivel" | "vigencia" | "inicio" | "fin";

const ENCABEZADOS: Record<Columna, string[]> = {
  cvu: ["CVU", "NO CVU", "NUM CVU", "NUMERO CVU", "CVU CONAHCYT", "CVU SECIHTI"],
  codigo: ["CODIGO", "CODIGO UDG", "CODIGO CUVALLES"],
  paterno: ["APELLIDO PATERNO", "PRIMER APELLIDO"],
  materno: ["APELLIDO MATERNO", "SEGUNDO APELLIDO"],
  nombres: ["NOMBRES"],
  nombreCompleto: ["NOMBRE", "NOMBRE COMPLETO", "NOMBRE DEL PROFESOR", "NOMBRE DEL DOCENTE"],
  nivel: ["NIVEL OTORGADO", "NIVEL", "DISTINCION", "NIVEL RECOMENDADO"],
  vigencia: ["VIGENCIA"],
  inicio: ["INICIO", "FECHA DE INICIO", "VIGENCIA INICIO", "INICIO DE VIGENCIA"],
  fin: ["FIN", "FECHA DE FIN", "VIGENCIA FIN", "FIN DE VIGENCIA", "FECHA DE TERMINO"],
};

// Forma de comparación de un encabezado: sin acentos, en mayúsculas, sin puntos ni paréntesis
// («Nombre(s)» → «NOMBRES», «No. CVU» → «NO CVU»).
export function claveEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[()]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function mapearColumnas(celdas: string[]): Partial<Record<Columna, number>> {
  const columnas: Partial<Record<Columna, number>> = {};
  celdas.forEach((celda, indice) => {
    const clave = claveEncabezado(celda);
    for (const [columna, nombres] of Object.entries(ENCABEZADOS) as [Columna, string[]][]) {
      if (columnas[columna] === undefined && nombres.includes(clave)) columnas[columna] = indice;
    }
  });
  return columnas;
}

function tieneNombre(columnas: Partial<Record<Columna, number>>): boolean {
  return columnas.nombres !== undefined || columnas.nombreCompleto !== undefined;
}

// Una fila es de encabezados si nombra la columna del nombre y al menos otra columna conocida.
export function esFilaEncabezado(celdas: string[]): boolean {
  const columnas = mapearColumnas(celdas);
  return tieneNombre(columnas) && Object.keys(columnas).length >= 2;
}

export function traducirNivel(texto: string): Nivel | null {
  const clave = claveEncabezado(texto);
  if (!clave) return null;
  if (/EMERIT/.test(clave)) return "EMERITO";
  if (clave === "C" || /\bCANDIDAT/.test(clave)) return "CANDIDATO";
  const nivel = /^(?:.*\bNIVEL )?(III|II|I|3|2|1)$/.exec(clave)?.[1];
  if (nivel === "I" || nivel === "1") return "NIVEL_1";
  if (nivel === "II" || nivel === "2") return "NIVEL_2";
  if (nivel === "III" || nivel === "3") return "NIVEL_3";
  return null;
}

// null si viene vacío; "invalido" si trae algo que no es un CVU (solo dígitos, 1 a 8).
export function limpiarCvu(texto: string): string | null | "invalido" {
  const limpio = texto.trim();
  if (!limpio) return null;
  return /^\d{1,8}$/.test(limpio) ? limpio : "invalido";
}

// «aaaa-mm-dd» o «dd/mm/aaaa» → fecha UTC a medianoche; null si no es una fecha real («31/02/2025»).
function leerFecha(texto: string): Date | null {
  const limpio = texto.trim();
  const dma = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpio);
  const amd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio);
  const partes = dma ? [dma[3], dma[2], dma[1]] : amd ? [amd[1], amd[2], amd[3]] : null;
  if (!partes) return null;
  const [anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
    ? fecha
    : null;
}

// Lee «16/12/2024 a 15/12/2027», «2024-12-16 al 2027-12-15» o dos fechas por separado.
export function leerVigencia(texto: string | { inicio: string; fin: string }): { inicio: Date; fin: Date } | null {
  let inicio: Date | null;
  let fin: Date | null;
  if (typeof texto === "string") {
    const fechas = texto.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g);
    if (!fechas || fechas.length !== 2) return null;
    [inicio, fin] = fechas.map(leerFecha);
  } else {
    inicio = leerFecha(texto.inicio);
    fin = leerFecha(texto.fin);
  }
  if (!inicio || !fin || fin.getTime() <= inicio.getTime()) return null;
  return { inicio, fin };
}

const espacios = (texto: string) => texto.replace(/\s+/g, " ").trim();
const esPie = (fila: string[]) => /^p[aá]gina \d+ de \d+$/i.test(espacios(fila.join(" ")));

export function interpretarListado(filas: string[][], programa: Programa): ResultadoLectura {
  const sinColumnas = programa === "SNII" ? SIN_COLUMNAS_SNII : SIN_COLUMNAS_PRODEP;
  const inicioTabla = filas.findIndex(esFilaEncabezado);
  if (inicioTabla < 0) return { ok: false, error: sinColumnas };
  const columnas = mapearColumnas(filas[inicioTabla]);
  if (programa === "SNII" && columnas.nivel === undefined) return { ok: false, error: sinColumnas };

  // En los PDF, la dirección y otras líneas sueltas caen en alguna columna: si el listado tiene
  // columnas que identifican a la persona (CVU, código o nivel), un renglón que no trae ninguna
  // de ellas no es una persona. La vigencia no cuenta: una persona puede venir sin ella.
  const columnasDePersona = [columnas.cvu, columnas.codigo, columnas.nivel].filter((c) => c !== undefined);

  const renglones: RenglonLeido[] = [];
  const avisos: AvisoLectura[] = [];
  const primeraFilaDeCvu = new Map<string, number>();

  filas.forEach((fila, indice) => {
    if (indice <= inicioTabla || esFilaEncabezado(fila) || esPie(fila)) return;
    const celda = (columna: Columna) => {
      const posicion = columnas[columna];
      return posicion === undefined ? "" : espacios(fila[posicion] ?? "");
    };
    if (columnasDePersona.length && columnasDePersona.every((c) => !espacios(fila[c] ?? ""))) return;

    const paterno = celda("paterno");
    const materno = celda("materno");
    const nombres = celda("nombres") || celda("nombreCompleto");
    if (!paterno && !materno && !nombres) return;

    const numero = indice + 1;
    const avisar = (mensaje: string) => avisos.push({ renglon: numero, mensaje: `Renglón ${numero}: ${mensaje}` });

    let cvu = limpiarCvu(celda("cvu"));
    if (cvu === "invalido") {
      avisar(`el CVU «${celda("cvu")}» no es válido; se guardó sin CVU.`);
      cvu = null;
    } else if (cvu) {
      const anterior = primeraFilaDeCvu.get(cvu);
      if (anterior) avisar(`el CVU ${cvu} ya aparece en el renglón ${anterior}.`);
      else primeraFilaDeCvu.set(cvu, numero);
    }

    const nivelTexto = celda("nivel") || null;
    const nivel = programa === "SNII" && nivelTexto ? traducirNivel(nivelTexto) : null;
    if (programa === "SNII" && !nivel) avisar(`no se reconoce el nivel «${nivelTexto ?? ""}».`);

    // Solo se guarda la vigencia que trae el archivo; si no la trae, queda vacía.
    let vigencia: { inicio: Date; fin: Date } | null = null;
    const textoVigencia = celda("vigencia");
    const [inicio, fin] = [celda("inicio"), celda("fin")];
    if (textoVigencia || inicio || fin) {
      vigencia = textoVigencia ? leerVigencia(textoVigencia) : leerVigencia({ inicio, fin });
      if (!vigencia) {
        avisar(`la vigencia «${textoVigencia || `${inicio} a ${fin}`}» no es válida; se guardó sin vigencia.`);
      }
    }

    renglones.push({
      numero,
      cvu,
      codigo: celda("codigo") || null,
      apellidoPaterno: paterno || null,
      apellidoMaterno: materno || null,
      nombres,
      nivelTexto,
      nivel,
      vigenciaInicio: vigencia?.inicio ?? null,
      vigenciaFin: vigencia?.fin ?? null,
    });
  });

  if (renglones.length === 0) return { ok: false, error: SIN_RENGLONES };

  const porNivel: Record<string, number> = {};
  for (const renglon of renglones) {
    const clave = renglon.nivel ?? renglon.nivelTexto ?? SIN_NIVEL;
    porNivel[clave] = (porNivel[clave] ?? 0) + 1;
  }

  return {
    ok: true,
    renglones,
    resumen: {
      renglones: renglones.length,
      conCvu: renglones.filter((r) => r.cvu).length,
      conVigencia: renglones.filter((r) => r.vigenciaInicio).length,
      porNivel,
      avisos: avisos.slice(0, MAXIMO_AVISOS),
      totalAvisos: avisos.length,
    },
  };
}
