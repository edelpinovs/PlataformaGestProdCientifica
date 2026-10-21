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
import { ETIQUETA_NIVEL, type NivelConsolidacion } from "@/modules/cuerpos-academicos/cuerpo";
import { editarCuerpo, eliminarCuerpo, type EstadoFila, type ValoresCuerpo } from "./actions";
import { CamposCuerpo } from "./formulario";

type Departamento = { id: number; nombre: string; nomenclatura: string };

export type CuerpoFila = {
  id: number;
  clave: string;
  nombre: string;
  nivel: NivelConsolidacion;
  areaProdep: string;
  disciplina: string;
  departamentoId: number;
  anioRegistro: number;
  anioVencimiento: number;
  departamento: { nombre: string; nomenclatura: string };
};

const COLUMNAS = 6;

export function FilaCuerpo({ cuerpo, departamentos }: { cuerpo: CuerpoFila; departamentos: Departamento[] }) {
  const [modo, setModo] = useState<"ver" | "editar" | "eliminar">("ver");
  const cerrar = () => setModo("ver");

  if (modo === "editar") return <EdicionCuerpo cuerpo={cuerpo} departamentos={departamentos} cerrar={cerrar} />;
  if (modo === "eliminar") return <ConfirmarEliminacion cuerpo={cuerpo} cerrar={cerrar} />;

  return (
    <tr className={claseTabla.fila}>
      <td className={`${claseTabla.celda} font-mono`}>{cuerpo.clave}</td>
      <td className={claseTabla.celda}>{cuerpo.nombre}</td>
      <td className={claseTabla.celda}>{ETIQUETA_NIVEL[cuerpo.nivel]}</td>
      <td className={claseTabla.celda}>
        {cuerpo.departamento.nombre}{" "}
        <span className="font-mono text-texto-3">({cuerpo.departamento.nomenclatura})</span>
      </td>
      <td className={`${claseTabla.celda} whitespace-nowrap`}>
        {cuerpo.anioRegistro}–{cuerpo.anioVencimiento}
      </td>
      <td className={`${claseTabla.celda} pr-0 text-right whitespace-nowrap`}>
        <button type="button" onClick={() => setModo("editar")} className={claseAccionFila()}
          aria-label={`Editar ${cuerpo.nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => setModo("eliminar")} className={claseAccionFila(true)}
          aria-label={`Eliminar ${cuerpo.nombre}`}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}

function valoresDe(cuerpo: CuerpoFila): ValoresCuerpo {
  return {
    clave: cuerpo.clave,
    nombre: cuerpo.nombre,
    nivel: cuerpo.nivel,
    areaProdep: cuerpo.areaProdep,
    disciplina: cuerpo.disciplina,
    departamentoId: String(cuerpo.departamentoId),
    anioRegistro: String(cuerpo.anioRegistro),
    anioVencimiento: String(cuerpo.anioVencimiento),
  };
}

function EdicionCuerpo({
  cuerpo,
  departamentos,
  cerrar,
}: {
  cuerpo: CuerpoFila;
  departamentos: Departamento[];
  cerrar: () => void;
}) {
  const [estado, editar, guardando] = useActionState<EstadoFila, FormData>(editarCuerpo, {});
  const valores = estado.valores ?? valoresDe(cuerpo);

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={editar} className="flex flex-col gap-3 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={cuerpo.id} />
          <CamposCuerpo valores={valores} campo={estado.campo} departamentos={departamentos} />
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

function ConfirmarEliminacion({ cuerpo, cerrar }: { cuerpo: CuerpoFila; cerrar: () => void }) {
  const [estado, eliminar, eliminando] = useActionState<EstadoFila, FormData>(eliminarCuerpo, {});

  return (
    <tr className={claseTabla.fila}>
      <td colSpan={COLUMNAS} className="py-3">
        <form action={eliminar} className="flex flex-col gap-3 rounded-xl bg-peligro-suave p-4">
          <input type="hidden" name="id" value={cuerpo.id} />
          {estado.error ? (
            <Aviso tipo="error">{estado.error}</Aviso>
          ) : (
            <p className="text-sm text-texto">
              ¿Eliminar el cuerpo académico <strong>«{cuerpo.nombre}»</strong> ({cuerpo.clave})? Esta acción no se puede deshacer.
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
