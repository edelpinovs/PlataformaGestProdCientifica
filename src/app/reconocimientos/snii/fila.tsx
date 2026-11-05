"use client";

import { useActionState, useState } from "react";
import { Aviso, claseAccionFila, claseBotonPeligro, claseBotonSecundario, EtiquetaEstado } from "@/components/ui";
import type { NIVELES_SNII, TIPOS_PARTICIPACION_SNII } from "@/modules/reconocimientos/snii";
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

const ETIQUETAS_NIVEL: Record<ReconocimientoListado["nivel"], string> = {
  CANDIDATO: "Candidato", NIVEL_1: "Nivel 1", NIVEL_2: "Nivel 2", NIVEL_3: "Nivel 3", EMERITO: "Emérito", NO_APROBADO: "No aprobado",
};
const ETIQUETAS_PARTICIPACION: Record<ReconocimientoListado["tipoParticipacion"], string> = {
  NUEVO_INGRESO: "Nuevo ingreso", RENOVACION: "Renovación", REINGRESO_NO_VIGENTE: "Reingreso no vigente",
};

export function FilaSnii({ reconocimiento, profesores }: {
  reconocimiento: ReconocimientoListado;
  profesores: { id: number; codigo: string; nombres: string; apellidos: string; cvu: string | null }[];
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  if (modo === "editar") return <FormularioEdicionSnii reconocimiento={reconocimiento} profesores={profesores} cerrar={() => setModo("ver")} />;
  if (modo === "eliminar") return <ConfirmarEliminacion reconocimiento={reconocimiento} cerrar={() => setModo("ver")} />;

  const tipoEstado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "aviso"
    : reconocimiento.resultado === "NO_APROBADO" ? "error" : "exito";
  const etiquetaResultado = reconocimiento.resultado === "EN_RECONSIDERACION" ? "En reconsideración"
    : reconocimiento.resultado === "NO_APROBADO" ? "No aprobado" : "Aprobado";

  return (
    <li className="grid min-w-0 gap-3 border-b border-linea py-4 last:border-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{persona}</p>
        <p className="text-xs text-texto-3">{reconocimiento.profesor.codigo} · CVU {reconocimiento.profesor.cvu ?? "Sin CVU"}</p>
      </div>
      <div className="text-sm">
        <p>{ETIQUETAS_NIVEL[reconocimiento.nivel]} · {ETIQUETAS_PARTICIPACION[reconocimiento.tipoParticipacion]}</p>
        <p className="text-xs text-texto-3">{reconocimiento.inicio.toISOString().slice(0, 10)} al {reconocimiento.fin.toISOString().slice(0, 10)}</p>
      </div>
      <div><EtiquetaEstado tipo={tipoEstado}>{etiquetaResultado}</EtiquetaEstado></div>
      <div className="flex gap-1 sm:justify-end">
        {reconocimiento.convocatoriaId === null && (
          <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()} aria-label={`Editar reconocimiento de ${persona}`}>Editar</button>
        )}
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)} aria-label={`Eliminar reconocimiento de ${persona}`}>Eliminar</button>
      </div>
    </li>
  );
}

function ConfirmarEliminacion({ reconocimiento, cerrar }: { reconocimiento: ReconocimientoListado; cerrar: () => void }) {
  const [estado, accion, eliminando] = useActionState<EstadoSnii, FormData>(eliminarReconocimientoSnii, {});
  const persona = `${reconocimiento.profesor.nombres} ${reconocimiento.profesor.apellidos}`;

  return (
    <li className="border-b border-linea py-3 last:border-0">
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
    </li>
  );
}