import type { ConsultaListado, DefinicionListado } from "@/lib/listados/consulta";
import { CLASIFICACIONES, type FilaRevision } from "./balance";

// RF-019: detalle de la revisión. La clasificación sale del historial de M3 y no se guarda, así
// que no se puede pedir a la base: la lista completa (≈10,000 filas) se filtra, ordena y pagina
// en memoria con las mismas reglas de la pauta de listados (D-009).

export const CRITERIOS = ["CVU", "CODIGO", "NOMBRE", "MANUAL", "AMBIGUO", "SIN_COINCIDENCIA"] as const;

export const LISTADO_REVISION: DefinicionListado = {
  columnas: ["listado", "profesor", "criterio", "clasificacion"],
  ordenInicial: { columna: "clasificacion", dir: "asc" },
  filtros: { clasificacion: CLASIFICACIONES, criterio: CRITERIOS },
};

export const COLUMNAS_REVISION = [
  { clave: "listado", texto: "En el listado" },
  { clave: "profesor", texto: "Profesor del directorio" },
  { clave: "criterio", texto: "Criterio" },
  { clave: "clasificacion", texto: "Clasificación" },
];

export const ETIQUETA_CLASIFICACION = {
  PROMOCION: "Promoción",
  RENOVACION: "Renovación",
  NUEVO_INGRESO: "Nuevo ingreso",
  NO_APROBADO: "No aprobado",
  DUDOSO: "Dudoso",
  SIN_COINCIDENCIA: "Sin coincidencia",
} as const;

export const ETIQUETA_CRITERIO = {
  CVU: "CVU",
  CODIGO: "Código",
  NOMBRE: "Nombre",
  MANUAL: "Manual",
  AMBIGUO: "Dudoso",
  SIN_COINCIDENCIA: "Sin coincidencia",
} as const;

const sinAcentos = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
const comparar = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

export function filtrarYOrdenarRevision(filas: FilaRevision[], consulta: ConsultaListado, nombreProfesor: (id: number) => string) {
  const profesor = (f: FilaRevision) => (f.profesorId === null ? "" : nombreProfesor(f.profesorId));
  const palabras = sinAcentos(consulta.q).split(/\s+/).filter(Boolean);
  const { clasificacion, criterio } = consulta.filtros;

  const elegidas = filas.filter((f) => {
    if (clasificacion && f.clasificacion !== clasificacion) return false;
    if (criterio && f.criterio !== criterio) return false;
    if (!palabras.length) return true;
    const texto = sinAcentos(`${f.nombreListado ?? ""} ${profesor(f)}`);
    return palabras.every((p) => texto.includes(p));
  });

  const valor: Record<string, (f: FilaRevision) => string | number> = {
    listado: (f) => f.nombreListado ?? "",
    profesor,
    criterio: (f) => (f.criterio ? ETIQUETA_CRITERIO[f.criterio] : ""),
    clasificacion: (f) => CLASIFICACIONES.indexOf(f.clasificacion),
  };
  const obtener = valor[consulta.orden] ?? valor.clasificacion;
  const signo = consulta.dir === "asc" ? 1 : -1;
  return [...elegidas].sort((a, b) => {
    const x = obtener(a), y = obtener(b);
    const principal = typeof x === "number" && typeof y === "number" ? x - y : comparar(String(x), String(y));
    // Desempate estable: número de renglón y, para los no aprobados, la clave.
    return signo * principal || (a.numero ?? Infinity) - (b.numero ?? Infinity) || a.clave.localeCompare(b.clave);
  });
}
