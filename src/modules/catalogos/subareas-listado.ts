import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// Listado de subáreas con búsqueda, filtro por área, orden y paginación (regla D-009).

/** Las áreas existentes son los valores permitidos del filtro, así que se pasan en cada consulta. */
export function listadoSubareas(idsArea: number[]): DefinicionListado {
  return {
    columnas: ["nombre", "area"],
    ordenInicial: { columna: "area", dir: "asc" },
    filtros: { area: idsArea.map(String) },
  };
}

export const COLUMNAS_SUBAREAS = [
  { clave: "nombre", texto: "Nombre" },
  { clave: "area", texto: "Área" },
];

/** La búsqueda libre cubre lo que muestra el listado: el nombre de la subárea y el de su área. */
export function filtroSubareas(consulta: ConsultaListado) {
  return {
    ...condicionTexto(consulta.q, (contiene) => [{ nombre: contiene }, { area: { nombre: contiene } }]),
    ...(consulta.filtros.area ? { areaId: Number(consulta.filtros.area) } : {}),
  };
}

/** Por omisión se agrupa por área y, dentro de ella, por nombre. */
export function ordenSubareas(consulta: ConsultaListado) {
  const [principal, desempate] = ordenarPor(consulta, {
    nombre: (dir) => ({ nombre: dir }),
    area: (dir) => ({ area: { nombre: dir } }),
  });
  return consulta.orden === "area" ? [principal, { nombre: consulta.dir }, desempate] : [principal, desempate];
}
