"use client";

import { useActionState, useState } from "react";
import { Aviso, claseBotonContorno, claseBotonPeligro, claseBotonSecundario } from "@/components/ui";
import { cancelarEscaneoAction, reintentarEscaneoAction, type EstadoControlEscaneo } from "./actions";

/**
 * Cancelar una búsqueda en curso o reintentar lo que falló (issue 279). Los permisos y el estado
 * se vuelven a comprobar en el servidor; aquí solo se elige qué botón mostrar.
 */
export function ControlBusqueda({ jobId, cancelar, reintentar }: { jobId: number; cancelar: boolean; reintentar: boolean }) {
  const [estadoCancelar, accionCancelar, cancelando] = useActionState<EstadoControlEscaneo, FormData>(cancelarEscaneoAction, {});
  const [estadoReintentar, accionReintentar, reintentando] = useActionState<EstadoControlEscaneo, FormData>(reintentarEscaneoAction, {});
  const [confirmando, confirmar] = useState(false);
  if (!cancelar && !reintentar) return null;
  const resultado = estadoCancelar.error || estadoCancelar.mensaje ? estadoCancelar : estadoReintentar;
  return <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2">
      {cancelar && !estadoCancelar.mensaje && (confirmando
        ? <form action={accionCancelar} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="jobId" value={jobId} />
          <span className="text-sm text-texto-2">¿Cancelar esta búsqueda? Lo guardado hasta ahora se conserva.</span>
          <button type="submit" disabled={cancelando} className={claseBotonPeligro}>{cancelando ? "Cancelando…" : "Sí, cancelar"}</button>
          <button type="button" disabled={cancelando} onClick={() => confirmar(false)} className={claseBotonSecundario}>No</button>
        </form>
        : <button type="button" onClick={() => confirmar(true)} className={claseBotonContorno}>Cancelar búsqueda</button>)}
      {reintentar && <form action={accionReintentar}>
        <input type="hidden" name="jobId" value={jobId} />
        <button type="submit" disabled={reintentando} className={claseBotonContorno}>{reintentando ? "Creando reintento…" : "Reintentar lo que falló"}</button>
      </form>}
    </div>
    {reintentar && !resultado.error && <p className="text-xs text-texto-3">Crea una búsqueda nueva solo con los profesores y fuentes que fallaron o quedaron sin revisar, con el mismo periodo.</p>}
    {resultado.error && <Aviso tipo="error">{resultado.error}</Aviso>}
    {resultado.mensaje && <Aviso tipo="exito">{resultado.mensaje}</Aviso>}
  </div>;
}
