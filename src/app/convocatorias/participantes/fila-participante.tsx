"use client";

import { useActionState, useState } from "react";
import { Aviso, claseAccionFila, claseBotonPeligro, claseBotonSecundario, claseTabla, EtiquetaEstado } from "@/components/ui";
import { eliminarParticipante, type EstadoFila } from "./actions";

export type Participante = {
  id: number;
  convocatoria: string;
  profesor: string;
  codigo: string;
  resultado: { tipo: "exito" | "error" | "aviso"; texto: string };
  origen: string;
};

// #59: fila con Eliminar y sin Editar (justificado en el issue #23): la participación solo
// guarda al profesor, y cambiarlo es quitarla y registrar otra; el resultado lo pone el cruce.
export function FilaParticipante({ p }: { p: Participante }) {
  const [confirmando, setConfirmando] = useState(false);
  if (confirmando) return <Confirmar p={p} cerrar={() => setConfirmando(false)} />;

  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        <span className="font-semibold text-texto">{p.convocatoria}</span>
        {/* En celular el profesor, su código y el resultado van debajo de la convocatoria. */}
        <span className="mt-1 block text-texto-2 sm:hidden">{p.profesor}</span>
        <span className="block font-mono text-xs text-texto-3 sm:hidden">{p.codigo} · {p.origen}</span>
        <span className="mt-2 block sm:hidden"><EtiquetaEstado tipo={p.resultado.tipo}>{p.resultado.texto}</EtiquetaEstado></span>
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>{p.profesor}</td>
      <td className={`${claseTabla.celda} hidden font-mono text-xs sm:table-cell`}>{p.codigo}</td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <EtiquetaEstado tipo={p.resultado.tipo}>{p.resultado.texto}</EtiquetaEstado>
      </td>
      <td className={`${claseTabla.celda} hidden text-xs text-texto-3 sm:table-cell`}>{p.origen}</td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setConfirmando(true)} className={claseAccionFila(true)}
          aria-label={`Eliminar a ${p.profesor} de ${p.convocatoria}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function Confirmar({ p, cerrar }: { p: Participante; cerrar: () => void }) {
  const [estado, accion, eliminando] = useActionState<EstadoFila, FormData>(eliminarParticipante, {});
  return (
    <tr className={claseTabla.fila}>
      <td colSpan={6} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={p.id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Quitar a <strong>{p.profesor}</strong> de los participantes de {p.convocatoria}? Su resultado se vuelve a calcular.
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
