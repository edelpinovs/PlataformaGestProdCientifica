"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseBotonSecundario } from "@/components/ui";
import { editarReconocimientoSnii, type EstadoSnii } from "./actions";
import { FormularioSniiCampos, type ProfesorOpcion, type ValoresSnii } from "./formulario-campos";

type ReconocimientoEdicion = {
  id: number;
  nivel: ValoresSnii["nivel"];
  tipoParticipacion: ValoresSnii["tipoParticipacion"];
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
  inicio: Date;
  fin: Date;
  profesor: ProfesorOpcion;
};

export function FormularioEdicionSnii({ reconocimiento, profesores, cerrar }: {
  reconocimiento: ReconocimientoEdicion;
  profesores: ProfesorOpcion[];
  cerrar: () => void;
}) {
  const [estado, accion, guardando] = useActionState<EstadoSnii, FormData>(editarReconocimientoSnii, {});
  const valores: ValoresSnii = estado.valores ?? {
    profesorId: String(reconocimiento.profesor.id),
    cvu: reconocimiento.profesor.cvu ?? "",
    nivel: reconocimiento.nivel,
    tipoParticipacion: reconocimiento.tipoParticipacion,
    fechaInicio: reconocimiento.inicio.toISOString().slice(0, 10),
    fechaFin: reconocimiento.fin.toISOString().slice(0, 10),
    enRecursoReconsideracion: reconocimiento.resultado === "EN_RECONSIDERACION",
  };

  return (
    <li className="border-b border-linea py-3 last:border-0">
      <form action={accion} className="flex flex-col gap-4 rounded-xl bg-superficie-alt p-4">
        <input type="hidden" name="id" value={reconocimiento.id} />
        <FormularioSniiCampos profesores={profesores} valores={valores} estado={estado} />
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        <div className="flex gap-2">
          <button type="submit" disabled={guardando} className={claseBoton}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
          <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
        </div>
      </form>
    </li>
  );
}