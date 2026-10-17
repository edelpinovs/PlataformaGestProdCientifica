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
} from "@/components/ui";
import { editarGrado, eliminarGrado, type EstadoFila } from "./actions";

type Grado = { id: number; nombre: string; nomenclatura: string };

// #55: fila de la lista de grados con Editar y Eliminar.
// Al editar o confirmar, la fila se abre a todo el ancho para que quepa en celular.
// Edición y confirmación se montan de nuevo cada vez, así no arrastran errores anteriores.
export function FilaGrado({ grado }: { grado: Grado }) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const cerrar = () => setModo("ver");

  if (modo === "editar") return <EdicionGrado grado={grado} cerrar={cerrar} />;
  if (modo === "eliminar") return <ConfirmarEliminacion grado={grado} cerrar={cerrar} />;

  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>{grado.nombre}</td>
      <td className={`${claseTabla.celda} font-mono`}>{grado.nomenclatura}</td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
          aria-label={`Editar ${grado.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
          aria-label={`Eliminar ${grado.nombre}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function EdicionGrado({ grado, cerrar }: { grado: Grado; cerrar: () => void }) {
  const [estado, editar, guardando] = useActionState<EstadoFila, FormData>(editarGrado, {});
  const valores = estado.valores ?? grado;

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={3} className="py-3">
        <form action={editar} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={grado.id} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className={`${claseEtiqueta} flex-1`}>
              Nombre
              <input name="nombre" required maxLength={100} autoFocus defaultValue={valores.nombre}
                aria-invalid={estado.campo === "nombre"} className={claseCampo(estado.campo === "nombre")} />
            </label>
            <label className={`${claseEtiqueta} sm:w-40`}>
              Nomenclatura
              <input name="nomenclatura" required maxLength={10} defaultValue={valores.nomenclatura}
                aria-invalid={estado.campo === "nomenclatura"}
                className={claseCampo(estado.campo === "nomenclatura")} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={guardando} className={claseBoton}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
            </div>
          </div>
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        </form>
      </td>
    </tr>
  );
}

function ConfirmarEliminacion({ grado, cerrar }: { grado: Grado; cerrar: () => void }) {
  const [estado, eliminar, eliminando] = useActionState<EstadoFila, FormData>(eliminarGrado, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={3} className="py-3">
        <form action={eliminar} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={grado.id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar el grado <strong>«{grado.nombre}»</strong> ({grado.nomenclatura})? Esta acción no se puede deshacer.
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
