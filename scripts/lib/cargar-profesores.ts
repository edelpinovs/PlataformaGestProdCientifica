// Plan de carga de los profesores reales. Funciones puras: reciben lo validado (ver importar-profesores.ts) y
// lo que ya hay en la base, y devuelven qué se crea, qué se omite y qué se ajusta. No tocan la base.
// Criterio y marcas en docs/IMPORTACION_DATOS_REALES.md (D-259 a D-261).
import { generarNombreNormalizado } from "../../src/modules/profesores/profesores";
import { limpiarTexto, sinAcentos, type PersonaImportable } from "./importar-profesores";

// Marcas de lo que entra por esta importación; permiten contarlo y borrarlo sin tocar lo demás.
export const PREFIJO_CODIGO = "PEND";
export const DOMINIO_PENDIENTE = "pendiente.invalid";

// Condición «el profesor no tiene nada colgando». Las relaciones opcionales sin onDelete harían SetNull al borrar
// (la base no lo impide), por eso cada una va en la condición del borrado. La comparten `importar:limpiar` y la
// reversión de `importar:altas`; si el esquema agrega una relación a Profesor, se agrega aquí (hay una prueba).
export const SIN_USO_PROFESOR = {
  perfil: { is: null },
  programas: { none: {} },
  reconocimientosSnii: { none: {} },
  reconocimientosProdep: { none: {} },
  cuerposAcademicos: { none: {} },
  cuerposLiderados: { none: {} },
  lgacs: { none: {} },
  participaciones: { none: {} },
  renglonesResultado: { none: {} },
  autorias: { none: {} },
  cortesEscaneo: { none: {} },
};

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

