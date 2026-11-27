import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// Listado de áreas con búsqueda, orden y paginación (regla D-009).

export const LISTADO_AREAS: DefinicionListado = {
  columnas: ["nombre", "subareas"],
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export const COLUMNAS_AREAS = [
  { clave: "nombre", texto: "Nombre" },
  { clave: "subareas", texto: "Cantidad de subáreas" },
];

/** La búsqueda libre cubre lo que muestra el listado: el nombre del área. */
export function filtroAreas(consulta: ConsultaListado) {
  return condicionTexto(consulta.q, (contiene) => [{ nombre: contiene }]);
}

export function ordenAreas(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    nombre: (dir) => ({ nombre: dir }),
    subareas: (dir) => ({ subareas: { _count: dir } }),
  });
}
