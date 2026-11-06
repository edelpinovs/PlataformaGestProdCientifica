"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionFila,
  claseBoton,
  claseBotonPeligro,
  claseBotonSecundario,
  claseCampo,
  claseEtiqueta,
  claseTabla,
  EtiquetaEstado,
} from "@/components/ui";
import { cambiarIntegrante, quitarIntegrante, type EstadoFilaIntegrante } from "./actions";
import { OpcionesProfesor, type OpcionProfesor } from "./formulario";

type Integrante = {
  profesorId: number;
  nombre: string;
  codigo: string;
  prodepActivo: boolean;
};

const COLUMNAS = 4;

export function FilaIntegrante({
  cuerpoId,
  integrante,
  esLider,
  candidatos,
}: {
  cuerpoId: number;
  integrante: Integrante;
  esLider: boolean;
  candidatos: OpcionProfesor[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const cerrar = () => setModo("ver");
  const opciones = [
    { id: integrante.profesorId, etiqueta: integrante.nombre, prodepActivo: integrante.prodepActivo },
    ...candidatos,
  ];

  if (modo === "editar") {
    return <Edicion cuerpoId={cuerpoId} integrante={integrante} opciones={opciones} cerrar={cerrar} />;
  }
  if (modo === "eliminar") {
    return <Confirmacion cuerpoId={cuerpoId} integrante={integrante} cerrar={cerrar} />;
  }

  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span>{integrante.nombre}</span>
          {esLider && <EtiquetaEstado tipo="exito">Líder</EtiquetaEstado>}
        </div>
      </td>
      <td className={`${claseTabla.celda} font-mono`}>{integrante.codigo}</td>
      <td className={claseTabla.celda}>
        {integrante.prodepActivo ? (
          <EtiquetaEstado tipo="exito">PRODEP activo</EtiquetaEstado>
        ) : (
          <span className="text-texto-3">Sin PRODEP vigente</span>
        )}
      </td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
          aria-label={`Editar integrante ${integrante.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
          aria-label={`Quitar integrante ${integrante.nombre}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function Edicion({
  cuerpoId,
  integrante,
  opciones,
  cerrar,
}: {
  cuerpoId: number;
  integrante: Integrante;
  opciones: OpcionProfesor[];
  cerrar: () => void;
}) {
  const [estado, editar, guardando] = useActionState<EstadoFilaIntegrante, FormData>(cambiarIntegrante, {});
  const valor = estado.valores?.profesorId ?? String(integrante.profesorId);

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={editar} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={integrante.profesorId} />
          <input type="hidden" name="cuerpoId" value={cuerpoId} />
          <label className={claseEtiqueta}>
            Profesor de tiempo completo
            <select name="profesorId" required defaultValue={valor} autoFocus
              aria-invalid={estado.campo === "profesorId"} className={claseCampo(estado.campo === "profesorId")}>
              <OpcionesProfesor candidatos={opciones} />
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={claseBoton}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
          </div>
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        </form>
      </td>
    </tr>
  );
}

function Confirmacion({
  cuerpoId,
  integrante,
  cerrar,
}: {
  cuerpoId: number;
  integrante: Integrante;
  cerrar: () => void;
}) {
  const [estado, eliminar, eliminando] = useActionState<EstadoFilaIntegrante, FormData>(quitarIntegrante, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={eliminar} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={integrante.profesorId} />
          <input type="hidden" name="cuerpoId" value={cuerpoId} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Quitar a <strong>{integrante.nombre}</strong> de este cuerpo académico?
            </p>
          )}
          <div className="flex gap-2">
            {!estado.error && (
              <button type="submit" disabled={eliminando} className={claseBotonPeligro}>
                {eliminando ? "Quitando…" : "Eliminar"}
              </button>
            )}
            <button type="button" onClick={cerrar} className={claseBotonSecundario} autoFocus>
              {estado.error ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
