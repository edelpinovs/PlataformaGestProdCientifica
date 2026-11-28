"use client";

import { ModalAlta } from "@/components/modal-alta";
import { registrarReconocimientoSnii } from "./actions";
import { FormularioSniiCampos, type ProfesorOpcion } from "./formulario-campos";

export function FormularioSnii({ profesores }: { profesores: ProfesorOpcion[] }) {
  return (
    <ModalAlta
      titulo="Registrar reconocimiento SNII"
      textoBoton="Registrar reconocimiento"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarReconocimientoSnii}
    >
      {({ estado, valor }) => (
        <FormularioSniiCampos profesores={profesores} estado={estado} valor={valor} />
      )}
    </ModalAlta>
  );
}
