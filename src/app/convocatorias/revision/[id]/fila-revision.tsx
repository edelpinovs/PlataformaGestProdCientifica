"use client";

import { useActionState, useState } from "react";
import { SelectorProfesor } from "@/components/selector-profesor";
import { Aviso, claseAccionFila, claseBoton, claseBotonSecundario, claseTabla, EtiquetaEstado } from "@/components/ui";
import type { OpcionProfesor } from "@/lib/selectores/profesor";
import { asignarProfesor, quitarAsignacion, type EstadoFila } from "./actions";

export type FilaVista = {
  clave: string;
  renglonId: number | null;
  numero: number | null;
  nombreListado: string | null;
  profesor: string | null;
  criterio: string | null;
  /** Renglón anterior con el mismo profesor; este no vuelve a contar en el balance. */
  repiteRenglon: number | null;
  /** Qué se puede hacer en la fila: asignar (dudoso o sin coincidencia), quitar (manual) o nada. */
  accion: "asignar" | "quitar" | null;
  clasificacion: { tipo: "exito" | "error" | "aviso"; texto: string };
};

const COLUMNAS = 5;

// RF-019: sin Editar ni Eliminar (#59): es una pantalla de revisión de un documento oficial. Lo único
// que se cambia es el profesor de los renglones que el cruce no resolvió. Las opciones del selector
// llegan una sola vez al cuerpo de la tabla y no en cada fila.
export function CuerpoRevision({ cargaId, filas, opciones }: { cargaId: number; filas: FilaVista[]; opciones: OpcionProfesor[] }) {
  return (
    <tbody>
      {filas.map((f) => <FilaRevision key={`${f.clave}-${f.criterio}-${f.profesor}`} cargaId={cargaId} f={f} opciones={opciones} />)}
    </tbody>
  );
}

function FilaRevision({ cargaId, f, opciones }: { cargaId: number; f: FilaVista; opciones: OpcionProfesor[] }) {
  const [asignando, setAsignando] = useState(false);
  if (asignando) return <Asignar cargaId={cargaId} f={f} opciones={opciones} cerrar={() => setAsignando(false)} />;

  const listado = f.nombreListado ?? "No aparece en el listado";
  return (
    <tr className={claseTabla.fila}>
      <td className={claseTabla.celda}>
        <span className={f.nombreListado ? "font-semibold text-texto" : "text-texto-3"}>{listado}</span>
        {f.numero !== null && <span className="block text-xs text-texto-3">Renglón {f.numero}</span>}
        {f.repiteRenglon !== null && (
          <span className="block text-xs text-aviso">Repite al renglón {f.repiteRenglon}; cuenta una sola vez.</span>
        )}
        {/* En celular el profesor, el criterio y la clasificación van debajo del nombre. */}
        {f.profesor && <span className="mt-1 block text-texto-2 sm:hidden">{f.profesor}</span>}
        {f.criterio && <span className="block text-xs text-texto-3 sm:hidden">Criterio: {f.criterio}</span>}
        <span className="mt-2 block sm:hidden"><EtiquetaEstado tipo={f.clasificacion.tipo}>{f.clasificacion.texto}</EtiquetaEstado></span>
      </td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>{f.profesor ?? <span className="text-texto-3">—</span>}</td>
      <td className={`${claseTabla.celda} hidden text-xs text-texto-3 sm:table-cell`}>{f.criterio ?? "—"}</td>
      <td className={`${claseTabla.celda} hidden sm:table-cell`}>
        <EtiquetaEstado tipo={f.clasificacion.tipo}>{f.clasificacion.texto}</EtiquetaEstado>
      </td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        {f.accion === "asignar" && (
          <button type="button" onClick={() => setAsignando(true)} className={claseAccionFila()}
            aria-label={`Asignar profesor al renglón ${f.numero}`}>
            Asignar
          </button>
        )}
        {f.accion === "quitar" && <Quitar cargaId={cargaId} f={f} />}
      </td>
    </tr>
  );
}

function Quitar({ cargaId, f }: { cargaId: number; f: FilaVista }) {
  const [estado, accion, quitando] = useActionState<EstadoFila, FormData>(quitarAsignacion, {});
  return (
    <form action={accion}>
      <input type="hidden" name="renglonId" value={f.renglonId ?? ""} />
      <input type="hidden" name="cargaId" value={cargaId} />
      <button type="submit" disabled={quitando} className={claseAccionFila(true)}
        aria-label={`Quitar la asignación del renglón ${f.numero}`}>
        {quitando ? "Quitando…" : "Quitar"}
      </button>
      {estado.error && <div className="mt-2 text-left whitespace-normal"><Aviso tipo="error">{estado.error}</Aviso></div>}
    </form>
  );
}

function Asignar({ cargaId, f, opciones, cerrar }: { cargaId: number; f: FilaVista; opciones: OpcionProfesor[]; cerrar: () => void }) {
  const [estado, accion, guardando] = useActionState<EstadoFila, FormData>(asignarProfesor, {});
  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={accion} className="flex flex-col gap-3 rounded-xl bg-marca-tenue p-4">
          <input type="hidden" name="renglonId" value={f.renglonId ?? ""} />
          <input type="hidden" name="cargaId" value={cargaId} />
          <p className="text-sm text-texto">
            Renglón {f.numero}: <strong>{f.nombreListado}</strong>. Elige al profesor del directorio que le corresponde.
          </p>
          <SelectorProfesor opciones={opciones} etiqueta="Profesor del directorio" deshabilitado={guardando} />
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={claseBoton}>{guardando ? "Guardando…" : "Asignar"}</button>
            <button type="button" onClick={cerrar} disabled={guardando} className={claseBotonSecundario}>Cancelar</button>
          </div>
        </form>
      </td>
    </tr>
  );
}
