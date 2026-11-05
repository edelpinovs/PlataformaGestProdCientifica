"use client";

import { claseCampo, claseEtiqueta } from "@/components/ui";
import { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "@/modules/reconocimientos/snii";
import type { EstadoSnii } from "./actions";

export type ProfesorOpcion = { id: number; codigo: string; nombres: string; apellidos: string; cvu: string | null };
export type ValoresSnii = {
  profesorId: string;
  cvu: string;
  nivel: string;
  tipoParticipacion: string;
  fechaInicio: string;
  fechaFin: string;
  enRecursoReconsideracion: boolean;
};

const ETIQUETAS_NIVEL: Record<(typeof NIVELES_SNII)[number], string> = {
  CANDIDATO: "Candidato", NIVEL_1: "Nivel 1", NIVEL_2: "Nivel 2", NIVEL_3: "Nivel 3", EMERITO: "Emérito", NO_APROBADO: "No aprobado",
};
const ETIQUETAS_PARTICIPACION: Record<(typeof TIPOS_PARTICIPACION_SNII)[number], string> = {
  NUEVO_INGRESO: "Nuevo ingreso", RENOVACION: "Renovación", REINGRESO_NO_VIGENTE: "Reingreso no vigente",
};

export function FormularioSniiCampos({ profesores, valores, estado }: {
  profesores: ProfesorOpcion[];
  valores?: Partial<ValoresSnii>;
  estado: EstadoSnii;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Profesor
          <select name="profesorId" required defaultValue={valores?.profesorId ?? ""}
            aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
            <option value="" disabled>Selecciona un profesor</option>
            {profesores.map((profesor) => <option key={profesor.id} value={profesor.id}>{profesor.apellidos}, {profesor.nombres} ({profesor.codigo})</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          CVU de CONAHCYT / SECIHTI
          <input name="cvu" required maxLength={30} autoComplete="off" defaultValue={valores?.cvu}
            aria-invalid={estado.campo === "cvu"} className={claseCampo(estado.campo === "cvu")} />
        </label>
        <label className={claseEtiqueta}>
          Nivel otorgado
          <select name="nivel" required defaultValue={valores?.nivel ?? ""}
            aria-invalid={estado.campo === "nivel"} className={claseCampo(estado.campo === "nivel")}>
            <option value="" disabled>Selecciona un nivel</option>
            {NIVELES_SNII.map((nivel) => <option key={nivel} value={nivel}>{ETIQUETAS_NIVEL[nivel]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Tipo de participación
          <select name="tipoParticipacion" required defaultValue={valores?.tipoParticipacion ?? ""}
            aria-invalid={estado.campo === "tipoParticipacion"} className={claseCampo(estado.campo === "tipoParticipacion")}>
            <option value="" disabled>Selecciona un tipo</option>
            {TIPOS_PARTICIPACION_SNII.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETAS_PARTICIPACION[tipo]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Fecha de inicio
          <input type="date" name="fechaInicio" required defaultValue={valores?.fechaInicio}
            aria-invalid={estado.campo === "fechaInicio"} className={claseCampo(estado.campo === "fechaInicio")} />
        </label>
        <label className={claseEtiqueta}>
          Fecha de fin
          <input type="date" name="fechaFin" required defaultValue={valores?.fechaFin}
            aria-invalid={estado.campo === "fechaFin"} className={claseCampo(estado.campo === "fechaFin")} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-texto-2">
        <input type="checkbox" name="enRecursoReconsideracion" defaultChecked={valores?.enRecursoReconsideracion}
          aria-invalid={estado.campo === "enRecursoReconsideracion"} className="accent-marca" />
        En recurso de reconsideración
      </label>
    </>
  );
}