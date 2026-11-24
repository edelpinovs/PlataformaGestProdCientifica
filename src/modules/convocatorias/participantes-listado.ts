import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";

// RF-018: listado de participantes de las convocatorias (pauta de listados, D-009).

export const RESULTADOS = ["APROBADO", "NO_APROBADO", "PENDIENTE"] as const;
export const ORIGENES = ["MANUAL", "LISTADO"] as const;

export const ETIQUETA_RESULTADO = {
  APROBADO: { tipo: "exito", texto: "Aprobado" },
  NO_APROBADO: { tipo: "error", texto: "No aprobado" },
  EN_RECONSIDERACION: { tipo: "aviso", texto: "En reconsideración" },
  PENDIENTE: { tipo: "aviso", texto: "Sin resultado" },
} as const;

/** Resultado con la carga aún en revisión: se muestra, pero no se guarda hasta confirmar. */
export const ETIQUETA_PRELIMINAR = {
  APROBADO: { tipo: "aviso", texto: "Aprobado (preliminar)" },
  NO_APROBADO: { tipo: "aviso", texto: "No aprobado (preliminar)" },
} as const;

export const ETIQUETA_ORIGEN = { MANUAL: "Registrado", LISTADO: "Listado oficial" } as const;

/** Los ids de las convocatorias existentes son los únicos valores del filtro `convocatoria`. */
export function listadoParticipantes(idsConvocatoria: number[]): DefinicionListado {
  return {
    columnas: ["convocatoria", "profesor", "codigo", "resultado", "origen"],
    ordenInicial: { columna: "convocatoria", dir: "desc" },
    filtros: { convocatoria: idsConvocatoria.map(String), resultado: RESULTADOS, origen: ORIGENES },
  };
}

export const COLUMNAS_PARTICIPANTES = [
  { clave: "convocatoria", texto: "Convocatoria" },
  { clave: "profesor", texto: "Profesor" },
  { clave: "codigo", texto: "Código" },
  { clave: "resultado", texto: "Resultado" },
  { clave: "origen", texto: "Origen" },
];

const MAX_PALABRAS = 5;

/** Cada palabra debe estar en el nombre, los apellidos o el código del profesor. */
export function filtroParticipantes(consulta: ConsultaListado) {
  const palabras = consulta.q.split(/\s+/).filter(Boolean).slice(0, MAX_PALABRAS);
  const porPalabra = palabras.map((palabra) => ({
    profesor: condicionTexto(palabra, (contiene) => [{ nombres: contiene }, { apellidos: contiene }, { codigo: contiene }]),
  }));
  const { convocatoria, resultado, origen } = consulta.filtros;
  return {
    ...(porPalabra.length ? { AND: porPalabra } : {}),
    ...(convocatoria ? { convocatoriaId: Number(convocatoria) } : {}),
    ...(resultado === "PENDIENTE" ? { resultado: null } : resultado ? { resultado: resultado as "APROBADO" | "NO_APROBADO" } : {}),
    ...(origen ? { origen: origen as "MANUAL" | "LISTADO" } : {}),
  };
}

export function ordenParticipantes(consulta: ConsultaListado) {
  const [principal, desempate] = ordenarPor(consulta, {
    convocatoria: (dir) => ({ convocatoria: { anio: dir } }),
    profesor: (dir) => ({ profesor: { apellidos: dir } }),
    codigo: (dir) => ({ profesor: { codigo: dir } }),
    resultado: (dir) => ({ resultado: dir }),
    origen: (dir) => ({ origen: dir }),
  });
  if (consulta.orden === "convocatoria") return [principal, { convocatoria: { programa: consulta.dir } }, desempate];
  if (consulta.orden === "profesor") return [principal, { profesor: { nombres: consulta.dir } }, desempate];
  return [principal, desempate];
}
