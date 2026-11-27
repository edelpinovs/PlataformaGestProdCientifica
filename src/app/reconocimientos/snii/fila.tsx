"use client";

import { useActionState, useState } from "react";
import { Aviso, claseAccionIcono, claseBotonPeligro, claseBotonSecundario, EtiquetaEstado, Icono, ICONOS } from "@/components/ui";
import type { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "@/modules/reconocimientos/snii";
import { ETIQUETAS_ESTATUS, SIN_VIGENCIA, TONO_ESTATUS, type Estatus } from "@/modules/reconocimientos/estatus";
import { COLUMNAS_SNII, ETIQUETAS_NIVEL_SNII, ETIQUETAS_PARTICIPACION_SNII, ETIQUETAS_RESULTADO_SNII } from "@/modules/reconocimientos/snii-listado";
import { eliminarReconocimientoSnii, type EstadoSnii } from "./actions";
import { FormularioEdicionSnii } from "./formulario-edicion";

type ReconocimientoListado = {
  id: number;
  nivel: (typeof NIVELES_SNII)[number];
  tipoParticipacion: (typeof TIPOS_PARTICIPACION_SNII)[number];
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
  inicio: Date;
  fin: Date;
  convocatoriaId: number | null;
  profesor: { id: number; codigo: string; nombres: string; apellidos: string; cvu: string | null };
};

/** Columnas de la tabla, con la de acciones: la edición y el borrado ocupan la fila completa. */
const COLUMNAS_FILA_SNII = COLUMNAS_SNII.length + 1;
const mostrarFecha = (fecha: Date) => fecha.toISOString().slice(0, 10);

// Issue 111: fila de la tabla de Reconocimientos SNII (como PRODEP). En celular las celdas se apilan
// en dos columnas con su etiqueta; el orden se elige con el selector «Ordenar por» de la barra.
export function FilaSnii({ reconocimiento, estatus = null, profesores }: {
  reconocimiento: ReconocimientoListado;
  /** Estatus de vigencia que calcula la página con la fecha del servidor (issue 248); null si no tiene vigencia. */
  estatus?: Estatus | null;
  profesores: { id: number; codigo: string; nombres: string; apellidos: string; cvu: string | null }[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  if (modo === "editar") return <FormularioEdicionSnii reconocimiento={reconocimiento} profesores={profesores} cerrar={() => setModo("ver")} />;
  if (modo === "eliminar") return <ConfirmarEliminacion reconocimiento={reconocimiento} cerrar={() => setModo("ver")} />;

  const tipoEstado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "aviso"
    : reconocimiento.resultado === "NO_APROBADO" ? "error" : "exito";
  const celda = "min-w-0 break-words py-3 pr-2 text-sm sm:table-cell sm:pr-3";
  // Fechas y etiquetas no se parten en escritorio; el nombre del profesor absorbe el espacio.
  const celdaCorta = `${celda} sm:whitespace-nowrap`;
  const etiqueta = "mb-1 block text-xs text-texto-3 sm:hidden";

  return (
    <tr className="grid grid-cols-2 gap-x-3 border-b border-linea last:border-0 hover:bg-marca-tenue sm:table-row">
      <td className={`${celda} col-span-2`}>
        <span className={etiqueta}>Profesor</span>
        <span className="font-medium">{persona}</span>
        <span className="block text-xs text-texto-3">{reconocimiento.profesor.codigo} · CVU {reconocimiento.profesor.cvu ?? "Sin CVU"}</span>
      </td>
      <td className={celda}>
        <span className={etiqueta}>Nivel</span>
        {ETIQUETAS_NIVEL_SNII[reconocimiento.nivel]}
      </td>
      <td className={celda}>
        <span className={etiqueta}>Participación</span>
        {ETIQUETAS_PARTICIPACION_SNII[reconocimiento.tipoParticipacion]}
      </td>
      <td className={celdaCorta}>
        <span className={etiqueta}>Resultado</span>
        <EtiquetaEstado tipo={tipoEstado}>{ETIQUETAS_RESULTADO_SNII[reconocimiento.resultado]}</EtiquetaEstado>
      </td>
      <td className={celdaCorta}>
        <span className={etiqueta}>Inicio</span>
        {mostrarFecha(reconocimiento.inicio)}
      </td>
      <td className={celdaCorta}>
        <span className={etiqueta}>Fin</span>
        {mostrarFecha(reconocimiento.fin)}
      </td>
      <td className={celdaCorta}>
        <span className={etiqueta}>Estatus</span>
        {estatus ? <EtiquetaEstado tipo={TONO_ESTATUS[estatus]}>{ETIQUETAS_ESTATUS[estatus]}</EtiquetaEstado>
          : <span className="text-xs text-texto-3">{SIN_VIGENCIA}</span>}
      </td>
      <td className="col-span-2 flex gap-1 py-3 sm:table-cell sm:text-right sm:whitespace-nowrap">
        {reconocimiento.convocatoriaId === null && (
          <button type="button" onClick={() => setModo("editar")} className={claseAccionIcono()}
            aria-label={`Editar reconocimiento de ${persona}`} title="Editar">
            <Icono d={ICONOS.editar} />
          </button>
        )}
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionIcono(true)}
          aria-label={`Eliminar reconocimiento de ${persona}`} title="Eliminar">
          <Icono d={ICONOS.eliminar} />
        </button>
      </td>
    </tr>
  );
}

function ConfirmarEliminacion({ reconocimiento, cerrar }: { reconocimiento: ReconocimientoListado; cerrar: () => void }) {
  const [estado, accion, eliminando] = useActionState<EstadoSnii, FormData>(eliminarReconocimientoSnii, {});
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  return (
    <tr className="border-b border-linea">
      <td colSpan={COLUMNAS_FILA_SNII} className="py-3">
      <form action={accion} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
        <input type="hidden" name="id" value={reconocimiento.id} />
        {estado.error ? <Aviso tipo="error">{estado.error}</Aviso> : (
          <p className="text-sm text-texto">¿Eliminar el reconocimiento SNII de <strong>{persona}</strong>? Esta acción no se puede deshacer.</p>
        )}
        <div className="flex gap-2">
          {!estado.error && <button type="submit" disabled={eliminando} className={claseBotonPeligro}>{eliminando ? "Eliminando…" : "Eliminar"}</button>}
          <button type="button" onClick={cerrar} className={claseBotonSecundario}>{estado.error ? "Cerrar" : "Cancelar"}</button>
        </div>
      </form>
      </td>
    </tr>
  );
}
