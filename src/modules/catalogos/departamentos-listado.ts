import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// Listado de departamentos con búsqueda, filtro por división, orden y paginación (regla D-009).

/** Las divisiones existentes son los valores permitidos del filtro, así que se pasan en cada consulta. */
export function listadoDepartamentos(idsDivision: number[]): DefinicionListado {
  return {
    columnas: ["nombre", "nomenclatura", "division"],
    ordenInicial: { columna: "division", dir: "asc" },
    filtros: { division: idsDivision.map(String) },
  };
}

export const COLUMNAS_DEPARTAMENTOS = [
  { clave: "nombre", texto: "Nombre" },
  { clave: "nomenclatura", texto: "Nomenclatura" },
  { clave: "division", texto: "División" },
];

/** La búsqueda libre cubre lo que muestra el listado: nombre, nomenclatura y la división (nombre y clave). */
export function filtroDepartamentos(consulta: ConsultaListado) {
  return {
    ...condicionTexto(consulta.q, (contiene) => [
      { nombre: contiene },
      { nomenclatura: contiene },
      { division: { nombre: contiene } },
      { division: { clave: contiene } },
    ]),
    ...(consulta.filtros.division ? { divisionId: Number(consulta.filtros.division) } : {}),
  };
}

/** Por omisión se agrupa por división y, dentro de ella, por nombre, como antes. */
export function ordenDepartamentos(consulta: ConsultaListado) {
  const [principal, desempate] = ordenarPor(consulta, {
    nombre: (dir) => ({ nombre: dir }),
    nomenclatura: (dir) => ({ nomenclatura: dir }),
    division: (dir) => ({ division: { nombre: dir } }),
  });
  return consulta.orden === "division" ? [principal, { nombre: consulta.dir }, desempate] : [principal, desempate];
}
