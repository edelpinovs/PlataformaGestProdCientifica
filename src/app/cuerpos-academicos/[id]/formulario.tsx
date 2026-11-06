"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { agruparCandidatos } from "@/modules/cuerpos-academicos/integrantes";
import { asignarIntegrante, guardarLider, type EstadoIntegrante, type EstadoLider } from "./actions";

export type OpcionProfesor = { id: number; etiqueta: string; prodepActivo: boolean };

export function OpcionesProfesor({ candidatos }: { candidatos: OpcionProfesor[] }) {
  const { conProdep, sinProdep } = agruparCandidatos(candidatos);
  return (
    <>
      {conProdep.length > 0 && (
        <optgroup label="Con PRODEP activo">
          {conProdep.map((p) => (
            <option key={p.id} value={p.id}>{p.etiqueta}</option>
          ))}
        </optgroup>
      )}
      {sinProdep.length > 0 && (
        <optgroup label="Sin PRODEP vigente">
          {sinProdep.map((p) => (
            <option key={p.id} value={p.id}>{p.etiqueta}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}

export function FormularioIntegrante({
  cuerpoId,
  candidatos,
  avisoInicial,
}: {
  cuerpoId: number;
  candidatos: OpcionProfesor[];
  avisoInicial?: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoIntegrante, FormData>(asignarIntegrante, {});

  return (
    <form key={estado.asignado ?? estado.error ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="cuerpoId" value={cuerpoId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className={`${claseEtiqueta} flex-1`}>
          Profesor de tiempo completo
          <select name="profesorId" required defaultValue={estado.valores?.profesorId ?? ""}
            aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
            <option value="" disabled>Elige un profesor</option>
            <OpcionesProfesor candidatos={candidatos} />
          </select>
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Asignando…" : "Asignar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {!estado.error && avisoInicial && <Aviso tipo="aviso">{avisoInicial}</Aviso>}
      {estado.asignado && (
        <Aviso tipo="exito">Se asignó a {estado.asignado} como integrante.</Aviso>
      )}
    </form>
  );
}

export function FormularioLider({
  cuerpoId,
  integrantes,
  liderId,
}: {
  cuerpoId: number;
  integrantes: { profesorId: number; nombre: string }[];
  liderId: number | null;
}) {
  const [estado, accion, enviando] = useActionState<EstadoLider, FormData>(guardarLider, {});
  const valor = estado.valores?.profesorId ?? (liderId ? String(liderId) : "");

  return (
    <form key={estado.designado ?? estado.error ?? "lider"} action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="cuerpoId" value={cuerpoId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className={`${claseEtiqueta} flex-1`}>
          Integrante líder
          <select name="profesorId" required defaultValue={valor}
            aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
            <option value="" disabled>Elige un integrante</option>
            {integrantes.map((i) => (
              <option key={i.profesorId} value={i.profesorId}>{i.nombre}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Guardando…" : "Designar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.designado && <Aviso tipo="exito">{estado.designado}</Aviso>}
    </form>
  );
}
