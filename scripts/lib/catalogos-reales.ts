// Divisiones y departamentos REALES que necesita la carga de profesores (D-259 a D-262).
// Funciones puras: reciben lo que hay en la base y devuelven qué se crearía, qué ya existe y qué choca.
// Reutilizan las validaciones del catálogo (`src/modules/catalogos`), así que el alta cumple las mismas
// reglas que las pantallas de Divisiones y Departamentos. Detalle en docs/IMPORTACION_DATOS_REALES.md.
import { departamento, revisarDepartamento } from "../../src/modules/catalogos/departamentos";
import { buscarDuplicada, division } from "../../src/modules/catalogos/divisiones";
import { normalizar } from "../../src/modules/catalogos/comun";

export interface DivisionReal {
  clave: string;
  nombre: string;
}

export interface DepartamentoReal {
  /** Debe coincidir con el nombre que trae el CSV de profesores (el cargador cruza por nombre). */
  nombre: string;
  /** Confirmada por el equipo el 2026-11-24 (D-265); el cliente no dio una oficial. Se corrige desde la pantalla de Departamentos. */
  nomenclatura: string;
  divisionClave: string;
}

// Confirmadas el 2026-11-24. La clave es la «clave interna (UdeG)». Faltan los demás departamentos del
// listado (Naturales y Exactas, Económicas y Administrativas, Sociales y Humanidades): su división está por
// confirmar con el cliente y no se asume. Se agregan aquí cuando se confirmen.
export const DIVISIONES_REALES: DivisionReal[] = [
  { clave: "EI", nombre: "Centro Universitario de Ciencias Exactas e Ingenierías" },
  { clave: "SA", nombre: "Centro Universitario de Ciencias de la Salud" },
  { clave: "SH", nombre: "Centro Universitario de Ciencias Sociales y Humanidades" },
];

export const DEPARTAMENTOS_REALES: DepartamentoReal[] = [
  { nombre: "Departamento de Ciencias Computacionales e Ingenierías", nomenclatura: "DCCI", divisionClave: "EI" },
  { nombre: "Departamento de Ciencias de la Salud", nomenclatura: "DCS", divisionClave: "SA" },
  { nombre: "Departamento de Ciencias del Comportamiento", nomenclatura: "DCCOM", divisionClave: "SH" },
];

export interface BaseCatalogos {
  divisiones: { id: number; nombre: string; clave: string }[];
  departamentos: { id: number; nombre: string; nomenclatura: string; divisionId: number }[];
}

export interface PlanCatalogos {
  divisionesNuevas: DivisionReal[];
  /** Claves de las divisiones que ya existen con el mismo nombre (no se tocan). */
  divisionesExistentes: string[];
  departamentosNuevos: DepartamentoReal[];
  departamentosExistentes: string[];
  /** Todo lo que impide crear algo sin pisar lo que ya hay. Si hay alguno, `aplicar` no escribe. */
  conflictos: string[];
}

// Ids provisionales (positivos) para las divisiones que aún no existen; solo sirven para validar.
const ID_PROVISIONAL = 1_000_000;

export function planearCatalogos(
  base: BaseCatalogos,
  divisiones: DivisionReal[] = DIVISIONES_REALES,
  departamentos: DepartamentoReal[] = DEPARTAMENTOS_REALES,
): PlanCatalogos {
  const plan: PlanCatalogos = {
    divisionesNuevas: [],
    divisionesExistentes: [],
    departamentosNuevos: [],
    departamentosExistentes: [],
    conflictos: [],
  };
  const idPorClave = new Map<string, number>();
  const divisionesConocidas = [...base.divisiones];

  for (const real of divisiones) {
    const revisada = division.safeParse(real);
    if (!revisada.success) {
      plan.conflictos.push(`La división «${real.clave}» no es válida: ${revisada.error.issues[0].message}`);
      continue;
    }
    const mismaClave = base.divisiones.find((d) => normalizar(d.clave) === normalizar(real.clave));
    if (mismaClave) {
      if (normalizar(mismaClave.nombre) === normalizar(real.nombre)) {
        plan.divisionesExistentes.push(real.clave);
        idPorClave.set(real.clave, mismaClave.id);
      } else {
        plan.conflictos.push(
          `La clave «${real.clave}» ya la usa otra división («${mismaClave.nombre}»). No se crea «${real.nombre}».`,
        );
      }
      continue;
    }
    const duplicada = buscarDuplicada(revisada.data, base.divisiones);
    if (duplicada) {
      plan.conflictos.push(`${duplicada.mensaje} No se crea la clave «${real.clave}».`);
      continue;
    }
    const id = ID_PROVISIONAL + plan.divisionesNuevas.length;
    plan.divisionesNuevas.push({ clave: revisada.data.clave, nombre: revisada.data.nombre });
    idPorClave.set(real.clave, id);
    divisionesConocidas.push({ id, nombre: real.nombre, clave: real.clave });
  }

  const departamentosConocidos = base.departamentos.map((d) => ({ ...d }));
  for (const real of departamentos) {
    const divisionId = idPorClave.get(real.divisionClave);
    if (divisionId === undefined) {
      plan.conflictos.push(
        `No se crea «${real.nombre}»: su división «${real.divisionClave}» no existe o tiene un conflicto.`,
      );
      continue;
    }
    // El cargador de profesores cruza por nombre: dos departamentos con el mismo nombre serían ambiguos.
    const mismoNombre = departamentosConocidos.filter((d) => normalizar(d.nombre) === normalizar(real.nombre));
    if (mismoNombre.some((d) => d.divisionId === divisionId)) {
      plan.departamentosExistentes.push(real.nombre);
      continue;
    }
    if (mismoNombre.length > 0) {
      plan.conflictos.push(`«${real.nombre}» ya existe en otra división. Revísalo antes de crear un segundo.`);
      continue;
    }
    const revisado = departamento.safeParse({ nombre: real.nombre, nomenclatura: real.nomenclatura, divisionId });
    if (!revisado.success) {
      plan.conflictos.push(`«${real.nombre}» no es válido: ${revisado.error.issues[0].message}`);
      continue;
    }
    const problema = revisarDepartamento(revisado.data, {
      divisiones: divisionesConocidas,
      departamentos: departamentosConocidos,
    });
    if (problema) {
      plan.conflictos.push(`«${real.nombre}»: ${problema.mensaje}`);
      continue;
    }
    plan.departamentosNuevos.push({ nombre: revisado.data.nombre, nomenclatura: revisado.data.nomenclatura, divisionClave: real.divisionClave });
    departamentosConocidos.push({
      id: -(departamentosConocidos.length + 1),
      nombre: revisado.data.nombre,
      nomenclatura: revisado.data.nomenclatura,
      divisionId,
    });
  }

  return plan;
}
