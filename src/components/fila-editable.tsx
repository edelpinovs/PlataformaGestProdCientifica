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
} from "./ui";

// Fila de listado con Editar y Eliminar (regla de AGENTS.md, issue #59).
// La página pasa las celdas, los campos editables y las dos Server Actions; cada acción
// recibe `id` y los campos en el FormData, y redirige al listado cuando sale bien.
// Al editar o confirmar, la fila se abre a todo el ancho para que quepa en celular.

export type EstadoFila = { error?: string; campo?: string; valores?: Record<string, string> };
export type AccionFila = (estado: EstadoFila, formData: FormData) => Promise<EstadoFila>;

export type CampoFila = {
  nombre: string;
  etiqueta: string;
  valor: string;
  maxLength?: number;
  /** "amplio" ocupa el espacio libre; "corto" sirve para claves y nomenclaturas. */
  ancho?: "amplio" | "corto" | "medio";
  /** Si se pasa, el campo es una lista de opciones. */
  opciones?: { valor: string; texto: string }[];
};

type Props = {
  id: number;
  /** Cómo se nombra el registro en botones y mensajes, p. ej. "Doctorado". */
  nombre: string;
  /** Dato que acompaña al nombre al confirmar, p. ej. la clave. */
  detalle?: string;
  celdas: { contenido: React.ReactNode; className?: string }[];
  campos: CampoFila[];
  editar: AccionFila;
  eliminar: AccionFila;
};

const ANCHO = { amplio: "flex-1 sm:min-w-56", medio: "sm:w-64", corto: "sm:w-40" };

export function FilaEditable(props: Props) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const cerrar = () => setModo("ver");

  // Edición y confirmación se montan de nuevo cada vez, así no arrastran errores anteriores.
  if (modo === "editar") return <Edicion {...props} cerrar={cerrar} />;
  if (modo === "eliminar") return <Confirmacion {...props} cerrar={cerrar} />;

  return (
    <tr className={claseTabla.fila}>
      {props.celdas.map((celda, i) => (
        <td key={i} className={`${claseTabla.celda} ${celda.className ?? ""}`}>{celda.contenido}</td>
      ))}
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
          aria-label={`Editar ${props.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
          aria-label={`Eliminar ${props.nombre}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function Edicion({ id, celdas, campos, editar, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, guardando] = useActionState<EstadoFila, FormData>(editar, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={celdas.length + 1} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            {campos.map((campo, i) => {
              const conError = estado.campo === campo.nombre;
              const valor = estado.valores?.[campo.nombre] ?? campo.valor;
              return (
                <label key={campo.nombre} className={`${claseEtiqueta} ${ANCHO[campo.ancho ?? "amplio"]}`}>
                  {campo.etiqueta}
                  {campo.opciones ? (
                    <select name={campo.nombre} required defaultValue={valor} aria-invalid={conError}
                      className={claseCampo(conError)} autoFocus={i === 0}>
                      {campo.opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                    </select>
                  ) : (
                    <input name={campo.nombre} required maxLength={campo.maxLength} defaultValue={valor}
                      aria-invalid={conError} className={claseCampo(conError)} autoFocus={i === 0} />
                  )}
                </label>
              );
            })}
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

function Confirmacion({ id, nombre, detalle, celdas, eliminar, cerrar }: Props & { cerrar: () => void }) {
  const [estado, accion, eliminando] = useActionState<EstadoFila, FormData>(eliminar, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={celdas.length + 1} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar <strong>«{nombre}»</strong>{detalle ? ` (${detalle})` : ""}? Esta acción no se puede deshacer.
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
