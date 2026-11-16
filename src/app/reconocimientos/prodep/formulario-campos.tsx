"use client";

import { Aviso, claseCampo, claseEtiqueta } from "@/components/ui";
import { RESULTADOS_PRODEP, TIPOS_SOLICITUD_PRODEP } from "@/modules/reconocimientos/prodep";
import type { EstadoProdep } from "./actions";

export type ProfesorProdep = { id: number; codigo: string; nombres: string; apellidos: string };
export type ValoresProdep = {
  profesorId: string;
  tipoSolicitud: string;
  resultado: string;
  fechaInicio: string;
  fechaFin: string;
};

const ETIQUETAS_SOLICITUD: Record<(typeof TIPOS_SOLICITUD_PRODEP)[number], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};
const ETIQUETAS_RESULTADO: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export function FormularioProdepCampos({ profesores, valores, estado }: {
  profesores: ProfesorProdep[];
  valores?: Partial<ValoresProdep>;
  estado: EstadoProdep;
}) {
  const errorFechas = estado.campo === "fechas";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={claseEtiqueta}>
        Profesor
        <select name="profesorId" required defaultValue={valores?.profesorId ?? ""}
          aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
          <option value="" disabled>Selecciona un profesor</option>
          {profesores.map((profesor) => (
            <option key={profesor.id} value={profesor.id}>
              {profesor.apellidos}, {profesor.nombres} ({profesor.codigo})
            </option>
          ))}
        </select>
      </label>
      <label className={claseEtiqueta}>
        Tipo de solicitud
        <select name="tipoSolicitud" required defaultValue={valores?.tipoSolicitud ?? ""}
          aria-invalid={estado.campo === "tipoSolicitud"} className={claseCampo(estado.campo === "tipoSolicitud")}>
          <option value="" disabled>Selecciona un tipo</option>
          {TIPOS_SOLICITUD_PRODEP.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETAS_SOLICITUD[tipo]}</option>)}
        </select>
      </label>
      <label className={claseEtiqueta}>
        Resultado del dictamen
        <select name="resultado" required defaultValue={valores?.resultado ?? ""}
          aria-invalid={estado.campo === "resultado"} className={claseCampo(estado.campo === "resultado")}>
          <option value="" disabled>Selecciona un resultado</option>
          {RESULTADOS_PRODEP.map((resultado) => (
            <option key={resultado} value={resultado}>{ETIQUETAS_RESULTADO[resultado]}</option>
          ))}
        </select>
      </label>
      <label className={claseEtiqueta}>
        Fecha de inicio
        <input type="date" name="fechaInicio" required defaultValue={valores?.fechaInicio}
          aria-invalid={errorFechas || estado.campo === "fechaInicio"}
          className={claseCampo(errorFechas || estado.campo === "fechaInicio")} />
      </label>
      <label className={claseEtiqueta}>
        Fecha de fin
        <input type="date" name="fechaFin" required defaultValue={valores?.fechaFin}
          aria-invalid={errorFechas || estado.campo === "fechaFin"}
          className={claseCampo(errorFechas || estado.campo === "fechaFin")} />
      </label>
      {estado.error && estado.campo === "fechas" && (
        <div className="sm:col-span-2"><Aviso tipo="error">{estado.error}</Aviso></div>
      )}
    </div>
  );
}
