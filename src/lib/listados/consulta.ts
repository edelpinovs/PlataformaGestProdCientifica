import { z } from "zod";

// Reglas puras de los listados (regla D-009 de AGENTS.md y pauta visual):
// paginado de 10, búsqueda de texto libre, orden por columna y filtros de valores finitos.
// El estado vive en la URL: `pagina`, `q`, `orden`, `dir` y un parámetro por filtro.
// No usa Prisma: cada página arma su `where` y su `orderBy` con estas piezas.

export const TAMANIO_PAGINA = 10;
const PARAMETROS_RESERVADOS = ["pagina", "q", "orden", "dir"];

export type Sentido = "asc" | "desc";

export type DefinicionListado = {
  /** Claves de las columnas que se pueden ordenar. Solo estas se aceptan en `orden`. */
  columnas: readonly string[];
  /** Orden cuando la URL no trae `orden` ni `dir`. */
  ordenInicial: { columna: string; dir: Sentido };
  /** Filtros de valores finitos: nombre del parámetro → valores permitidos. */
  filtros?: Record<string, readonly string[]>;
};

export type ConsultaListado = {
  pagina: number;
  q: string;
  orden: string;
  dir: Sentido;
  filtros: Record<string, string>;
};

/** Mensajes en español por parámetro; un parámetro inválido se ignora y se avisa. */
export type ErroresListado = Record<string, string>;

export type ParametrosListado = Record<string, string | string[] | undefined>;

function validarDefinicion(definicion: DefinicionListado) {
  if (!definicion.columnas.includes(definicion.ordenInicial.columna)) {
    throw new Error(`La columna inicial «${definicion.ordenInicial.columna}» no está en las columnas del listado.`);
  }
  for (const clave of Object.keys(definicion.filtros ?? {})) {
    if (PARAMETROS_RESERVADOS.includes(clave)) throw new Error(`El filtro «${clave}» usa un nombre reservado.`);
  }
}

/**
 * Lee los parámetros de la URL. Un valor inválido (o repetido) no rompe la página:
 * se usa el valor por defecto y el mensaje queda en `errores` para mostrarlo con `<Aviso>`.
 */
export function analizarListado(definicion: DefinicionListado, parametros: ParametrosListado) {
  validarDefinicion(definicion);
  const errores: ErroresListado = {};

  function leer<T>(clave: string, esquema: z.ZodType<T>, porDefecto: T): T {
    const crudo = parametros[clave];
    if (crudo === undefined) return porDefecto;
    const resultado = esquema.safeParse(crudo);
    if (resultado.success) return resultado.data;
    errores[clave] = resultado.error.issues[0]?.message ?? "El valor no es válido.";
    return porDefecto;
  }

  const q = leer(
    "q",
    z.string({ error: "Escribe un solo texto de búsqueda." }).trim().max(200, "La búsqueda admite hasta 200 caracteres."),
    "",
  );
  const pagina = leer(
    "pagina",
    z.string({ error: "Indica una sola página." })
      .regex(/^[1-9]\d{0,5}$/, "La página debe ser un número entero entre 1 y 999999.")
      .transform(Number),
    1,
  );
  const orden = leer(
    "orden",
    z.string({ error: "Ordena por una sola columna." }).refine(
      (valor) => definicion.columnas.includes(valor), "Ordena por una columna válida.",
    ),
    definicion.ordenInicial.columna,
  );
  const dir = leer(
    "dir",
    z.enum(["asc", "desc"], { error: "El sentido del orden debe ser ascendente o descendente." }),
    definicion.ordenInicial.dir,
  );

  const filtros: Record<string, string> = {};
  for (const [clave, valores] of Object.entries(definicion.filtros ?? {})) {
    filtros[clave] = leer(
      clave,
      z.string({ error: "Selecciona un solo valor en cada filtro." }).refine(
        (valor) => valor === "" || valores.includes(valor), "Uno de los filtros tiene un valor que no existe.",
      ),
      "",
    );
  }

  const consulta: ConsultaListado = { pagina, q, orden, dir, filtros };
  return { consulta, errores };
}

/** Los caracteres comodín de LIKE se buscan literalmente (Prisma no los escapa). */
export function escaparBusqueda(texto: string) {
  return texto.replace(/[\\%_]/g, "\\$&");
}

