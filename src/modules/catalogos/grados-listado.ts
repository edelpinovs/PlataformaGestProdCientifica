import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// Listado de grados científicos con búsqueda, orden y paginación (regla D-009).
// Es el ejemplo de uso de la pieza compartida de src/lib/listados/ y src/components/listado.tsx.

export const LISTADO_GRADOS: DefinicionListado = {
  columnas: ["nombre", "nomenclatura"],
  ordenInicial: { columna: "nombre", dir: "asc" },
};

export const COLUMNAS_GRADOS = [
  { clave: "nombre", texto: "Nombre" },
  { clave: "nomenclatura", texto: "Nomenclatura" },
];

/** La búsqueda libre cubre todo lo que muestra el listado: nombre y nomenclatura. */
export function filtroGrados(consulta: ConsultaListado) {
  return condicionTexto(consulta.q, (contiene) => [{ nombre: contiene }, { nomenclatura: contiene }]);
}

export function ordenGrados(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    nombre: (dir) => ({ nombre: dir }),
    nomenclatura: (dir) => ({ nomenclatura: dir }),
  });
}
