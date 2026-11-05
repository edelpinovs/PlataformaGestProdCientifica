import { z } from "zod";

const sinProfesor = "Elige un profesor de tiempo completo.";

export const altaIntegrante = z.object({
  cuerpoId: z.coerce.number({ error: sinProfesor }).int().positive(),
  profesorId: z.coerce.number({ error: sinProfesor }).int(sinProfesor).positive(sinProfesor),
});

export type AltaIntegrante = z.infer<typeof altaIntegrante>;

export type ReconocimientoProdepResumen = {
  resultado: string;
  inicio: Date;
  fin: Date;
};

export type ProfesorParaCa = {
  id: number;
  nombres: string;
  apellidos: string;
  codigo: string;
  tipoContratacion: "TIEMPO_COMPLETO" | "ASIGNATURA";
  estatusLaboral: string;
  prodepActivo: boolean;
};

export type IntegranteResumen = {
  profesorId: number;
  nombre: string;
  prodepActivo: boolean;
};

export type ProblemaIntegrante = { campo: "profesorId"; mensaje: string };

function diaUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

// I3 (@Ared11, issues #12–#16) entregará `tiene_prodep_activo()`. Mientras, esta copia
// coincide con la consulta Prisma de `src/lib/inicio.ts` (APROBADO y vigencia que cubre hoy).
// Cuando I3 la entregue habrá tres copias: unificarlas en reconocimientos.
export function tieneProdepActivo(reconocimientos: ReconocimientoProdepResumen[], hoy: Date): boolean {
  const dia = diaUtc(hoy);
  return reconocimientos.some(
    (r) => r.resultado === "APROBADO" && diaUtc(r.inicio) <= dia && diaUtc(r.fin) >= dia,
  );
}

export function nombreProfesor(p: Pick<ProfesorParaCa, "nombres" | "apellidos" | "codigo">) {
  return `${p.apellidos} ${p.nombres} (${p.codigo})`;
}

export function agruparCandidatos<T extends { prodepActivo: boolean }>(candidatos: T[]) {
  return {
    conProdep: candidatos.filter((c) => c.prodepActivo),
    sinProdep: candidatos.filter((c) => !c.prodepActivo),
  };
}

function hayProdep(integrantes: IntegranteResumen[]) {
  return integrantes.some((i) => i.prodepActivo);
}

// Solo bloquea si el CA tenía PRODEP vigente y el cambio lo dejaría sin él.
// Si el PRODEP ya venció, se puede quitar o cambiar integrantes (si no, el CA queda atascado).
function pierdeProdepVigente(antes: IntegranteResumen[], despues: IntegranteResumen[]) {
  return hayProdep(antes) && !hayProdep(despues);
}

const MENSAJE_PRODEP =
  "Al menos un integrante debe tener Perfil Deseable PRODEP activo.";

function comoIntegrante(profesor: ProfesorParaCa): IntegranteResumen {
  return { profesorId: profesor.id, nombre: nombreProfesor(profesor), prodepActivo: profesor.prodepActivo };
}

// RF-013 · CU-008: solo Tiempo Completo activo; no se duplica.
// El primer integrante sí debe traer PRODEP. Después, solo se rechaza un cambio que quite el último PRODEP vigente.
export function revisarAltaIntegrante(
  profesor: ProfesorParaCa | undefined,
  integrantes: IntegranteResumen[],
): ProblemaIntegrante | null {
  if (!profesor) {
    return { campo: "profesorId", mensaje: "Ese profesor ya no está en el directorio. Recarga la página." };
  }
  if (profesor.tipoContratacion !== "TIEMPO_COMPLETO") {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesor)} no es de tiempo completo. Elige a otra persona.`,
    };
  }
  if (profesor.estatusLaboral !== "ACTIVO") {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesor)} no está en estatus laboral activo. Elige a otra persona.`,
    };
  }
  if (integrantes.some((i) => i.profesorId === profesor.id)) {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesor)} ya es integrante de este cuerpo académico.`,
    };
  }
  const resultantes = [...integrantes, comoIntegrante(profesor)];
  if (integrantes.length === 0 && !profesor.prodepActivo) {
    return { campo: "profesorId", mensaje: MENSAJE_PRODEP };
  }
  if (pierdeProdepVigente(integrantes, resultantes)) {
    return { campo: "profesorId", mensaje: MENSAJE_PRODEP };
  }
  return null;
}

// Quitar al último integrante deja el CA vacío. Quitar al único con PRODEP vigente, no.
export function revisarBajaIntegrante(profesorId: number, integrantes: IntegranteResumen[]): string | null {
  const actual = integrantes.find((i) => i.profesorId === profesorId);
  if (!actual) return "Esa persona ya no es integrante. Recarga la página.";
  const restantes = integrantes.filter((i) => i.profesorId !== profesorId);
  if (hayProdep(integrantes) && restantes.length > 0 && !hayProdep(restantes)) {
    return `No se puede quitar a ${actual.nombre}: el cuerpo académico se quedaría sin un integrante con PRODEP activo.`;
  }
  return null;
}

// Al editar, el profesor no choca consigo mismo. Solo se bloquea si el cambio quita el último PRODEP vigente.
export function revisarCambioIntegrante(
  profesorIdActual: number,
  profesorNuevo: ProfesorParaCa | undefined,
  integrantes: IntegranteResumen[],
): ProblemaIntegrante | null {
  const sinActual = integrantes.filter((i) => i.profesorId !== profesorIdActual);
  if (!profesorNuevo) {
    return { campo: "profesorId", mensaje: "Ese profesor ya no está en el directorio. Recarga la página." };
  }
  if (profesorNuevo.tipoContratacion !== "TIEMPO_COMPLETO") {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesorNuevo)} no es de tiempo completo. Elige a otra persona.`,
    };
  }
  if (profesorNuevo.estatusLaboral !== "ACTIVO") {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesorNuevo)} no está en estatus laboral activo. Elige a otra persona.`,
    };
  }
  if (sinActual.some((i) => i.profesorId === profesorNuevo.id)) {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesorNuevo)} ya es integrante de este cuerpo académico.`,
    };
  }
  const resultantes = [...sinActual, comoIntegrante(profesorNuevo)];
  if (pierdeProdepVigente(integrantes, resultantes)) {
    return { campo: "profesorId", mensaje: MENSAJE_PRODEP };
  }
  return null;
}

export function notaSiDejaDeSerLider(eraLider: boolean) {
  return eraLider
    ? " Ya no es líder de este cuerpo académico. Designar un líder único corresponde a RF-014."
    : "";
}
