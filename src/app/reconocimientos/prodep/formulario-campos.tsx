"use client";

import { claseCampo, claseEtiqueta } from "@/components/ui";
import {
  ETIQUETAS_RESULTADO_PRODEP,
  ETIQUETAS_TIPO_SOLICITUD_PRODEP,
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import type { EstadoProdep } from "./actions";

export type ProfesorProdep = {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  tipoContratacion: "TIEMPO_COMPLETO" | "ASIGNATURA";
};

export type ValoresProdep = {
  profesorId: string;
  tipoSolicitud: string;
  resultado: string;
  fechaInicio: string;
  fechaFin: string;
};

export function FormularioProdepCampos({ profesores, valores, estado }: {
  profesores: ProfesorProdep[];
  valores?: Partial<ValoresProdep>;
  estado: EstadoProdep;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${claseEtiqueta} min-w-0`}>
        Profesor de Tiempo Completo
        <select name="profesorId" required defaultValue={valores?.profesorId ?? ""}
          aria-invalid={estado.campo === "profesorId"}
          className={`${claseCampo(estado.campo === "profesorId")} min-w-0 w-full`}>
          <option value="" disabled>Selecciona un profesor</option>
          {profesores.map((profesor) => (
            <option key={profesor.id} value={profesor.id}>
              {profesor.apellidos}, {profesor.nombres} ({profesor.codigo})
              {profesor.tipoContratacion === "ASIGNATURA" ? " · Asignatura" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className={`${claseEtiqueta} min-w-0`}>
        Tipo de solicitud
        <select name="tipoSolicitud" required defaultValue={valores?.tipoSolicitud ?? ""}
          aria-invalid={estado.campo === "tipoSolicitud"}
          className={`${claseCampo(estado.campo === "tipoSolicitud")} min-w-0 w-full`}>
          <option value="" disabled>Selecciona un tipo</option>
          {TIPOS_SOLICITUD_PRODEP.map((tipo) => (
            <option key={tipo} value={tipo}>{ETIQUETAS_TIPO_SOLICITUD_PRODEP[tipo]}</option>
          ))}
        </select>
      </label>
      <label className={`${claseEtiqueta} min-w-0`}>
        Resultado
        <select name="resultado" required defaultValue={valores?.resultado ?? ""}
          aria-invalid={estado.campo === "resultado"}
          className={`${claseCampo(estado.campo === "resultado")} min-w-0 w-full`}>
          <option value="" disabled>Selecciona un resultado</option>
          {RESULTADOS_PRODEP.map((resultado) => (
            <option key={resultado} value={resultado}>{ETIQUETAS_RESULTADO_PRODEP[resultado]}</option>
          ))}
        </select>
      </label>
      <label className={`${claseEtiqueta} min-w-0`}>
        Inicio de vigencia
        <input type="date" name="fechaInicio" required defaultValue={valores?.fechaInicio}
          aria-invalid={estado.campo === "fechaInicio"}
          className={`${claseCampo(estado.campo === "fechaInicio")} min-w-0 w-full`} />
      </label>
      <label className={`${claseEtiqueta} min-w-0`}>
        Fin de vigencia
        <input type="date" name="fechaFin" required defaultValue={valores?.fechaFin}
          aria-invalid={estado.campo === "fechaFin"}
          className={`${claseCampo(estado.campo === "fechaFin")} min-w-0 w-full`} />
      </label>
    </div>
  );
}
