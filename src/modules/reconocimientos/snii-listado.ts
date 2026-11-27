import type { Prisma } from "@/generated/prisma/client";
import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { rangoFechaBusqueda } from "./prodep";
import { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "./snii";

// Issue 111 (D-009): «Reconocimientos registrados» de SNII, paginado de 10 en 10, con búsqueda libre,
// orden por cada columna y filtros de nivel, tipo de participación y resultado, como PRODEP.

export const RESULTADOS_SNII = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;

export const ETIQUETAS_NIVEL_SNII: Record<(typeof NIVELES_SNII)[number], string> = {
  CANDIDATO: "Candidato", NIVEL_1: "Nivel 1", NIVEL_2: "Nivel 2", NIVEL_3: "Nivel 3", EMERITO: "Emérito", NO_APROBADO: "No aprobado",
};
export const ETIQUETAS_PARTICIPACION_SNII: Record<(typeof TIPOS_PARTICIPACION_SNII)[number], string> = {
  NUEVO_INGRESO: "Nuevo ingreso", RENOVACION: "Renovación", REINGRESO_NO_VIGENTE: "Reingreso no vigente",
};
export const ETIQUETAS_RESULTADO_SNII: Record<(typeof RESULTADOS_SNII)[number], string> = {
  APROBADO: "Aprobado", NO_APROBADO: "No aprobado", EN_RECONSIDERACION: "En reconsideración",
};

export const LISTADO_SNII: DefinicionListado = {
  columnas: ["profesor", "nivel", "tipoParticipacion", "resultado", "inicio", "fin"],
  // Lo que vence más tarde primero, como mostraba la pantalla antes de paginarse.
  ordenInicial: { columna: "fin", dir: "desc" },
  filtros: { nivel: NIVELES_SNII, tipoParticipacion: TIPOS_PARTICIPACION_SNII, resultado: RESULTADOS_SNII },
};

export const COLUMNAS_SNII = [
  { clave: "profesor", texto: "Profesor" },
  { clave: "nivel", texto: "Nivel" },
  { clave: "tipoParticipacion", texto: "Participación" },
  { clave: "resultado", texto: "Resultado" },
  { clave: "inicio", texto: "Inicio" },
  { clave: "fin", texto: "Fin" },
];

/** Valores de una lista cuya clave o etiqueta visible contiene el texto buscado. */
function coinciden<T extends string>(valores: readonly T[], etiquetas: Record<T, string>, busqueda: string): T[] {
  if (!busqueda) return [];
  return valores.filter((valor) => valor.toLocaleLowerCase("es-MX").includes(busqueda)
    || etiquetas[valor].toLocaleLowerCase("es-MX").includes(busqueda));
}

export function filtroSnii(consulta: ConsultaListado): Prisma.ReconocimientoSniiWhereInput {
  // Lo que muestra la fila: nombre, código y CVU del profesor, sus etiquetas y sus fechas.
  const texto = condicionTexto(consulta.q, (contiene) => [
    { profesor: { is: { nombres: contiene } } },
    { profesor: { is: { apellidos: contiene } } },
    { profesor: { is: { codigo: contiene } } },
    { profesor: { is: { cvu: contiene } } },
  ]);
  const criterios: Prisma.ReconocimientoSniiWhereInput[] = [...(texto.OR ?? [])];
  const busqueda = consulta.q.trim().toLocaleLowerCase("es-MX");
  const rango = rangoFechaBusqueda(consulta.q.trim());
  if (rango) {
    criterios.push({ inicio: { gte: rango.desde, lt: rango.hasta } }, { fin: { gte: rango.desde, lt: rango.hasta } });
  }
  for (const nivel of coinciden(NIVELES_SNII, ETIQUETAS_NIVEL_SNII, busqueda)) criterios.push({ nivel });
  for (const tipoParticipacion of coinciden(TIPOS_PARTICIPACION_SNII, ETIQUETAS_PARTICIPACION_SNII, busqueda)) criterios.push({ tipoParticipacion });
  for (const resultado of coinciden(RESULTADOS_SNII, ETIQUETAS_RESULTADO_SNII, busqueda)) criterios.push({ resultado });

  // analizarListado ya validó cada filtro contra su lista; aquí solo se buscan para tiparlos.
  const nivel = NIVELES_SNII.find((valor) => valor === consulta.filtros.nivel);
  const tipoParticipacion = TIPOS_PARTICIPACION_SNII.find((valor) => valor === consulta.filtros.tipoParticipacion);
  const resultado = RESULTADOS_SNII.find((valor) => valor === consulta.filtros.resultado);

  return {
    ...(criterios.length ? { OR: criterios } : {}),
    ...(nivel ? { nivel } : {}),
    ...(tipoParticipacion ? { tipoParticipacion } : {}),
    ...(resultado ? { resultado } : {}),
  };
}

export function ordenSnii(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    profesor: (dir) => ({ profesor: { apellidos: dir } }),
    nivel: (dir) => ({ nivel: dir }),
    tipoParticipacion: (dir) => ({ tipoParticipacion: dir }),
    resultado: (dir) => ({ resultado: dir }),
    inicio: (dir) => ({ inicio: dir }),
    fin: (dir) => ({ fin: dir }),
  });
}