export type CondicionTexto = { contains: string; mode: "insensitive" };

/**
 * Condición de búsqueda libre. Cada página dice en qué campos busca:
 * `condicionTexto(q, (contiene) => [{ nombre: contiene }, { division: { nombre: contiene } }])`.
 * Sin texto devuelve `{}`, así que se puede esparcir siempre dentro del `where`.
 */
export function condicionTexto<T extends object>(q: string, campos: (contiene: CondicionTexto) => T[]) {
  const texto = q.trim();
  if (!texto) return {} as { OR?: undefined };
  return { OR: campos({ contains: escaparBusqueda(texto), mode: "insensitive" }) };
}

/**
 * `orderBy` de Prisma para la columna elegida, con desempate por `id` para que el orden
 * sea estable entre páginas. `mapa` traduce cada clave de `columnas` a su `orderBy`:
 * `{ nombre: (dir) => ({ nombre: dir }), division: (dir) => ({ division: { nombre: dir } }) }`.
 */
export function ordenarPor<M extends Record<string, (dir: Sentido) => object>>(consulta: ConsultaListado, mapa: M) {
  const construir = mapa[consulta.orden];
  if (!construir) throw new Error(`La columna «${consulta.orden}» no tiene orden definido.`);
  return [construir(consulta.dir), { id: consulta.dir }] as [ReturnType<M[keyof M]>, { id: Sentido }];
}

export type Paginacion = {
  total: number;
  pagina: number;
  tamanio: number;
  totalPaginas: number;
  salto: number;
  desde: number;
  hasta: number;
};

/** Una página fuera de rango muestra la última; sin resultados muestra 0–0. */
export function paginar(total: number, consulta: Pick<ConsultaListado, "pagina">): Paginacion {
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANIO_PAGINA));
  const pagina = Math.min(consulta.pagina, totalPaginas);
  const salto = (pagina - 1) * TAMANIO_PAGINA;
  return {
    total, pagina, tamanio: TAMANIO_PAGINA, totalPaginas, salto,
    desde: total ? salto + 1 : 0,
    hasta: Math.min(salto + TAMANIO_PAGINA, total),
  };
}

export type CambiosListado = Partial<Omit<ConsultaListado, "filtros">> & { filtros?: Record<string, string> };

/**
 * Enlace al mismo listado con otros parámetros. Cambiar la búsqueda, el orden o un filtro
 * vuelve a la página 1; cambiar solo `pagina` la conserva. Omite los valores por defecto.
 */
export function enlaceListado(
  base: string,
  definicion: DefinicionListado,
  consulta: ConsultaListado,
  cambios: CambiosListado = {},
) {
  const resultado = {
    ...consulta,
    ...cambios,
    filtros: { ...consulta.filtros, ...cambios.filtros },
  };
  const cambiaAlgoMasQuePagina = Object.keys(cambios).some((clave) => clave !== "pagina");
  const pagina = cambios.pagina ?? (cambiaAlgoMasQuePagina ? 1 : consulta.pagina);

  const parametros = new URLSearchParams();
  if (resultado.q) parametros.set("q", resultado.q);
  if (resultado.orden !== definicion.ordenInicial.columna || resultado.dir !== definicion.ordenInicial.dir) {
    parametros.set("orden", resultado.orden);
    parametros.set("dir", resultado.dir);
  }
  for (const [clave, valor] of Object.entries(resultado.filtros)) {
    if (valor) parametros.set(clave, valor);
  }
  if (pagina > 1) parametros.set("pagina", String(pagina));
  return parametros.size ? `${base}?${parametros}` : base;
}

/** Orden que se aplica al pulsar un encabezado: la misma columna invierte el sentido. */
export function siguienteOrden(consulta: ConsultaListado, columna: string): { orden: string; dir: Sentido } {
  return { orden: columna, dir: consulta.orden === columna && consulta.dir === "asc" ? "desc" : "asc" };
}

/** ¿Hay búsqueda o filtros activos? Sirve para elegir el mensaje de «sin resultados». */
export function hayFiltrosActivos(consulta: ConsultaListado) {
  return Boolean(consulta.q) || Object.values(consulta.filtros).some(Boolean);
}
