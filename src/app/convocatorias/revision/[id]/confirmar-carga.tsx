"use client";

import { useActionState, useState } from "react";
import { Aviso, claseBoton, claseBotonSecundario } from "@/components/ui";
import { confirmarCarga, type EstadoFila } from "./actions";

// RF-019: confirmar no se puede deshacer, así que pide una segunda confirmación que dice qué pasará.
export function ConfirmarCarga({ cargaId, nombre, resumen, bloqueada }: {
  cargaId: number;
  nombre: string;
  resumen: string;
  bloqueada: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, accion, enviando] = useActionState<EstadoFila, FormData>(confirmarCarga, {});

  if (!confirmando) {
    return (
      <div>
        <button type="button" disabled={bloqueada} onClick={() => setConfirmando(true)} className={claseBoton}>
          Confirmar carga
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-3 rounded-xl bg-aviso-suave p-4">
      <input type="hidden" name="cargaId" value={cargaId} />
      <p className="text-sm text-texto">
        ¿Confirmar la carga de <strong>{nombre}</strong>? {resumen} Esta acción no se puede deshacer.
      </p>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={claseBoton}>{enviando ? "Confirmando…" : "Sí, confirmar"}</button>
        <button type="button" disabled={enviando} onClick={() => setConfirmando(false)} className={claseBotonSecundario} autoFocus>
          Cancelar
        </button>
      </div>
    </form>
  );
}
