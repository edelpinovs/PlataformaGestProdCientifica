import { z } from "zod";
import { cantidad, enumerar, idDeFormulario, limpiar, normalizar } from "../catalogos/comun";

export { idDeFormulario };

const idCatalogoInvalido = "Elige una opción de la lista o recarga la página.";

// Nombre o apellido de persona: letras (con acentos), espacios, apóstrofos y guiones.
const nombrePersona = (campo: { obligatorio: string; etiqueta: string }) =>
  z
    .string()
    .transform((s) => {
      const limpio = limpiar(s);
      return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    })
    .pipe(
      z
        .string()
        .min(1, campo.obligatorio)
        .min(2, `${campo.etiqueta} debe tener al menos 2 caracteres.`)
        .max(150, `${campo.etiqueta} admite como máximo 150 caracteres.`)
        .regex(/^\p{L}[\p{L} .'-]*$/u, `${campo.etiqueta} solo admite letras, espacios, apóstrofos y guiones.`),
    );

const codigoProfesor = z
  .string()
  .transform((s) => limpiar(s).toUpperCase())
  .pipe(
    z
      .string()
      .min(1, "El código institucional es obligatorio.")
      .max(20, "El código admite como máximo 20 caracteres.")
      .regex(/^[A-Z0-9]+$/, "El código solo debe contener letras y números, sin espacios."),
  );

// Select opcional: vacío → ausente; cualquier otro valor debe ser un id entero positivo.
const idOpcional = z
  .string()
  .optional()
  .transform((s) => (s ?? "").trim())
  .pipe(z.string().refine((s) => s === "" || /^[1-9]\d*$/.test(s), idCatalogoInvalido))
  .transform((s) => (s === "" ? undefined : Number(s)));

const textoOpcional = (max: number, mensaje: string) =>
  z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? limpiar(s) : undefined),
    z.string().max(max, mensaje).optional(),
  );

// RF-004: campos obligatorios para registrar un profesor investigador.
export const registrarProfesor = z.object({
  codigo: codigoProfesor,
  nombres: nombrePersona({ obligatorio: "El nombre es obligatorio.", etiqueta: "El nombre" }),
  apellidos: nombrePersona({ obligatorio: "Los apellidos son obligatorios.", etiqueta: "Los apellidos" }),
  correo: z
    .string()
    .transform((s) => limpiar(s).toLowerCase())
    .pipe(z.string().min(1, "El correo es obligatorio.").email("El correo no tiene un formato válido.")),
  genero: z.enum(["M", "F"], { error: "Selecciona un género." }),
  tipoContratacion: z.enum(["TIEMPO_COMPLETO", "ASIGNATURA"], {
    error: "Selecciona el tipo de contratación.",
  }),
  estatusLaboral: z
    .enum(["ACTIVO", "LICENCIA", "BAJA_TEMPORAL", "BAJA_POSDOCTORAL", "TRASLADADO"])
    .default("ACTIVO"),
  departamentoId: idOpcional,
  gradoId: idOpcional,
  cvu: textoOpcional(20, "El CVU admite hasta 20 caracteres."),
  orcid: z.preprocess(
    (s) => (typeof s === "string" && s.trim() !== "" ? limpiar(s).toUpperCase() : undefined),
    z
      .string()
      .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "El ORCID debe tener el formato 0000-0000-0000-0000.")
      .optional(),
  ),
  scholarId: textoOpcional(50, "El Scholar ID admite hasta 50 caracteres."),
  scopusId: textoOpcional(20, "El Scopus ID admite hasta 20 caracteres."),
});

export type RegistrarProfesor = z.infer<typeof registrarProfesor>;

export type DuplicadoProfesor = {
  campo: "codigo" | "correo" | "orcid" | "scholarId" | "scopusId" | "cvu";
  mensaje: string;
};

export type ExistenteProfesor = {
  id?: number;
  codigo: string;
  correo: string;
  orcid?: string | null;
  scholarId?: string | null;
  scopusId?: string | null;
  cvu?: string | null;
};

