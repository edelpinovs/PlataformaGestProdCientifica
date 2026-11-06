import { z } from "zod";
import { analizarListado, condicionTexto, enlaceListado, ordenarPor, paginar, type ConsultaListado, type DefinicionListado, type ErroresListado, type ParametrosListado, type Sentido } from "@/lib/listados/consulta";
import { tipoPublicacionEnum, fuentePublicacionEnum, estadoAutoriaEnum } from "./tipos";
import { normalizarTitulo } from "./normalizacion";

export const ETIQUETAS_TIPO = { ARTICULO: "Artículo", LIBRO: "Libro", CAPITULO: "Capítulo", MEMORIA_CONGRESO: "Memoria de congreso", REGISTRO_SOFTWARE: "Registro de software", PATENTE: "Patente", OTRO: "Otro" };
export const ETIQUETAS_FUENTE = { ORCID: "ORCID", SCOPUS: "Scopus", OPENALEX: "OpenAlex", GOOGLE_SCHOLAR: "Google Scholar", MANUAL: "Captura manual" };
export const ETIQUETAS_ESTADO = { PENDIENTE: "Pendiente", VALIDADA: "Validada", RECHAZADA: "Rechazada" };
export const COLUMNAS_PUBLICACIONES = [
  { clave: "titulo", texto: "Título" }, { clave: "tipo", texto: "Tipo" },
  { clave: "revista", texto: "Revista / editorial" }, { clave: "profesores", texto: "Cantidad de profesores vinculados" },
  { clave: "fuente", texto: "Fuente" },
];
export const LISTADO_PUBLICACIONES: DefinicionListado = {
  columnas: COLUMNAS_PUBLICACIONES.map((columna) => columna.clave),
  ordenInicial: { columna: "titulo", dir: "asc" },
  filtros: { tipo: tipoPublicacionEnum.options, fuente: fuentePublicacionEnum.options, estado: estadoAutoriaEnum.options },
};
export type ConsultaPublicaciones = ConsultaListado;
export type ParametrosConsulta = ParametrosListado;
export type ErroresConsulta = ErroresListado;
export const RUTA_PUBLICACIONES = "/produccion/publicaciones";
export const CONSULTA_INICIAL: ConsultaPublicaciones = {
  pagina: 1, q: "", orden: "titulo", dir: "asc", filtros: { profesor: "", anio: "", tipo: "", fuente: "", estado: "" },
};

const profesorEsquema = z.string({ error: "Selecciona un solo profesor." }).refine(
  (valor) => valor === "" || (/^[1-9]\d*$/.test(valor) && Number(valor) <= 2147483647), "Selecciona un profesor válido.",
);
const anioEsquema = z.string({ error: "Indica un solo año." }).refine(
  (valor) => valor === "" || (/^\d{4}$/.test(valor) && Number(valor) >= 1900 && Number(valor) <= 2100), "Indica un año entre 1900 y 2100.",
);

export function analizarConsulta(parametros: ParametrosConsulta) {
  // Los enlaces del #98 con `texto` siguen funcionando; las consultas nuevas usan q.
  const { consulta, errores } = analizarListado(LISTADO_PUBLICACIONES, { ...parametros, q: parametros.q ?? parametros.texto });
  for (const [clave, esquema] of [["profesor", profesorEsquema], ["anio", anioEsquema]] as const) {
    const resultado = esquema.safeParse(parametros[clave] ?? "");
    consulta.filtros[clave] = resultado.success ? resultado.data : "";
    if (!resultado.success) errores[clave] = resultado.error.issues[0].message;
  }
  // Solo se reconocen los tamaños de enlaces antiguos: la lectura siempre es de 10.
  if (parametros.tamanio !== undefined && !z.enum(["10", "20", "50", "100"]).safeParse(parametros.tamanio).success) {
    errores.tamanio = "El listado muestra 10 elementos por página.";
  }
  if (Object.keys(errores).length) return {
    success: false as const, data: consulta,
    error: { issues: Object.entries(errores).map(([campo, message]) => ({ path: [campo], message })) },
  };
  return { success: true as const, data: consulta };
}

