"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionFila,
  claseBotonPeligro,
  claseBotonSecundario,
  claseTabla,
  EtiquetaEstado,
  Icono,
} from "@/components/ui";
import { eliminarCarga, type EstadoFila } from "./carga/actions";

const ETIQUETA_ESTADO = {
  CONFIRMADA: { tipo: "exito" as const, texto: "Confirmada" },
  PROCESANDO: { tipo: "aviso" as const, texto: "Procesando" },
  EN_REVISION: { tipo: "aviso" as const, texto: "En revisión" },
  FALLIDA: { tipo: "error" as const, texto: "Fallida" },
};

const ICONO_DOCUMENTO = "M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.5L19 7.5V19a2 2 0 0 1-2 2z";

export type Carga = {
  id: number;
  programa: string;
  anio: number;
  nombre: string;
  estado: keyof typeof ETIQUETA_ESTADO;
  fecha: string;
};

// #59: fila del historial de cargas con Eliminar. No hay Editar: el archivo es el documento
// oficial publicado; si se cargó en la convocatoria equivocada, se elimina y se vuelve a subir.
export function FilaCarga({ carga }: { carga: Carga }) {
  const [confirmando, setConfirmando] = useState(false);
  if (confirmando) return <ConfirmarEliminacion carga={carga} cerrar={() => setConfirmando(false)} />;

  const estado = ETIQUETA_ESTADO[carga.estado];
  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        <span className="font-semibold text-texto">{carga.programa}</span>{" "}
        <span className="text-texto-3">{carga.anio}</span>
        {/* En celular archivo y estado van debajo de la convocatoria para no desbordar la tabla. */}
        <span className="mt-1 block max-w-[9rem] truncate font-mono text-xs text-texto-3 sm:hidden" title={carga.nombre}>
          {carga.nombre}
        </span>
        <span className="mt-2 block sm:hidden">
          <EtiquetaEstado tipo={estado.tipo}>{estado.texto}</EtiquetaEstado>
        </span>
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <span className="flex items-center gap-1.5 font-mono text-xs text-texto-2">
          <Icono d={ICONO_DOCUMENTO} />
          <span className="max-w-[10rem] truncate sm:max-w-[14rem]" title={carga.nombre}>
            {carga.nombre}
          </span>
        </span>
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <EtiquetaEstado tipo={estado.tipo}>{estado.texto}</EtiquetaEstado>
      </td>
      <td className={`${claseTabla.celda} hidden text-xs text-texto-3 sm:table-cell`}>{carga.fecha}</td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        {carga.estado !== "CONFIRMADA" && (
          <button type="button" onClick={() => setConfirmando(true)} className={claseAccionFila(true)}
            aria-label={`Eliminar ${carga.programa} ${carga.anio} ${carga.nombre}`}>
            Eliminar
          </button>
        )}
      </td>
    </tr>
  );
}

function ConfirmarEliminacion({ carga, cerrar }: { carga: Carga; cerrar: () => void }) {
  const [estado, eliminar, eliminando] = useActionState<EstadoFila, FormData>(eliminarCarga, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={5} className="py-3">
        <form action={eliminar} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={carga.id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar la carga <strong>«{carga.nombre}»</strong> de {carga.programa} {carga.anio}? Se borra
              también el archivo. Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex gap-2">
            {!estado.error && (
              <button type="submit" disabled={eliminando} className={claseBotonPeligro}>
                {eliminando ? "Eliminando…" : "Eliminar"}
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