// RF-004: código, correo e identificadores no deben existir previamente.
// Al editar (#59) se pasa `idPropio`, para que el profesor no choque consigo mismo.
export function buscarDuplicadoProfesor(
  nuevo: RegistrarProfesor,
  existentes: ExistenteProfesor[],
  idPropio?: number,
): DuplicadoProfesor | null {
  const otros = idPropio === undefined ? existentes : existentes.filter((p) => p.id !== idPropio);

  const porCodigo = otros.find((p) => p.codigo === nuevo.codigo);
  if (porCodigo) {
    return { campo: "codigo", mensaje: `Ya existe un profesor con el código «${porCodigo.codigo}».` };
  }

  const porCorreo = otros.find((p) => normalizar(p.correo) === normalizar(nuevo.correo));
  if (porCorreo) {
    return { campo: "correo", mensaje: `El correo «${porCorreo.correo}» ya está registrado.` };
  }

  if (nuevo.orcid) {
    const porOrcid = otros.find((p) => p.orcid && p.orcid.toUpperCase() === nuevo.orcid);
    if (porOrcid) {
      return { campo: "orcid", mensaje: `El ORCID «${nuevo.orcid}» ya está registrado.` };
    }
  }

  if (nuevo.scholarId) {
    const porScholar = otros.find((p) => p.scholarId === nuevo.scholarId);
    if (porScholar) {
      return { campo: "scholarId", mensaje: `El Scholar ID «${nuevo.scholarId}» ya está registrado.` };
    }
  }

  if (nuevo.scopusId) {
    const porScopus = otros.find((p) => p.scopusId === nuevo.scopusId);
    if (porScopus) {
      return { campo: "scopusId", mensaje: `El Scopus ID «${nuevo.scopusId}» ya está registrado.` };
    }
  }

  if (nuevo.cvu) {
    const porCvu = otros.find((p) => p.cvu === nuevo.cvu);
    if (porCvu) {
      return { campo: "cvu", mensaje: `El CVU «${nuevo.cvu}» ya está registrado.` };
    }
  }

  return null;
}

/** Genera el nombre normalizado para cruce de listados (RF-018). */
export function generarNombreNormalizado(nombres: string, apellidos: string): string {
  return normalizar(`${apellidos} ${nombres}`);
}

export function datosProfesor(datos: RegistrarProfesor) {
  const { departamentoId, gradoId, cvu, orcid, scholarId, scopusId, ...resto } = datos;
  return {
    ...resto,
    nombreNormalizado: generarNombreNormalizado(datos.nombres, datos.apellidos),
    departamentoId: departamentoId ?? null,
    gradoId: gradoId ?? null,
    cvu: cvu ?? null,
    orcid: orcid ?? null,
    scholarId: scholarId ?? null,
    scopusId: scopusId ?? null,
  };
}

export type UsoProfesor = {
  perfil: number;
  reconocimientos: number;
  cuerpos: number;
  liderazgos: number;
  lgacs: number;
  participaciones: number;
  autorias: number;
  cortes: number;
  programas: number;
};

// #59: un profesor con perfil, reconocimientos, producción u otras relaciones no se elimina.
export function motivoProfesorNoEliminable(nombre: string, uso: UsoProfesor): string | null {
  const partes = [
    uso.perfil > 0 ? "un perfil de acceso" : null,
    uso.reconocimientos > 0 ? cantidad(uso.reconocimientos, "reconocimiento", "reconocimientos") : null,
    uso.cuerpos > 0 ? cantidad(uso.cuerpos, "cuerpo académico", "cuerpos académicos") : null,
    uso.liderazgos > 0 ? cantidad(uso.liderazgos, "cuerpo que lidera", "cuerpos que lidera") : null,
    uso.lgacs > 0 ? cantidad(uso.lgacs, "LGAC", "LGAC") : null,
    uso.participaciones > 0 ? cantidad(uso.participaciones, "participación en convocatoria", "participaciones en convocatorias") : null,
    uso.autorias > 0 ? cantidad(uso.autorias, "autoría", "autorías") : null,
    uso.cortes > 0 ? cantidad(uso.cortes, "corte de escaneo", "cortes de escaneo") : null,
    uso.programas > 0 ? cantidad(uso.programas, "programa educativo", "programas educativos") : null,
  ].filter((p): p is string => p !== null);
  if (partes.length === 0) return null;
  return `No se puede eliminar a «${nombre}»: tiene ${enumerar(partes)}. Quita esas relaciones antes de eliminarlo.`;
}
