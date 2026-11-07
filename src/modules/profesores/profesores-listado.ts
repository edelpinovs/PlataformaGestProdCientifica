import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { ESTATUS_LABORALES, ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "./profesores";

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

const MAX_PALABRAS = 5;

function sinAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Valores del enum cuya etiqueta visible contiene la palabra, sin distinguir acentos ni mayúsculas. */
function valoresPorEtiqueta<T extends string>(etiquetas: Record<T, string>, palabra: string): T[] {
  const buscado = sinAcentos(palabra);
  return (Object.keys(etiquetas) as T[]).filter((valor) => sinAcentos(etiquetas[valor]).includes(buscado));
}

/**
 * La búsqueda libre cubre lo que muestra la fila: código, nombre, apellidos, correo, departamento,
 * grado (nombre y nomenclatura), tipo de contratación y estatus. El texto se divide en palabras y
 * cada una debe aparecer en algún campo, así «Ana Pérez» encuentra a Ana María Pérez Ruiz.
 */
export function filtroProfesores(consulta: ConsultaListado) {
  const palabras = consulta.q.split(/\s+/).filter(Boolean).slice(0, MAX_PALABRAS);
  const porPalabra = palabras.map((palabra) =>
    condicionTexto(palabra, (contiene) => [
      { codigo: contiene },
      { nombres: contiene },
      { apellidos: contiene },
      { correo: contiene },
      { departamento: { nombre: contiene } },
      { grado: { nombre: contiene } },
      { grado: { nomenclatura: contiene } },
      { tipoContratacion: { in: valoresPorEtiqueta(ETIQUETA_CONTRATACION, palabra) } },
      { estatusLaboral: { in: valoresPorEtiqueta(ETIQUETA_ESTATUS, palabra) } },
    ]),
  );
  return {
    ...(porPalabra.length ? { AND: porPalabra } : {}),
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
