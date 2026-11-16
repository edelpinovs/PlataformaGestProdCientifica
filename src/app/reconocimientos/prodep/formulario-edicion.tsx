"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario } from "@/components/ui";
import { editarReconocimientoProdep, type EstadoProdep } from "./actions";
import { FormularioProdepCampos, type ProfesorProdep, type ValoresProdep } from "./formulario-campos";

type ReconocimientoEdicion = ValoresProdep & { id: number };

export function FormularioEdicionProdep({ reconocimiento, profesores, cerrar }: {
  reconocimiento: ReconocimientoEdicion;
  profesores: ProfesorProdep[];
  cerrar: () => void;
}) {
  const [estado, accion, guardando] = useActionState<EstadoProdep, FormData>(editarReconocimientoProdep, {});
  return (
    <tr className="border-b border-linea last:border-0">
      <td colSpan={6} className="py-3">
        <form action={accion} className="flex flex-col gap-4 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={reconocimiento.id} />
          <FormularioProdepCampos profesores={profesores} valores={estado.valores ?? reconocimiento} estado={estado} />
          {estado.error && estado.campo !== "fechas" && <Aviso tipo="error">{estado.error}</Aviso>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={claseBoton}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
          </div>
        </form>
      </td>
    </tr>
  );
}
