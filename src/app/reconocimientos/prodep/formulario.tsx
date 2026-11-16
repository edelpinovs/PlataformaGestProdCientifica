"use client";

import { useActionState } from "react";
import { Aviso, claseBoton } from "@/components/ui";
import { registrarReconocimientoProdep, type EstadoProdep } from "./actions";
import {
  FormularioProdepCampos,
  type HistorialConProfesor,
  type ProfesorProdep,
} from "./formulario-campos";

export function FormularioProdep({ profesores, historial }: {
  profesores: ProfesorProdep[];
  historial: HistorialConProfesor[];
}) {
  const [estado, accion, enviando] = useActionState<EstadoProdep, FormData>(registrarReconocimientoProdep, {});

  return (
    <form key={estado.registrado ?? "formulario-prodep"} action={accion} className="flex flex-col gap-4">
      <FormularioProdepCampos profesores={profesores} historial={historial} valores={estado.valores} estado={estado} />
      {estado.error && estado.campo !== "fechaFin" && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && <Aviso tipo="exito">Se registró el reconocimiento PRODEP para el profesor seleccionado.</Aviso>}
      <div>
        <button type="submit" disabled={enviando || profesores.length === 0} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar reconocimiento"}
        </button>
      </div>
    </form>
  );
}
