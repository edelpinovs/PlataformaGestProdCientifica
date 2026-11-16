"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario } from "@/components/ui";
import {
  RESULTADOS_PRODEP,
  TIPOS_SOLICITUD_PRODEP,
} from "@/modules/reconocimientos/prodep";
import { editarReconocimientoProdep, type EstadoProdep } from "./actions";
import {
  FormularioProdepCampos,
  type HistorialConProfesor,
  type ProfesorProdep,
} from "./formulario-campos";

type ReconocimientoEdicion = {
  id: number;
  tipoSolicitud: (typeof TIPOS_SOLICITUD_PRODEP)[number];
  resultado: (typeof RESULTADOS_PRODEP)[number];
  inicio: Date;
  fin: Date;
  profesor: ProfesorProdep;
};

export function FormularioEdicionProdep({ reconocimiento, profesores, historial, cerrar }: {
  reconocimiento: ReconocimientoEdicion;
  profesores: ProfesorProdep[];
  historial: HistorialConProfesor[];
  cerrar: () => void;
}) {
  const [estado, accion, guardando] = useActionState<EstadoProdep, FormData>(editarReconocimientoProdep, {});
  const valores = estado.valores ?? {
    profesorId: String(reconocimiento.profesor.id),
    tipoSolicitud: reconocimiento.tipoSolicitud,
    resultado: reconocimiento.resultado,
    fechaInicio: reconocimiento.inicio.toISOString().slice(0, 10),
    fechaFin: reconocimiento.fin.toISOString().slice(0, 10),
  };

  return (
    <tr>
      <td colSpan={6} className="p-3">
        <form action={accion} className="flex flex-col gap-4 rounded-xl bg-superficie-alt p-4">
          <input type="hidden" name="id" value={reconocimiento.id} />
          <FormularioProdepCampos profesores={profesores} historial={historial} valores={valores} estado={estado}
            excluirId={reconocimiento.id} />
          {estado.error && estado.campo !== "fechaFin" && <Aviso tipo="error">{estado.error}</Aviso>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={guardando} className={claseBoton}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
            <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
          </div>
        </form>
      </td>
    </tr>
  );
}