export function filtroPublicaciones(consulta: ConsultaPublicaciones) {
  const tipo = tipoPublicacionEnum.options.find((valor) => valor === consulta.filtros.tipo);
  const fuente = fuentePublicacionEnum.options.find((valor) => valor === consulta.filtros.fuente);
  const estado = estadoAutoriaEnum.options.find((valor) => valor === consulta.filtros.estado);
  const normalizado = normalizarTitulo(consulta.q);
  const tipos = tipoPublicacionEnum.options.filter((valor) => normalizado && normalizarTitulo(ETIQUETAS_TIPO[valor]).includes(normalizado));
  const fuentes = fuentePublicacionEnum.options.filter((valor) => normalizado && normalizarTitulo(ETIQUETAS_FUENTE[valor]).includes(normalizado));
  const estados = estadoAutoriaEnum.options.filter((valor) => normalizado && normalizarTitulo(ETIQUETAS_ESTADO[valor]).includes(normalizado));
  return {
    ...condicionTexto(consulta.q, (contiene) => [
      { titulo: contiene }, { autoresTexto: contiene }, { doi: contiene }, { revistaEditorial: contiene },
      { tipo: { in: tipos } }, { fuente: { in: fuentes } },
      { autorias: { some: { OR: [
        { profesor: { nombres: contiene } }, { profesor: { apellidos: contiene } },
        { profesor: { codigo: contiene } }, { estado: { in: estados } },
      ] } } },
    ]),
    ...(tipo ? { tipo } : {}), ...(fuente ? { fuente } : {}),
    ...(consulta.filtros.anio ? { fechaPublicacion: {
      gte: new Date(Date.UTC(Number(consulta.filtros.anio), 0, 1)),
      lt: new Date(Date.UTC(Number(consulta.filtros.anio) + 1, 0, 1)),
    } } : {}),
    ...(consulta.filtros.profesor || estado ? { autorias: { some: {
      ...(consulta.filtros.profesor ? { profesorId: Number(consulta.filtros.profesor) } : {}), ...(estado ? { estado } : {}),
    } } } : {}),
  };
}

export function ordenPublicaciones(consulta: ConsultaPublicaciones) {
  return ordenarPor(consulta, {
    titulo: (dir) => ({ titulo: dir }), tipo: (dir) => ({ tipo: dir }),
    revista: (dir) => ({ revistaEditorial: dir }), profesores: (dir) => ({ autorias: { _count: dir } }),
    fuente: (dir) => ({ fuente: dir }),
  });
}

/** Los enums de PostgreSQL no siguen el alfabeto de sus etiquetas. Se seleccionan
 * solo los tramos que caben en la página; no se cargan todas las obras en memoria.
 */
export function tramosPorEtiqueta(grupos: { valor: string; total: number }[], etiquetas: Record<string, string>, dir: Sentido, salto: number, limite: number) {
  const ordenados = [...grupos].sort((a, b) => (etiquetas[a.valor] ?? a.valor).localeCompare(etiquetas[b.valor] ?? b.valor, "es") * (dir === "asc" ? 1 : -1));
  const tramos: { valor: string; salto: number; cantidad: number }[] = [];
  for (const grupo of ordenados) {
    if (salto >= grupo.total) { salto -= grupo.total; continue; }
    const cantidad = Math.min(limite, grupo.total - salto);
    if (cantidad > 0) tramos.push({ valor: grupo.valor, salto, cantidad });
    limite -= cantidad;
    salto = 0;
    if (!limite) break;
  }
  return tramos;
}

export const paginarPublicaciones = (total: number, consulta: ConsultaPublicaciones) => paginar(total, consulta);
export const enlaceConsulta = (consulta: ConsultaPublicaciones, pagina: number) => `${enlaceListado(RUTA_PUBLICACIONES, LISTADO_PUBLICACIONES, consulta, { pagina })}#publicaciones`;

export function redireccionConsultaAnterior(parametros: ParametrosConsulta): string | null {
  const claves = ["q", "texto", "pagina", "orden", "dir", "profesor", "anio", "tipo", "fuente", "estado", "tamanio"];
  if (!claves.some((clave) => parametros[clave] !== undefined)) return null;
  const busqueda = new URLSearchParams();
  for (const clave of claves) {
    const valor = parametros[clave];
    if (Array.isArray(valor)) valor.forEach((elemento) => busqueda.append(clave, elemento));
    else if (valor !== undefined) busqueda.set(clave, valor);
  }
  return `${RUTA_PUBLICACIONES}?${busqueda}#publicaciones`;
}

export function paginasVisibles(pagina: number, totalPaginas: number): (number | "separador")[] {
  if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  const elegidas = new Set([1, totalPaginas]);
  for (let numero = Math.max(1, pagina - 2); numero <= Math.min(totalPaginas, pagina + 2); numero++) elegidas.add(numero);
  const ordenadas = [...elegidas].sort((a, b) => a - b);
  const resultado: (number | "separador")[] = [];
  ordenadas.forEach((numero, indice) => {
    if (indice && numero - ordenadas[indice - 1] > 1) resultado.push("separador");
    resultado.push(numero);
  });
  return resultado;
}
