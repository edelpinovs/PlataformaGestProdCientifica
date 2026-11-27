import type { ConsultaListado, DefinicionListado } from "@/lib/listados/consulta";
import { normalizar } from "@/modules/catalogos/comun";
import { cuentaParaSemaforo, ETIQUETA_TIPO, formatoFecha, type FilaVigencia } from "@/modules/reportes/vigencias";

// Calidad de datos (issue 242): inconsistencias que el administrador puede corregir. Son funciones
// puras sobre datos ya leídos; la página los carga con Prisma y las aplica.
//
// Las vigencias vencidas (#278) no se recalculan aquí: las filas se arman con las funciones del
// semáforo de Reportes y se reporta la que ya está en rojo, así que si se acuerdan D-227 o D-229 el
// hallazgo cambia junto con el reporte. De SNII y PRODEP solo cuenta el último periodo de cada
// persona: uno anterior de quien ya renovó es historial, no algo que corregir (revisión del #303). Quedan fuera los homónimos sin resolver (módulo de validación): se
// agregarán cuando ese módulo exponga su regla, para no duplicarla.

export const REGLAS_CALIDAD = {
  CA_SIN_LIDER: { texto: "Cuerpo académico sin líder", severidad: "aviso" },
  LIDER_NO_INTEGRANTE: { texto: "Líder que no es integrante", severidad: "error" },
  INTEGRANTE_DE_BAJA: { texto: "Integrante de baja o trasladado", severidad: "aviso" },
  SIN_IDENTIFICADORES: { texto: "Sin ORCID ni Scopus", severidad: "aviso" },
  SIN_PERFIL: { texto: "Sin perfil de acceso", severidad: "aviso" },
  VIGENCIA_VENCIDA: { texto: "Vigencia vencida", severidad: "aviso" },
} as const;

export type ReglaCalidad = keyof typeof REGLAS_CALIDAD;
export const CLAVES_REGLA = Object.keys(REGLAS_CALIDAD) as ReglaCalidad[];

// D-273: baja temporal, baja posdoctoral y trasladado ya no existen.
// Licencia y estancia posdoctoral no son baja: la persona sigue vinculada (D-246 está pendiente).
const ESTATUS_DE_BAJA = new Set<string>();

export type ProfesorCalidad = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  estatusLaboral: string;
  orcid: string | null;
  scopusId: string | null;
  tienePerfil: boolean;
};

export type CuerpoCalidad = {
  id: number;
  clave: string;
  nombre: string;
  liderId: number | null;
  integrantes: number[];
};

export type Hallazgo = {
  /** Única por regla y registro: sirve de `key` en la lista. */
  clave: string;
  regla: ReglaCalidad;
  severidad: "aviso" | "error";
  /** Registro afectado, tal como lo ve la persona. */
  registro: string;
  detalle: string;
  /** Pantalla donde se corrige. */
  enlace: string;
};

const nombreProfesor = (p: Pick<ProfesorCalidad, "apellidos" | "nombres" | "codigo">) =>
  `${p.apellidos} ${p.nombres} (${p.codigo})`;

function hallazgo(regla: ReglaCalidad, id: string, registro: string, detalle: string, enlace: string): Hallazgo {
  return { clave: `${regla}:${id}`, regla, severidad: REGLAS_CALIDAD[regla].severidad, registro, detalle, enlace };
}

export function analizarCalidad(datos: { profesores: ProfesorCalidad[]; cuerpos: CuerpoCalidad[] }): Hallazgo[] {
  const { profesores, cuerpos } = datos;
  const porId = new Map(profesores.map((p) => [p.id, p]));
  const resultado: Hallazgo[] = [];

  for (const cuerpo of cuerpos) {
    const registro = `${cuerpo.clave} · ${cuerpo.nombre}`;
    const enlace = `/cuerpos-academicos/${cuerpo.id}`;

    if (cuerpo.liderId === null) {
      resultado.push(hallazgo("CA_SIN_LIDER", String(cuerpo.id), registro, "No tiene un líder asignado.", enlace));
    } else if (!cuerpo.integrantes.includes(cuerpo.liderId)) {
      const lider = porId.get(cuerpo.liderId);
      resultado.push(
        hallazgo("LIDER_NO_INTEGRANTE", String(cuerpo.id), registro,
          `${lider ? nombreProfesor(lider) : "El líder"} figura como líder pero no es integrante.`, enlace),
      );
    }

    for (const profesorId of cuerpo.integrantes) {
      const profesor = porId.get(profesorId);
      if (profesor && ESTATUS_DE_BAJA.has(profesor.estatusLaboral)) {
        resultado.push(
          hallazgo("INTEGRANTE_DE_BAJA", `${cuerpo.id}-${profesor.id}`, registro,
            `${nombreProfesor(profesor)} sigue como integrante con estatus ${etiquetaEstatus(profesor.estatusLaboral)}.`, enlace),
        );
      }
    }
  }

  for (const profesor of profesores) {
    // Solo importan los profesores activos: quien está de baja no se escanea ni necesita acceso.
    if (profesor.estatusLaboral !== "ACTIVO") continue;
    const enlace = `/profesores?q=${encodeURIComponent(profesor.codigo)}`;
    if (!profesor.orcid && !profesor.scopusId) {
      resultado.push(
        hallazgo("SIN_IDENTIFICADORES", String(profesor.id), nombreProfesor(profesor),
          "No se pueden buscar sus publicaciones: falta su ORCID y su identificador de Scopus.", enlace),
      );
    }
    if (!profesor.tienePerfil) {
      resultado.push(
        hallazgo("SIN_PERFIL", String(profesor.id), nombreProfesor(profesor),
          "Está activo pero todavía no tiene un perfil para entrar al sistema.", "/administracion/usuarios"),
      );
    }
  }
  return resultado;
}

