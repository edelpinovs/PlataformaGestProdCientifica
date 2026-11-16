"use client";

import { useState } from "react";
import { Aviso, claseCampo, claseEtiqueta } from "@/components/ui";
import {
  calcularVigenciaProdep,
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
  type RegistroHistorialProdep,
} from "@/modules/reconocimientos/prodep";
import type { EstadoProdep } from "./actions";

export type ProfesorProdep = { id: number; codigo: string; nombres: string; apellidos: string };
export type HistorialConProfesor = RegistroHistorialProdep & { profesorId: number };
export type ValoresProdep = {
  profesorId: string;
  tipoSolicitud: string;
  resultado: string;
  fechaInicio: string;
  fechaFin: string;
};

const ETIQUETAS_TIPO: Record<(typeof TIPOS_SOLICITUD_PRODEP)[number], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

const ETIQUETAS_RESULTADO: Record<(typeof RESULTADOS_PRODEP)[number], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

function textoVigencia(duracion: 3 | 6, motivo: string) {
  if (duracion === 6) {
    return "El primer reconocimiento y la renovación previos están aprobados y sin brechas; a esta renovación aprobada se le aplican seis años.";
  }
  if (motivo === "primer-reconocimiento") return "Primer reconocimiento: se aplican tres años de vigencia.";
  if (motivo === "dictamen-pendiente") {
    return "Mientras el dictamen no esté aprobado, se aplican tres años; la renovación consolidada requiere aprobación.";
  }
  if (motivo === "dictamen-no-aprobado") {
    return "El dictamen no aprobado no otorga vigencia ni consolida renovaciones; el registro conserva el cálculo de tres años.";
  }
  return "No hay una secuencia consolidada de renovaciones aprobadas sin interrupciones: se aplican tres años.";
}

function esTipoSolicitud(valor: string): valor is (typeof TIPOS_SOLICITUD_PRODEP)[number] {
  return TIPOS_SOLICITUD_PRODEP.some((tipo) => tipo === valor);
}

function esResultado(valor: string): valor is (typeof RESULTADOS_PRODEP)[number] {
  return RESULTADOS_PRODEP.some((resultado) => resultado === valor);
}

function esFecha(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function FormularioProdepCampos({ profesores, historial, valores, estado, excluirId }: {
  profesores: ProfesorProdep[];
  historial: HistorialConProfesor[];
  valores?: Partial<ValoresProdep>;
  estado: EstadoProdep;
  excluirId?: number;
}) {
  const [profesorId, setProfesorId] = useState(valores?.profesorId ?? "");
  const [tipoSolicitud, setTipoSolicitud] = useState(valores?.tipoSolicitud ?? "");
  const [resultado, setResultado] = useState(valores?.resultado ?? "");
  const [fechaInicio, setFechaInicio] = useState(valores?.fechaInicio ?? "");
  const vigencia = esTipoSolicitud(tipoSolicitud) && esResultado(resultado) && esFecha(fechaInicio)
    ? calcularVigenciaProdep({
      tipoSolicitud,
      resultado,
      fechaInicio,
    }, historial.filter((registro) => registro.profesorId === Number(profesorId) && registro.id !== excluirId))
    : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={claseEtiqueta}>
          Profesor
          <select name="profesorId" required value={profesorId}
            onChange={(evento) => setProfesorId(evento.currentTarget.value)}
            aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
            <option value="" disabled>Selecciona un profesor</option>
            {profesores.map((profesor) => (
              <option key={profesor.id} value={profesor.id}>{profesor.apellidos}, {profesor.nombres} ({profesor.codigo})</option>
            ))}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Tipo de solicitud
          <select name="tipoSolicitud" required value={tipoSolicitud}
            onChange={(evento) => setTipoSolicitud(evento.currentTarget.value)}
            aria-invalid={estado.campo === "tipoSolicitud"} className={claseCampo(estado.campo === "tipoSolicitud")}>
            <option value="" disabled>Selecciona un tipo</option>
            {TIPOS_SOLICITUD_PRODEP.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETAS_TIPO[tipo]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Dictamen
          <select name="resultado" required value={resultado}
            onChange={(evento) => setResultado(evento.currentTarget.value)}
            aria-invalid={estado.campo === "resultado"} className={claseCampo(estado.campo === "resultado")}>
            <option value="" disabled>Selecciona un dictamen</option>
            {RESULTADOS_PRODEP.map((valor) => <option key={valor} value={valor}>{ETIQUETAS_RESULTADO[valor]}</option>)}
          </select>
        </label>
        <label className={claseEtiqueta}>
          Fecha de inicio
          <input type="date" name="fechaInicio" required value={fechaInicio}
            onChange={(evento) => setFechaInicio(evento.currentTarget.value)}
            aria-invalid={estado.campo === "fechaInicio"} className={claseCampo(estado.campo === "fechaInicio")} />
        </label>
        <label className={claseEtiqueta}>
          Fecha de fin calculada
          <input type="date" name="fechaFin" required readOnly value={vigencia?.fechaFin ?? ""}
            aria-invalid={estado.campo === "fechaFin"} className={claseCampo(estado.campo === "fechaFin")} />
        </label>
      </div>
      {vigencia && <p className="text-xs text-texto-3">{textoVigencia(vigencia.duracionAnios, vigencia.motivo)}</p>}
      {estado.campo === "fechaFin" && estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
    </>
  );
}
