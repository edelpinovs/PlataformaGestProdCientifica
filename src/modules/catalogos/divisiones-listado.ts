import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// Listado de divisiones con búsqueda, orden y paginación (regla D-009).

export const LISTADO_DIVISIONES: DefinicionListado = {
  columnas: ["nombre", "clave", "departamentos"],
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export const COLUMNAS_DIVISIONES = [
  { clave: "nombre", texto: "Nombre" },
  { clave: "clave", texto: "Clave" },
  { clave: "departamentos", texto: "Cantidad de departamentos" },
];

/** La búsqueda libre cubre lo que muestra el listado: nombre y clave. */
export function filtroDivisiones(consulta: ConsultaListado) {
  return condicionTexto(consulta.q, (contiene) => [{ nombre: contiene }, { clave: contiene }]);
}

export function ordenDivisiones(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    nombre: (dir) => ({ nombre: dir }),
    clave: (dir) => ({ clave: dir }),
    departamentos: (dir) => ({ departamentos: { _count: dir } }),
  });
}
