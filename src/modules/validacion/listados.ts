import type { Prisma } from "@/generated/prisma/client";
import { analizarListado, condicionTexto, enlaceListado, type ConsultaListado, type DefinicionListado, type ParametrosListado } from "@/lib/listados/consulta";
import { ESTADOS_AUTORIA, ETIQUETA_ESTADO_AUTORIA, ETIQUETA_FUENTE, FUENTES_PUBLICACION } from "./bandeja";
import { ETIQUETAS_TIPO, TIPOS_PUBLICACION, type TipoPublicacion } from "./manual";

export const VISTAS = ["bandeja", "manuales", "profesores", "departamentos"] as const;
export type Vista = typeof VISTAS[number];
export const COLUMNAS = {
  bandeja: [{ clave: "fuente", texto: "Fuente" }, { clave: "tipo", texto: "Tipo" }, { clave: "titulo", texto: "Publicación" }, { clave: "profesor", texto: "Profesor" }, { clave: "estado", texto: "Estado" }],
  manuales: [{ clave: "tipo", texto: "Tipo" }, { clave: "titulo", texto: "Publicación" }, { clave: "revista", texto: "Revista / Editorial" }, { clave: "profesor", texto: "Profesor" }, { clave: "doi", texto: "DOI" }, { clave: "isbn", texto: "ISBN / ISSN" }],
  profesores: [{ clave: "nombre", texto: "Profesor" }, { clave: "codigo", texto: "Código" }, { clave: "departamento", texto: "Departamento" }, { clave: "validadas", texto: "Validadas" }],
  departamentos: [{ clave: "nombre", texto: "Departamento" }, { clave: "nomenclatura", texto: "Nomenclatura" }, { clave: "validadas", texto: "Validadas" }],
};

export function definicionVista(vista: Vista, departamentos: string[] = []): DefinicionListado {
  return {
    columnas: COLUMNAS[vista].map(c => c.clave),
    ordenInicial: { columna: vista === "bandeja" || vista === "manuales" ? "titulo" : "validadas", dir: vista === "bandeja" || vista === "manuales" ? "asc" : "desc" },
    filtros: { vista: VISTAS, ...(vista === "bandeja" ? { fuente: FUENTES_PUBLICACION, tipo: TIPOS_PUBLICACION, estado: ["TODOS", ...ESTADOS_AUTORIA] } : vista === "manuales" ? { tipo: TIPOS_PUBLICACION } : vista === "profesores" ? { departamento: departamentos } : {}) },
  };
}

export function consultarVista(parametros: ParametrosListado, departamentos: string[] = []) {
  const inicial = analizarListado({ columnas: ["titulo"], ordenInicial: { columna: "titulo", dir: "asc" }, filtros: { vista: VISTAS } }, { vista: parametros.vista });
  const vista = (inicial.consulta.filtros.vista || "bandeja") as Vista;
  const definicion = definicionVista(vista, departamentos);
  const resultado = analizarListado(definicion, parametros);
  resultado.consulta.filtros.vista = vista;
  // La bandeja abre en pendientes; el valor vacío explícito permite consultar el historial.
  if (vista === "bandeja" && parametros.estado === undefined) resultado.consulta.filtros.estado = "PENDIENTE";
  if (vista === "bandeja" && parametros.estado === "") resultado.consulta.filtros.estado = "TODOS";
  return { vista, definicion, ...resultado };
}

export function filtroPublicaciones(consulta: ConsultaListado): Prisma.PublicacionWhereInput {
  const texto = consulta.q.toLocaleLowerCase("es");
  const tipos = TIPOS_PUBLICACION.filter(t => ETIQUETAS_TIPO[t].toLocaleLowerCase("es").includes(texto));
  const fuentes = FUENTES_PUBLICACION.filter(f => ETIQUETA_FUENTE[f].toLocaleLowerCase("es").includes(texto));
  const anio = /^\d{4}$/.test(consulta.q) ? Number(consulta.q) : 0;
  return {
    ...(consulta.filtros.tipo ? { tipo: consulta.filtros.tipo as TipoPublicacion } : {}),
    ...(consulta.filtros.fuente ? { fuente: consulta.filtros.fuente as typeof FUENTES_PUBLICACION[number] } : {}),
    ...condicionTexto<Prisma.PublicacionWhereInput>(consulta.q, contiene => [
      { titulo: contiene }, { autoresTexto: contiene }, { doi: contiene }, { isbnIssn: contiene }, { revistaEditorial: contiene },
      { autorias: { some: { profesor: { OR: [{ nombres: contiene }, { apellidos: contiene }, { codigo: contiene }] } } } },
      { tipo: { in: tipos } }, { fuente: { in: fuentes } },
      ...(anio >= 1000 && anio <= 9998 ? [{ fechaPublicacion: { gte: new Date(`${anio}-01-01T00:00:00Z`), lt: new Date(`${anio + 1}-01-01T00:00:00Z`) } }] : []),
    ]),
  };
}

