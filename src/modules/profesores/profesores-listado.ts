import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { ESTATUS_LABORALES } from "./profesores";

// Listado del directorio: búsqueda, filtros, orden y paginación (D-009, issue #110).

/** Estatus, departamentos y grados existentes son los valores permitidos de cada filtro. */
export function listadoProfesores(idsDepartamento: number[], idsGrado: number[]): DefinicionListado {
  return {
    columnas: ["codigo", "nombre", "correo", "estatus"],
    ordenInicial: { columna: "nombre", dir: "asc" },
    filtros: {
      estatus: ESTATUS_LABORALES,
      departamento: idsDepartamento.map(String),
      grado: idsGrado.map(String),
    },
  };
}

export const COLUMNAS_PROFESORES = [
  { clave: "codigo", texto: "Código" },
  { clave: "nombre", texto: "Nombre" },
  { clave: "correo", texto: "Correo" },
  { clave: "estatus", texto: "Estatus" },
];

/**
 * La búsqueda libre cubre lo que muestra la fila: código, nombre, apellidos, correo,
 * departamento y grado (nombre y nomenclatura).
 */
export function filtroProfesores(consulta: ConsultaListado) {
  return {
    ...condicionTexto(consulta.q, (contiene) => [
      { codigo: contiene },
      { nombres: contiene },
      { apellidos: contiene },
      { correo: contiene },
      { departamento: { nombre: contiene } },
      { grado: { nombre: contiene } },
      { grado: { nomenclatura: contiene } },
    ]),
    ...(consulta.filtros.estatus
      ? { estatusLaboral: consulta.filtros.estatus as (typeof ESTATUS_LABORALES)[number] }
      : {}),
    ...(consulta.filtros.departamento ? { departamentoId: Number(consulta.filtros.departamento) } : {}),
    ...(consulta.filtros.grado ? { gradoId: Number(consulta.filtros.grado) } : {}),
  };
}

/** Por omisión, apellidos y luego nombres, como el directorio antes de paginar. */
export function ordenProfesores(consulta: ConsultaListado) {
  const [principal, desempate] = ordenarPor(consulta, {
    codigo: (dir) => ({ codigo: dir }),
    nombre: (dir) => ({ apellidos: dir }),
    correo: (dir) => ({ correo: dir }),
    estatus: (dir) => ({ estatusLaboral: dir }),
  });
  return consulta.orden === "nombre" ? [principal, { nombres: consulta.dir }, desempate] : [principal, desempate];
}
