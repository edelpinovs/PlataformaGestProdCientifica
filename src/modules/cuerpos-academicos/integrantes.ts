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

// I3 entregará `tiene_prodep_activo()`. Mientras, el CA usa la misma regla que el inicio:
// dictamen APROBADO y vigencia que cubre el día de hoy.
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

function sinProdepEn(integrantes: IntegranteResumen[]) {
  return integrantes.length > 0 && !integrantes.some((i) => i.prodepActivo);
}

const MENSAJE_PRODEP =
  "Al menos un integrante debe tener Perfil Deseable PRODEP activo.";

// RF-013 · CU-008: solo Tiempo Completo; no se duplica; el conjunto queda con PRODEP activo.
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
  if (integrantes.some((i) => i.profesorId === profesor.id)) {
    return {
      campo: "profesorId",
      mensaje: `${nombreProfesor(profesor)} ya es integrante de este cuerpo académico.`,
    };
  }
  const resultantes: IntegranteResumen[] = [
    ...integrantes,
    { profesorId: profesor.id, nombre: nombreProfesor(profesor), prodepActivo: profesor.prodepActivo },
  ];
  if (sinProdepEn(resultantes)) {
    return { campo: "profesorId", mensaje: MENSAJE_PRODEP };
  }
  return null;
}

// Quitar al último integrante deja el CA vacío (válido). Quitar al único con PRODEP, no.
export function revisarBajaIntegrante(profesorId: number, integrantes: IntegranteResumen[]): string | null {
  const actual = integrantes.find((i) => i.profesorId === profesorId);
  if (!actual) return "Esa persona ya no es integrante. Recarga la página.";
  const restantes = integrantes.filter((i) => i.profesorId !== profesorId);
  if (sinProdepEn(restantes)) {
    return `No se puede quitar a ${actual.nombre}: el cuerpo académico se quedaría sin un integrante con PRODEP activo.`;
  }
  return null;
}

// Al editar el vínculo, el profesor no choca consigo mismo y el conjunto sigue con PRODEP.
export function revisarCambioIntegrante(
  profesorIdActual: number,
  profesorNuevo: ProfesorParaCa | undefined,
  integrantes: IntegranteResumen[],
): ProblemaIntegrante | null {
  const sinActual = integrantes.filter((i) => i.profesorId !== profesorIdActual);
  return revisarAltaIntegrante(profesorNuevo, sinActual);
}
