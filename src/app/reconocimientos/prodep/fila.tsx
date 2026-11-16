"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionFila,
  claseBotonPeligro,
  claseBotonSecundario,
  EtiquetaEstado,
} from "@/components/ui";
import {
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { eliminarReconocimientoProdep, type EstadoProdep } from "./actions";
import { FormularioEdicionProdep } from "./formulario-edicion";
import type {
  HistorialConProfesor,
  ProfesorProdep,
} from "./formulario-campos";

type ReconocimientoListado = {
  id: number;
  tipoSolicitud: (typeof TIPOS_SOLICITUD_PRODEP)[number];
  resultado: (typeof RESULTADOS_PRODEP)[number];
  inicio: Date;
  fin: Date;
  convocatoriaId: number | null;
  profesor: ProfesorProdep;
};

const ETIQUETAS_TIPO: Record<ReconocimientoListado["tipoSolicitud"], string> = {
  PRIMER_RECONOCIMIENTO: "Primer reconocimiento",
  RENOVACION: "Renovación",
};

const ETIQUETAS_RESULTADO: Record<ReconocimientoListado["resultado"], string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
  EN_RECONSIDERACION: "En reconsideración",
};

export function FilaProdep({ reconocimiento, profesores, historial }: {
  reconocimiento: ReconocimientoListado;
  profesores: ProfesorProdep[];
  historial: HistorialConProfesor[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  if (modo === "editar") {
    return (
      <FormularioEdicionProdep reconocimiento={reconocimiento} profesores={profesores} historial={historial}
        cerrar={() => setModo("ver")} />
    );
  }
  if (modo === "eliminar") {
    return <ConfirmarEliminacion reconocimiento={reconocimiento} cerrar={() => setModo("ver")} />;
  }

  const tipoEstado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "aviso"
    : reconocimiento.resultado === "NO_APROBADO" ? "error" : "exito";

  return (
    <tr>
      <td className="max-w-0 break-words">
        <p className="text-sm font-medium">{persona}</p>
        <p className="text-xs text-texto-3">{reconocimiento.profesor.codigo}</p>
        <p className="text-xs text-texto-3 sm:hidden">
          {ETIQUETAS_TIPO[reconocimiento.tipoSolicitud]} · {reconocimiento.inicio.toISOString().slice(0, 10)} al{" "}
          {reconocimiento.fin.toISOString().slice(0, 10)} · {ETIQUETAS_RESULTADO[reconocimiento.resultado]}
        </p>
      </td>
      <td className="hidden break-words text-sm sm:table-cell">{ETIQUETAS_TIPO[reconocimiento.tipoSolicitud]}</td>
      <td className="hidden text-sm sm:table-cell">{reconocimiento.inicio.toISOString().slice(0, 10)}</td>
      <td className="hidden text-sm sm:table-cell">{reconocimiento.fin.toISOString().slice(0, 10)}</td>
      <td className="hidden sm:table-cell">
        <EtiquetaEstado tipo={tipoEstado}>{ETIQUETAS_RESULTADO[reconocimiento.resultado]}</EtiquetaEstado>
      </td>
      <td className="text-right">
        {reconocimiento.convocatoriaId === null ? (
          <div className="flex flex-wrap justify-end gap-1">
            <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
              aria-label={`Editar reconocimiento PRODEP de ${persona}`}>Editar</button>
            <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
              aria-label={`Eliminar reconocimiento PRODEP de ${persona}`}>Eliminar</button>
          </div>
        ) : <p className="text-xs text-texto-3">Resultado oficial</p>}
      </td>
    </tr>
  );
}

function ConfirmarEliminacion({ reconocimiento, cerrar }: {
  reconocimiento: ReconocimientoListado;
  cerrar: () => void;
}) {
  const [estado, accion, eliminando] = useActionState<EstadoProdep, FormData>(eliminarReconocimientoProdep, {});
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  return (
    <tr>
      <td colSpan={6} className="p-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={reconocimiento.id} />
          {estado.error ? <Aviso tipo="error">{estado.error}</Aviso> : (
            <p className="text-sm text-texto">
              ¿Eliminar el reconocimiento PRODEP de <strong>{persona}</strong>? Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
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
