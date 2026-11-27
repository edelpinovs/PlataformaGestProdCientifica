"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionIcono,
  claseBotonPeligro,
  claseBotonSecundario,
  EtiquetaEstado,
  Icono,
  ICONOS,
} from "@/components/ui";
import { ETIQUETAS_ESTATUS, SIN_VIGENCIA, TONO_ESTATUS, type Estatus } from "@/modules/reconocimientos/estatus";
import {
  COLUMNAS_PRODEP,
  ETIQUETAS_RESULTADO_PRODEP,
  ETIQUETAS_TIPO_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { eliminarReconocimientoProdep, type EstadoProdep } from "./actions";
import { FormularioEdicionProdep, type ReconocimientoProdepEdicion } from "./formulario-edicion";
import type { ProfesorProdep } from "./formulario-campos";

function mostrarFecha(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

/** Columnas de la tabla, con la de acciones: la edición y el borrado ocupan la fila completa. */
const COLUMNAS_FILA_PRODEP = COLUMNAS_PRODEP.length + 1;

export function FilaProdep({ reconocimiento, estatus = null, profesores }: {
  reconocimiento: ReconocimientoProdepEdicion;
  /** Estatus de vigencia que calcula la página con la fecha del servidor (issue 248); null si no tiene vigencia. */
  estatus?: Estatus | null;
  profesores: ProfesorProdep[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  if (modo === "editar") {
    return (
      <tr className="border-b border-linea">
        <td colSpan={COLUMNAS_FILA_PRODEP} className="py-3">
          <FormularioEdicionProdep reconocimiento={reconocimiento} profesores={profesores} cerrar={() => setModo("ver")} />
        </td>
      </tr>
    );
  }
  if (modo === "eliminar") {
    return <ConfirmarEliminacion reconocimiento={reconocimiento} cerrar={() => setModo("ver")} />;
  }

  const tipoEstado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "aviso"
    : reconocimiento.resultado === "NO_APROBADO" ? "error" : "exito";

  return (
    <tr className="grid grid-cols-2 gap-x-3 border-b border-linea last:border-0 sm:table-row">
      <td className="min-w-0 break-words py-3 pr-2 text-sm sm:table-cell sm:pr-3">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Profesor</span>
        <span className="font-medium">{persona}</span>
        <span className="block text-xs text-texto-3">{reconocimiento.profesor.codigo}</span>
      </td>
      <td className="min-w-0 break-words py-3 pr-2 text-sm sm:table-cell sm:pr-3">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Tipo de solicitud</span>
        {ETIQUETAS_TIPO_SOLICITUD_PRODEP[reconocimiento.tipoSolicitud]}
      </td>
      <td className="min-w-0 py-3 pr-2 text-sm sm:table-cell sm:pr-3 sm:whitespace-nowrap">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Resultado</span>
        <EtiquetaEstado tipo={tipoEstado}>{ETIQUETAS_RESULTADO_PRODEP[reconocimiento.resultado]}</EtiquetaEstado>
      </td>
      <td className="min-w-0 py-3 pr-2 text-sm sm:table-cell sm:pr-3 sm:whitespace-nowrap">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Inicio</span>
        {mostrarFecha(reconocimiento.inicio)}
      </td>
      <td className="min-w-0 py-3 pr-2 text-sm sm:table-cell sm:pr-3 sm:whitespace-nowrap">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Fin</span>
        {mostrarFecha(reconocimiento.fin)}
      </td>
      <td className="min-w-0 py-3 pr-2 text-sm sm:table-cell sm:pr-3 sm:whitespace-nowrap">
        <span className="mb-1 block text-xs text-texto-3 sm:hidden">Estatus</span>
        {estatus ? <EtiquetaEstado tipo={TONO_ESTATUS[estatus]}>{ETIQUETAS_ESTATUS[estatus]}</EtiquetaEstado>
          : <span className="text-xs text-texto-3">{SIN_VIGENCIA}</span>}
      </td>
      <td className="col-span-2 flex gap-1 py-3 sm:table-cell sm:text-right">
        {reconocimiento.convocatoriaId === null && (
          <button type="button" onClick={() => setModo("editar")} className={claseAccionIcono()}
            aria-label={`Editar reconocimiento PRODEP de ${persona}`} title="Editar">
            <Icono d={ICONOS.editar} />
          </button>
        )}
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionIcono(true)}
          aria-label={`Eliminar reconocimiento PRODEP de ${persona}`} title="Eliminar">
          <Icono d={ICONOS.eliminar} />
        </button>
      </td>
    </tr>
  );
}

function ConfirmarEliminacion({ reconocimiento, cerrar }: {
  reconocimiento: ReconocimientoProdepEdicion;
  cerrar: () => void;
}) {
  const [estado, accion, eliminando] = useActionState<EstadoProdep, FormData>(eliminarReconocimientoProdep, {});
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  return (
    <tr className="border-b border-linea">
      <td colSpan={COLUMNAS_FILA_PRODEP} className="py-3">
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
