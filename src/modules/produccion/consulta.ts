import { z } from "zod";
import { tipoPublicacionEnum, fuentePublicacionEnum, estadoAutoriaEnum } from "./tipos";

export const ETIQUETAS_TIPO = {
  ARTICULO: "Artículo", LIBRO: "Libro", CAPITULO: "Capítulo", MEMORIA_CONGRESO: "Memoria de congreso",
  REGISTRO_SOFTWARE: "Registro de software", PATENTE: "Patente", OTRO: "Otro",
};
export const ETIQUETAS_FUENTE = { ORCID: "ORCID", SCOPUS: "Scopus", OPENALEX: "OpenAlex", GOOGLE_SCHOLAR: "Google Scholar", MANUAL: "Captura manual" };
export const ETIQUETAS_ESTADO = { PENDIENTE: "Pendiente", VALIDADA: "Validada", RECHAZADA: "Rechazada" };

const esquemaConsulta = z.object({
  texto: z.string({ error: "Escribe un solo texto de búsqueda." }).trim().max(200, "La búsqueda admite hasta 200 caracteres.").default(""),
  profesor: z.string({ error: "Selecciona un solo profesor." }).refine(
    (valor) => valor === "" || (/^[1-9]\d*$/.test(valor) && Number(valor) <= 2147483647), "Selecciona un profesor válido.",
  ).default(""),
  anio: z.string({ error: "Indica un solo año." }).refine(
    (valor) => valor === "" || (/^\d{4}$/.test(valor) && Number(valor) >= 1900 && Number(valor) <= 2100), "Indica un año entre 1900 y 2100.",
  ).default(""),
  tipo: z.enum(["", ...tipoPublicacionEnum.options], { error: "Selecciona un tipo de publicación válido." }).default(""),
  fuente: z.enum(["", ...fuentePublicacionEnum.options], { error: "Selecciona una fuente válida." }).default(""),
  estado: z.enum(["", ...estadoAutoriaEnum.options], { error: "Selecciona un estado de autoría válido." }).default(""),
  tamanio: z.enum(["20", "50", "100"], { error: "Selecciona 20, 50 o 100 filas por página." }).default("20"),
  pagina: z.string({ error: "Indica una sola página." }).refine(
    (valor) => /^[1-9]\d*$/.test(valor) && Number(valor) <= 1_000_000, "La página debe ser un entero entre 1 y 1000000.",
  ).default("1"),
});
export type ConsultaPublicaciones = z.infer<typeof esquemaConsulta>;
export type ParametrosConsulta = Record<string, string | string[] | undefined>;
export type ErroresConsulta = Partial<Record<keyof ConsultaPublicaciones, string>>;
export const CONSULTA_INICIAL: ConsultaPublicaciones = { texto: "", profesor: "", anio: "", tipo: "", fuente: "", estado: "", tamanio: "20", pagina: "1" };
export const RUTA_PUBLICACIONES = "/produccion/publicaciones";

export function analizarConsulta(parametros: ParametrosConsulta) {
  return esquemaConsulta.safeParse(parametros);
}

/** Un WHERE de publicación evita multiplicar obras por coautores. Profesor y
 * estado se evalúan juntos sobre una misma autoría (RF-PC-02 y RF-PC-06).
 */
export function filtroPublicaciones(consulta: ConsultaPublicaciones) {
  const texto = consulta.texto.replace(/[\\%_]/g, "\\$&");
  return {
    ...(texto ? { OR: [
      { titulo: { contains: texto, mode: "insensitive" as const } },
      { autoresTexto: { contains: texto, mode: "insensitive" as const } },
      { doi: { contains: texto, mode: "insensitive" as const } },
    ] } : {}),
    ...(consulta.tipo ? { tipo: consulta.tipo } : {}),
    ...(consulta.fuente ? { fuente: consulta.fuente } : {}),
    ...(consulta.anio ? { fechaPublicacion: {
      gte: new Date(Date.UTC(Number(consulta.anio), 0, 1)),
      lt: new Date(Date.UTC(Number(consulta.anio) + 1, 0, 1)),
    } } : {}),
    ...(consulta.profesor || consulta.estado ? { autorias: { some: {
      ...(consulta.profesor ? { profesorId: Number(consulta.profesor) } : {}),
      ...(consulta.estado ? { estado: consulta.estado } : {}),
    } } } : {}),
  };
}

export function paginarPublicaciones(total: number, consulta: ConsultaPublicaciones) {
  const tamanio = Number(consulta.tamanio);
  const totalPaginas = Math.max(1, Math.ceil(total / tamanio));
  const pagina = Math.min(Number(consulta.pagina), totalPaginas);
  const salto = (pagina - 1) * tamanio;
  return { pagina, tamanio, totalPaginas, salto, desde: total ? salto + 1 : 0, hasta: Math.min(salto + tamanio, total) };
}

export function enlaceConsulta(consulta: ConsultaPublicaciones, pagina: number) {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ ...consulta, pagina: String(pagina) })) {
    if (valor && !(clave === "pagina" && valor === "1") && !(clave === "tamanio" && valor === "20")) parametros.set(clave, valor);
  }
  return `${RUTA_PUBLICACIONES}${parametros.size ? `?${parametros}` : ""}#publicaciones`;
}

/** Mantiene los enlaces antiguos de consulta y deja los parámetros repetidos
 * intactos para que la nueva pantalla pueda validarlos y mostrar el error.
 */
export function redireccionConsultaAnterior(parametros: ParametrosConsulta): string | null {
  const claves = Object.keys(CONSULTA_INICIAL);
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