// «ABUNDIS GUTIÉRREZ» → «Abundis Gutiérrez»; «DE LA TORRE» → «De la Torre». Lo que ya trae
// mayúsculas y minúsculas mezcladas se respeta.
export function capitalizarNombre(texto: string): string {
  const capitalizar = (palabra: string) =>
    palabra
      .toLowerCase()
      .replace(/(^|[-'’])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toUpperCase());
  return limpiarTexto(texto)
    .split(" ")
    .map((palabra, i) => {
      const bajas = palabra.toLowerCase();
      const mezclada = palabra !== bajas && palabra !== palabra.toUpperCase();
      if (mezclada) return palabra;
      if (i > 0 && PARTICULAS.has(bajas)) return bajas;
      return capitalizar(palabra);
    })
    .join(" ");
}

export const codigoPendiente = (numero: number) => `${PREFIJO_CODIGO}${String(numero).padStart(4, "0")}`;
export const correoPendiente = (numero: number) => `pend-${String(numero).padStart(4, "0")}@${DOMINIO_PENDIENTE}`;

export interface ProfesorEnBase {
  codigo: string;
  nombreNormalizado: string;
  orcid: string | null;
  scholarId: string | null;
  scopusId: string | null;
}

export interface EstadoBase {
  departamentos: { id: number; nombre: string }[];
  profesores: ProfesorEnBase[];
}

export interface ProfesorACargar {
  codigo: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nombreNormalizado: string;
  orcid: string | null;
  scholarId: string | null;
  scopusId: string | null;
  departamentoId: number | null;
  departamentoNombre: string | null;
}

export interface Ajuste {
  nombre: string;
  campo: "orcid" | "scholarId" | "scopusId";
  detalle: string;
}

export interface PlanCarga {
  cargar: ProfesorACargar[];
  /** Ya hay alguien con ese nombre en la base: no se vuelve a crear (la carga se puede repetir). */
  omitidos: string[];
  /** Un identificador ya lo tiene otra persona en la base: la persona se crea con ese campo vacío. */
  ajustes: Ajuste[];
  /** Departamentos del CSV que no existen en la base, con cuántas personas dependen de cada uno. */
  departamentosFaltantes: Map<string, number>;
}

const claveDepartamento = (nombre: string) => sinAcentos(limpiarTexto(nombre)).toLowerCase();

export function prepararCarga(personas: PersonaImportable[], base: EstadoBase): PlanCarga {
  const departamentos = new Map(base.departamentos.map((d) => [claveDepartamento(d.nombre), d]));
  const nombresEnBase = new Set(base.profesores.map((p) => p.nombreNormalizado));
  const orcidEnBase = new Set(base.profesores.map((p) => p.orcid?.toUpperCase()).filter(Boolean));
  const scholarEnBase = new Set(base.profesores.map((p) => p.scholarId?.toLowerCase()).filter(Boolean));
  const scopusEnBase = new Set(base.profesores.map((p) => p.scopusId).filter(Boolean));

  // El número sigue al más alto que ya exista, para que repetir la carga no choque con los códigos.
  let numero = base.profesores.reduce((maximo, p) => {
    const coincide = new RegExp(`^${PREFIJO_CODIGO}(\\d+)$`).exec(p.codigo);
    return coincide ? Math.max(maximo, Number(coincide[1])) : maximo;
  }, 0);

  const preparadas = personas
    .map((p) => {
      const apellidos = capitalizarNombre(p.apellidos);
      const nombres = capitalizarNombre(p.nombres);
      return { origen: p, apellidos, nombres, nombreNormalizado: generarNombreNormalizado(nombres, apellidos) };
    })
    .sort((a, b) => a.nombreNormalizado.localeCompare(b.nombreNormalizado, "es"));

  const plan: PlanCarga = { cargar: [], omitidos: [], ajustes: [], departamentosFaltantes: new Map() };

  for (const { origen, apellidos, nombres, nombreNormalizado } of preparadas) {
    const etiqueta = `${apellidos}, ${nombres}`;
    if (nombresEnBase.has(nombreNormalizado)) {
      plan.omitidos.push(etiqueta);
      continue;
    }

    const ajustes: Ajuste[] = [];
    const sinChoque = (campo: Ajuste["campo"], valor: string | null, enBase: Set<string | null | undefined>, clave: string | null) => {
      if (valor && clave && enBase.has(clave)) {
        ajustes.push({ nombre: etiqueta, campo, detalle: "Otra persona de la base ya tiene este identificador; se deja vacío." });
        return null;
      }
      return valor;
    };
    const orcid = sinChoque("orcid", origen.orcid, orcidEnBase, origen.orcid?.toUpperCase() ?? null);
    const scholarId = sinChoque("scholarId", origen.scholarId, scholarEnBase, origen.scholarId?.toLowerCase() ?? null);
    const scopusId = sinChoque("scopusId", origen.scopusId, scopusEnBase, origen.scopusId);
    plan.ajustes.push(...ajustes);

    let departamentoId: number | null = null;
    let departamentoNombre: string | null = null;
    if (origen.departamento) {
      const encontrado = departamentos.get(claveDepartamento(origen.departamento));
      if (encontrado) {
        departamentoId = encontrado.id;
        departamentoNombre = encontrado.nombre;
      } else {
        const nombre = limpiarTexto(origen.departamento);
        plan.departamentosFaltantes.set(nombre, (plan.departamentosFaltantes.get(nombre) ?? 0) + 1);
      }
    }

    numero++;
    plan.cargar.push({
      codigo: codigoPendiente(numero),
      correo: correoPendiente(numero),
      nombres,
      apellidos,
      nombreNormalizado,
      orcid,
      scholarId,
      scopusId,
      departamentoId,
      departamentoNombre,
    });
  }

  return plan;
}

export function informePlan(plan: PlanCarga): string {
  const partes = ["# Plan de carga (CONTIENE DATOS PERSONALES; no subir al repositorio)", ""];
  partes.push(`- A crear: ${plan.cargar.length}`, `- Omitidas (ya existen): ${plan.omitidos.length}`);
  partes.push(`- Identificadores que chocan con la base: ${plan.ajustes.length}`, "");
  if (plan.departamentosFaltantes.size > 0) {
    partes.push("## Departamentos que no existen en la base", "");
    for (const [nombre, cuantas] of plan.departamentosFaltantes) partes.push(`- ${nombre} (${cuantas} personas)`);
    partes.push("");
  }
  if (plan.ajustes.length > 0) {
    partes.push("## Identificadores que chocan con la base", "");
    for (const a of plan.ajustes) partes.push(`- ${a.nombre} — ${a.campo}: ${a.detalle}`);
    partes.push("");
  }
  partes.push("## A crear", "");
  for (const p of plan.cargar) partes.push(`- ${p.codigo} · ${p.apellidos}, ${p.nombres} · ${p.departamentoNombre ?? "sin departamento"}`);
  if (plan.omitidos.length > 0) {
    partes.push("", "## Omitidas (ya existen)", "");
    for (const o of plan.omitidos) partes.push(`- ${o}`);
  }
  return partes.join("\n");
}
