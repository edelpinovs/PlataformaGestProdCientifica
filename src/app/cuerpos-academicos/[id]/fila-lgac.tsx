"use client";

import { useActionState, useState } from "react";
import {
  Aviso,
  claseAccionFila,
  claseBoton,
  claseBotonPeligro,
  claseBotonSecundario,
  claseTabla,
} from "@/components/ui";
import { editarLgac, eliminarLgac, type EstadoFilaLgac } from "./actions";
import { CamposLgac, type IntegranteLgac } from "./formulario-lgac";

export type LgacFila = {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesores: IntegranteLgac[];
};

const COLUMNAS = 4;

export function FilaLgac({
  cuerpoId,
  lgac,
  integrantes,
}: {
  cuerpoId: number;
  lgac: LgacFila;
  integrantes: IntegranteLgac[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const cerrar = () => setModo("ver");

  if (modo === "editar") {
    return <Edicion cuerpoId={cuerpoId} lgac={lgac} integrantes={integrantes} cerrar={cerrar} />;
  }
  if (modo === "eliminar") {
    return <Confirmacion cuerpoId={cuerpoId} lgac={lgac} cerrar={cerrar} />;
  }

  const nombres = lgac.profesores.map((p) => p.nombre).join(", ");

  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        {lgac.nombre}
        <div className="mt-2 flex flex-col gap-1 text-xs text-texto-3 sm:hidden">
          <span>{lgac.descripcion ?? "Sin descripción"}</span>
          <span>{nombres || "Sin integrantes"}</span>
        </div>
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        {lgac.descripcion ? lgac.descripcion : <span className="text-texto-3">Sin descripción</span>}
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        {nombres || <span className="text-texto-3">Sin integrantes</span>}
      </td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
          aria-label={`Editar ${lgac.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
          aria-label={`Eliminar ${lgac.nombre}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function Edicion({
  cuerpoId,
  lgac,
  integrantes,
  cerrar,
}: {
  cuerpoId: number;
  lgac: LgacFila;
  integrantes: IntegranteLgac[];
  cerrar: () => void;
}) {
  const [estado, editar, guardando] = useActionState<EstadoFilaLgac, FormData>(editarLgac, {});
  const valores = estado.valores ?? {
    nombre: lgac.nombre,
    descripcion: lgac.descripcion ?? "",
    profesorIds: lgac.profesores.map((p) => String(p.profesorId)),
  };

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={editar} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={lgac.id} />
          <input type="hidden" name="cuerpoId" value={cuerpoId} />
          <CamposLgac integrantes={integrantes} valores={valores} campo={estado.campo} />
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
  lgac,
  cerrar,
}: {
  cuerpoId: number;
  lgac: LgacFila;
  cerrar: () => void;
}) {
  const [estado, eliminar, eliminando] = useActionState<EstadoFilaLgac, FormData>(eliminarLgac, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={eliminar} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={lgac.id} />
          <input type="hidden" name="cuerpoId" value={cuerpoId} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar la LGAC <strong>«{lgac.nombre}»</strong>? Esta acción no se puede deshacer.
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
