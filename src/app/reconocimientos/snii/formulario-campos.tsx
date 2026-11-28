"use client";

import { useState } from "react";
import { Aviso, claseCampo, claseEtiqueta } from "@/components/ui";
import { SelectorProfesor } from "@/components/selector-profesor";
import { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "@/modules/reconocimientos/snii";
import type { EstadoSnii } from "./actions";

export type ProfesorOpcion = { id: number; codigo: string; nombres: string; apellidos: string; cvu: string | null };
export type ValoresSnii = {
  profesorId: string;
  cvu: string;
  confirmarCambioCvu?: boolean;
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

export function FormularioSniiCampos({ profesores, estado, valores, valor, marcarCambios }: {
  profesores: ProfesorOpcion[];
  estado: EstadoSnii;
  valores?: Partial<ValoresSnii>;
  valor?: (nombre: string, inicial?: string) => string;
  marcarCambios?: () => void;
}) {
  const obtenerValor = (nombre: string, inicial = "") => {
    if (valor) return valor(nombre, inicial);
    const contenido = valores?.[nombre as keyof ValoresSnii];
    if (typeof contenido === "boolean") return contenido ? "on" : "";
    return typeof contenido === "string" ? contenido : inicial;
  };
  const profesorIdInicial = obtenerValor("profesorId");
  const [profesorId, setProfesorId] = useState(profesorIdInicial);
  const cvuInicial = obtenerValor("cvu", profesorIdInicial
    ? profesores.find((profesor) => String(profesor.id) === profesorIdInicial)?.cvu ?? ""
    : "");
  const [cvu, setCvu] = useState(cvuInicial);
  const [confirmarCambioCvu, setConfirmarCambioCvu] = useState(obtenerValor("confirmarCambioCvu") === "on");
  const profesorSeleccionado = profesores.find((profesor) => String(profesor.id) === profesorId);
  const requiereConfirmacion = Boolean(profesorSeleccionado?.cvu && profesorSeleccionado.cvu !== cvu.trim());

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SelectorProfesor
            opciones={profesores}
            etiqueta="Profesor"
            valorInicial={profesorId ? Number(profesorId) : undefined}
            alSeleccionar={(id) => {
              const nuevoProfesorId = id ? String(id) : "";
              const nuevoProfesor = profesores.find((profesor) => profesor.id === id);
              setProfesorId(nuevoProfesorId);
              setCvu(nuevoProfesor?.cvu ?? "");
              setConfirmarCambioCvu(false);
              marcarCambios?.();
            }}
            error={estado.campo === "profesorId" ? estado.error : undefined}
          />
        </div>
        <label className={claseEtiqueta}>
          CVU de CONAHCYT / SECIHTI
          <input name="cvu" required maxLength={30} inputMode="numeric" pattern="[0-9]+" autoComplete="off" value={cvu}
            onChange={(evento) => {
              setCvu(evento.currentTarget.value);
              setConfirmarCambioCvu(false);
              marcarCambios?.();
            }}
            aria-invalid={estado.campo === "cvu"} className={claseCampo(estado.campo === "cvu")} />
        </label>
        {requiereConfirmacion && profesorSeleccionado && (
          <div className="sm:col-span-2">
            <Aviso tipo="aviso">El profesor ya tiene el CVU {profesorSeleccionado.cvu}. Confirma antes de reemplazarlo.</Aviso>
            <label className="mt-2 flex items-center gap-2 text-sm text-texto-2">
              <input type="checkbox" name="confirmarCambioCvu" required checked={confirmarCambioCvu}
                onChange={(evento) => setConfirmarCambioCvu(evento.currentTarget.checked)} className="accent-marca" />
              Confirmo reemplazar el CVU actual por el nuevo.
            </label>
          </div>
        )}
        <label className={claseEtiqueta}>
          Nivel otorgado
          <select name="nivel" required defaultValue={obtenerValor("nivel")}
            aria-invalid={estado.campo === "nivel"} className={claseCampo(estado.campo === "nivel")}>
            <option value="" disabled>Selecciona un nivel</option>
            {NIVELES_SNII.map((nivel) => <option key={nivel} value={nivel}>{ETIQUETAS_NIVEL[nivel]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Tipo de participación
          <select name="tipoParticipacion" required defaultValue={obtenerValor("tipoParticipacion")}
            aria-invalid={estado.campo === "tipoParticipacion"} className={claseCampo(estado.campo === "tipoParticipacion")}>
            <option value="" disabled>Selecciona un tipo</option>
            {TIPOS_PARTICIPACION_SNII.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETAS_PARTICIPACION[tipo]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Fecha de inicio
          <input type="date" name="fechaInicio" required defaultValue={obtenerValor("fechaInicio")}
            aria-invalid={estado.campo === "fechaInicio"} className={claseCampo(estado.campo === "fechaInicio")} />
        </label>
        <label className={claseEtiqueta}>
          Fecha de fin
          <input type="date" name="fechaFin" required defaultValue={obtenerValor("fechaFin")}
            aria-invalid={estado.campo === "fechaFin"} className={claseCampo(estado.campo === "fechaFin")} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-texto-2">
        <input type="checkbox" name="enRecursoReconsideracion" defaultChecked={obtenerValor("enRecursoReconsideracion") === "true" || obtenerValor("enRecursoReconsideracion") === "on"}
          aria-invalid={estado.campo === "enRecursoReconsideracion"} className="accent-marca" />
        En recurso de reconsideración
      </label>
    </>
  );
}
