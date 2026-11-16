"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionFila,
  claseBotonPeligro,
  claseBotonSecundario,
  EtiquetaEstado,
} from "@/components/ui";
import { eliminarReconocimientoProdep, type EstadoProdep } from "./actions";
import { FormularioEdicionProdep } from "./formulario-edicion";
import type { ProfesorProdep } from "./formulario-campos";

export type ReconocimientoListadoProdep = {
  id: number;
  tipoSolicitud: "PRIMER_RECONOCIMIENTO" | "RENOVACION";
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
  inicio: Date;
  fin: Date;
  convocatoriaId: number | null;
  profesor: ProfesorProdep;
};

const ETIQUETAS_SOLICITUD = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};
const ETIQUETAS_RESULTADO = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export function FilaProdep({ reconocimiento, profesores }: {
  reconocimiento: ReconocimientoListadoProdep;
  profesores: ProfesorProdep[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  if (modo === "editar") {
    return (
      <FormularioEdicionProdep
        reconocimiento={{
          id: reconocimiento.id,
          profesorId: String(reconocimiento.profesor.id),
          tipoSolicitud: reconocimiento.tipoSolicitud,
          resultado: reconocimiento.resultado,
          fechaInicio: reconocimiento.inicio.toISOString().slice(0, 10),
          fechaFin: reconocimiento.fin.toISOString().slice(0, 10),
        }}
        profesores={profesores}
        cerrar={() => setModo("ver")}
      />
    );
  }
  if (modo === "eliminar") {
    return <ConfirmarEliminacionProdep reconocimiento={reconocimiento} cerrar={() => setModo("ver")} />;
  }

  const tipoEstado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "aviso"
    : reconocimiento.resultado === "NO_APROBADO" ? "error" : "exito";

  return (
    <tr className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-linea py-4 last:border-0 sm:table-row">
      <td className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:table-cell sm:py-3 sm:pr-3">
        <span className="text-xs text-texto-3 sm:hidden">Profesor</span>
        <span className="min-w-0 break-words font-medium">
          {persona}<span className="block text-xs font-normal text-texto-3">{reconocimiento.profesor.codigo}</span>
        </span>
      </td>
      <td className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:table-cell sm:py-3 sm:pr-3">
        <span className="text-xs text-texto-3 sm:hidden">Solicitud</span>
        <span>{ETIQUETAS_SOLICITUD[reconocimiento.tipoSolicitud]}</span>
      </td>
      <td className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:table-cell sm:py-3 sm:pr-3">
        <span className="text-xs text-texto-3 sm:hidden">Resultado</span>
        <EtiquetaEstado tipo={tipoEstado}>{ETIQUETAS_RESULTADO[reconocimiento.resultado]}</EtiquetaEstado>
      </td>
      <td className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:table-cell sm:py-3 sm:pr-3">
        <span className="text-xs text-texto-3 sm:hidden">Inicio</span>
        <time dateTime={reconocimiento.inicio.toISOString().slice(0, 10)}>{reconocimiento.inicio.toISOString().slice(0, 10)}</time>
      </td>
      <td className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:table-cell sm:py-3 sm:pr-3">
        <span className="text-xs text-texto-3 sm:hidden">Fin</span>
        <time dateTime={reconocimiento.fin.toISOString().slice(0, 10)}>{reconocimiento.fin.toISOString().slice(0, 10)}</time>
      </td>
      <td className="col-span-2 flex justify-end gap-1 sm:table-cell sm:py-3 sm:pr-0 sm:text-right">
        {reconocimiento.convocatoriaId === null ? (
          <>
            <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
              aria-label={`Editar reconocimiento PRODEP de ${persona}`}>Editar</button>
            <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
              aria-label={`Eliminar reconocimiento PRODEP de ${persona}`}>Eliminar</button>
          </>
        ) : <span className="text-xs text-texto-3">Resultado oficial</span>}
      </td>
    </tr>
  );
}

function ConfirmarEliminacionProdep({ reconocimiento, cerrar }: {
  reconocimiento: ReconocimientoListadoProdep;
  cerrar: () => void;
}) {
  const [estado, accion, eliminando] = useActionState<EstadoProdep, FormData>(eliminarReconocimientoProdep, {});
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;
  return (
    <tr className="border-b border-linea last:border-0">
      <td colSpan={6} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={reconocimiento.id} />
          {estado.error
            ? <Aviso tipo="error">{estado.error}</Aviso>
            : <p className="text-sm text-texto">¿Eliminar el reconocimiento PRODEP de <strong>{persona}</strong>? Esta acción no se puede deshacer.</p>}
          <div className="flex gap-2">
            {!estado.error && (
              <button type="submit" disabled={eliminando} className={claseBotonPeligro}>
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            )}
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>
              {estado.error ? "Cerrar" : "Cancelar"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