export function filtroAutorias(consulta: ConsultaListado, profesorId?: number): Prisma.AutoriaWhereInput {
  const estado = consulta.filtros.estado;
  const filtro = filtroPublicaciones(consulta);
  const publicacionSinCoautores = { ...filtro, OR: filtro.OR?.filter(c => !c.autorias) };
  // La búsqueda de profesor corresponde a la autoría mostrada, no a otro coautor.
  const busqueda = condicionTexto<Prisma.AutoriaWhereInput>(consulta.q, contiene => [
    { profesor: { OR: [{ nombres: contiene }, { apellidos: contiene }, { codigo: contiene }] } },
    { publicacion: { OR: publicacionSinCoautores.OR } },
    ...(ESTADOS_AUTORIA.filter(e => ETIQUETA_ESTADO_AUTORIA[e].toLocaleLowerCase("es").includes(consulta.q.toLocaleLowerCase("es"))).map(e => ({ estado: e }))),
  ]);
  return {
    ...(profesorId !== undefined ? { profesorId } : {}),
    ...(estado && estado !== "TODOS" ? { estado: estado as typeof ESTADOS_AUTORIA[number] } : {}),
    publicacion: { tipo: filtro.tipo, fuente: filtro.fuente },
    ...busqueda,
  };
}

export function ordenAutorias(consulta: ConsultaListado): Prisma.AutoriaOrderByWithRelationInput[] {
  const dir = consulta.dir;
  const mapa: Record<string, Prisma.AutoriaOrderByWithRelationInput> = {
    fuente: { publicacion: { fuente: dir } }, tipo: { publicacion: { tipo: dir } }, titulo: { publicacion: { titulo: dir } },
    profesor: { profesor: { apellidos: dir } }, estado: { estado: dir }, revista: { publicacion: { revistaEditorial: dir } }, doi: { publicacion: { doi: dir } }, isbn: { publicacion: { isbnIssn: dir } },
  };
  // Autoria tiene clave compuesta, no id: ambos campos son el desempate único.
  return [mapa[consulta.orden] ?? mapa.titulo, ...(consulta.orden === "profesor" ? [{ profesor: { nombres: dir } }] : []), { publicacionId: dir }, { profesorId: dir }];
}

/** Solo acepta el estado conocido del módulo; nunca una URL externa enviada por el cliente. */
export function retornoValidacion(valor: unknown, aviso: string) {
  if (typeof valor !== "string" || !valor) return `/validacion?${aviso}`;
  const parametros = Object.fromEntries(new URLSearchParams(valor));
  const { definicion, consulta } = consultarVista(parametros);
  const enlace = enlaceListado("/validacion", definicion, consulta);
  return `${enlace}${enlace.includes("?") ? "&" : "?"}${aviso}`;
}

export type FilaResumen = { id: number; nombre: string; codigo?: string; departamento?: string; nomenclatura?: string; validadas: number };

/** Los enums de PostgreSQL tienen orden de declaración; la interfaz ordena sus etiquetas. */
export function gruposEnumerados(consulta: ConsultaListado) {
  const etiquetas: Record<string, Record<string, string>> = { fuente: ETIQUETA_FUENTE, tipo: ETIQUETAS_TIPO, estado: ETIQUETA_ESTADO_AUTORIA };
  const mapa = etiquetas[consulta.orden];
  if (!mapa) return [];
  return Object.keys(mapa).sort((a,b) => mapa[a].localeCompare(mapa[b], "es") * (consulta.dir === "asc" ? 1 : -1));
}

export function distribuirPagina(grupos: { valor: string; total: number }[], salto: number, tamanio: number) {
  const partes: { valor: string; salto: number; tamanio: number }[] = [];
  let restantes = tamanio;
  for (const grupo of grupos) {
    if (restantes <= 0) break;
    if (salto >= grupo.total) { salto -= grupo.total; continue; }
    const tomar = Math.min(restantes, grupo.total - salto);
    partes.push({ valor: grupo.valor, salto, tamanio: tomar });
    restantes -= tomar;
    salto = 0;
  }
  return partes;
}
