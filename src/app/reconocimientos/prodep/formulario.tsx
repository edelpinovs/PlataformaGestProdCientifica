"use client";

import { useActionState } from "react";
import { Aviso, claseBoton } from "@/components/ui";
import { registrarReconocimientoProdep, type EstadoProdep } from "./actions";
import { FormularioProdepCampos, type ProfesorProdep } from "./formulario-campos";

export function FormularioProdep({ profesores }: { profesores: ProfesorProdep[] }) {
  const [estado, accion, registrando] = useActionState<EstadoProdep, FormData>(registrarReconocimientoProdep, {});

  return (
    <form key={estado.registrado ? "registro-prodep" : "formulario-prodep"} action={accion} className="flex flex-col gap-4">
      <FormularioProdepCampos profesores={profesores} valores={estado.valores} estado={estado} />
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && <Aviso tipo="exito">Se registró el reconocimiento PRODEP.</Aviso>}
      <div>
        <button type="submit" disabled={registrando || profesores.length === 0} className={claseBoton}>
          {registrando ? "Registrando…" : "Registrar reconocimiento"}
        </button>
      </div>
    </form>
  );
}
