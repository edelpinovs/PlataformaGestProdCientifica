"use client";

import { useActionState } from "react";
import { Aviso, claseBoton } from "@/components/ui";
import { registrarReconocimientoSnii, type EstadoSnii } from "./actions";
import { FormularioSniiCampos, type ProfesorOpcion } from "./formulario-campos";

export function FormularioSnii({ profesores }: { profesores: ProfesorOpcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoSnii, FormData>(registrarReconocimientoSnii, {});

  return (
    <form key={estado.registrado ?? "formulario-snii"} action={accion} className="flex flex-col gap-4">
      <FormularioSniiCampos profesores={profesores} valores={estado.valores} estado={estado} />
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && <Aviso tipo="exito">Se registró el reconocimiento para el CVU {estado.registrado}.</Aviso>}
      <div>
        <button type="submit" disabled={enviando || profesores.length === 0} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar reconocimiento"}
        </button>
      </div>
    </form>
  );
}