/** Periodo SNII o PRODEP con su profesor, para decidir cuál es el último de cada persona. */
export type PeriodoPersona = { id: number; profesorId: number; inicio: Date; fin: Date; resultado: string };

/** Compara por inicio, luego por fin y, si empatan, por id: el mayor es el periodo posterior. */
function comparaPeriodos(a: PeriodoPersona, b: PeriodoPersona) {
  return a.inicio.getTime() - b.inicio.getTime() || a.fin.getTime() - b.fin.getTime() || a.id - b.id;
}

/**
 * Último periodo de cada persona entre los que entran al semáforo (aprobado o en reconsideración,
 * con `cuentaParaSemaforo` de Reportes). Un periodo no aprobado no sustituye al anterior: quien no
 * renovó sigue con su distinción vencida. Se aplica por separado a SNII y a PRODEP.
 */
export function ultimoPeriodoPorPersona<T extends PeriodoPersona>(periodos: T[]): T[] {
  const ultimos = new Map<number, T>();
  for (const periodo of periodos) {
    if (!cuentaParaSemaforo(periodo.resultado)) continue;
    const actual = ultimos.get(periodo.profesorId);
    if (!actual || comparaPeriodos(periodo, actual) > 0) ultimos.set(periodo.profesorId, periodo);
  }
  return [...ultimos.values()];
}

/**
 * Vigencias SNII, PRODEP y de cuerpo académico que el semáforo de Reportes pinta de rojo (#278).
 * Recibe filas armadas con las funciones de Reportes, de modo que la regla de vencimiento no se
 * copia aquí. Las de SNII y PRODEP deben venir ya acotadas con `ultimoPeriodoPorPersona`.
 */
export function hallazgosVigenciasVencidas(filas: FilaVigencia[]): Hallazgo[] {
  return filas
    .filter((fila) => fila.semaforo === "ROJO")
    .map((fila) =>
      hallazgo("VIGENCIA_VENCIDA", fila.id, fila.nombre,
        `${ETIQUETA_TIPO[fila.tipo]} (${fila.detalle}) venció el ${formatoFecha(fila.fin)}.`,
        `/reportes?semaforo=ROJO&q=${encodeURIComponent(fila.nombre)}`),
    );
}

function etiquetaEstatus(estatus: string) {
  return (
    { BAJA_TEMPORAL: "baja temporal", BAJA_POSDOCTORAL: "baja posdoctoral", TRASLADADO: "trasladado" }[estatus] ?? estatus
  ).toLowerCase();
}

// ─── Listado (D-009) sobre la lista ya calculada ──────────────────────────────

export const LISTADO_CALIDAD: DefinicionListado = {
  columnas: ["registro", "regla", "detalle"],
  ordenInicial: { columna: "regla", dir: "asc" },
  filtros: { regla: CLAVES_REGLA },
};

export const COLUMNAS_CALIDAD = [
  { clave: "registro", texto: "Registro" },
  { clave: "regla", texto: "Problema" },
  { clave: "detalle", texto: "Detalle" },
];

/**
 * Reglas que no se listan salvo que se pida su filtro (#348): «Sin perfil de acceso» es el estado
 * normal de un profesor hasta que se le invita (#275) y llegó a ser 172 de 182 hallazgos, así que
 * tapaba lo demás. Sigue contándose en el inicio del panel y se ve con `?regla=SIN_PERFIL`.
 */
export const REGLAS_OCULTAS_POR_OMISION: readonly ReglaCalidad[] = ["SIN_PERFIL"];

/** Hallazgos que el listado deja fuera por omisión: la página avisa cuántos son y cómo verlos. */
export function hallazgosOcultos(hallazgos: Hallazgo[], consulta: ConsultaListado): Hallazgo[] {
  if (consulta.filtros.regla) return [];
  return hallazgos.filter((h) => REGLAS_OCULTAS_POR_OMISION.includes(h.regla));
}

/**
 * Filtra por regla y por texto libre (registro, problema y detalle, sin distinguir mayúsculas ni
 * acentos). Esta lista se calcula en memoria y es acotada (un hallazgo por registro afectado), por eso
 * se filtra aquí y no con `skip`/`take` en la base; se justifica en el issue 242.
 */
export function filtrarHallazgos(hallazgos: Hallazgo[], consulta: ConsultaListado): Hallazgo[] {
  const texto = normalizar(consulta.q.trim());
  return hallazgos.filter((h) => {
    if (consulta.filtros.regla ? h.regla !== consulta.filtros.regla : REGLAS_OCULTAS_POR_OMISION.includes(h.regla)) return false;
    if (!texto) return true;
    return normalizar(`${h.registro} ${REGLAS_CALIDAD[h.regla].texto} ${h.detalle}`).includes(texto);
  });
}

/**
 * Ordena por la columna elegida (A–Z) con desempate por clave para que el orden sea estable.
 * El orden es natural: `UDG-CA-2` va antes que `UDG-CA-10` (#278).
 * `consulta.orden` ya viene validado contra `LISTADO_CALIDAD.columnas`.
 */
export function ordenarHallazgos(hallazgos: Hallazgo[], consulta: ConsultaListado): Hallazgo[] {
  const valor = (h: Hallazgo) =>
    consulta.orden === "regla" ? REGLAS_CALIDAD[h.regla].texto : consulta.orden === "detalle" ? h.detalle : h.registro;
  const signo = consulta.dir === "asc" ? 1 : -1;
  const comparar = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });
  return [...hallazgos].sort((a, b) => signo * comparar(valor(a), valor(b)) || signo * comparar(a.clave, b.clave));
}
