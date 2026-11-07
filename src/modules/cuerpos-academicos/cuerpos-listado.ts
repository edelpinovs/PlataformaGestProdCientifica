import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { ETIQUETA_NIVEL, NIVELES_CONSOLIDACION } from "./cuerpo";

// Listado de cuerpos académicos: búsqueda, filtros, orden y paginación (D-009, issue #112).

/** Los departamentos existentes son los valores permitidos del filtro. */
export function listadoCuerpos(idsDepartamento: number[]): DefinicionListado {
  return {
    columnas: ["clave", "nombre", "nivel", "departamento", "vigencia", "integrantes", "lider", "lgacs"],
    ordenInicial: { columna: "nombre", dir: "asc" },
    filtros: {
      nivel: NIVELES_CONSOLIDACION,
      departamento: idsDepartamento.map(String),
    },
  };
}

export const COLUMNAS_CUERPOS = [
  { clave: "clave", texto: "Clave" },
  { clave: "nombre", texto: "Nombre" },
  { clave: "nivel", texto: "Nivel" },
  { clave: "departamento", texto: "Departamento" },
  { clave: "vigencia", texto: "Vigencia" },
  { clave: "integrantes", texto: "Integrantes" },
  { clave: "lider", texto: "Líder" },
  { clave: "lgacs", texto: "LGAC" },
];

function sinAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function nivelesPorEtiqueta(palabra: string) {
  const buscado = sinAcentos(palabra);
  return NIVELES_CONSOLIDACION.filter((nivel) => sinAcentos(ETIQUETA_NIVEL[nivel]).includes(buscado));
}

/**
 * La búsqueda libre cubre lo que muestra la fila: clave, nombre, nivel, departamento,
 * vigencia (años), líder y las cantidades 0 de integrantes o LGAC.
 */
export function filtroCuerpos(consulta: ConsultaListado) {
  const texto = consulta.q.trim();
  const anio = /^\d{4}$/.test(texto) ? Number(texto) : null;
  const niveles = texto ? nivelesPorEtiqueta(texto) : [];
  const porTexto = condicionTexto(consulta.q, (contiene) => [
    { clave: contiene },
    { nombre: contiene },
    { departamento: { nombre: contiene } },
    { departamento: { nomenclatura: contiene } },
    { lider: { nombres: contiene } },
    { lider: { apellidos: contiene } },
    { lider: { codigo: contiene } },
    ...(niveles.length ? [{ nivel: { in: niveles } }] : []),
    ...(anio ? [{ anioRegistro: anio }, { anioVencimiento: anio }] : []),
    ...(texto === "0" ? [{ integrantes: { none: {} } }, { lgacs: { none: {} } }] : []),
  ]);

  return {
    ...porTexto,
    ...(consulta.filtros.nivel ? { nivel: consulta.filtros.nivel as (typeof NIVELES_CONSOLIDACION)[number] } : {}),
    ...(consulta.filtros.departamento ? { departamentoId: Number(consulta.filtros.departamento) } : {}),
  };
}

export function ordenCuerpos(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    clave: (dir) => ({ clave: dir }),
    nombre: (dir) => ({ nombre: dir }),
    nivel: (dir) => ({ nivel: dir }),
    departamento: (dir) => ({ departamento: { nombre: dir } }),
    vigencia: (dir) => ({ anioRegistro: dir }),
    integrantes: (dir) => ({ integrantes: { _count: dir } }),
    lider: (dir) => ({ lider: { apellidos: dir } }),
    lgacs: (dir) => ({ lgacs: { _count: dir } }),
  });
}
