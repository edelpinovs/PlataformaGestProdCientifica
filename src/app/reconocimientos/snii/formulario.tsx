"use client";

import { ModalAlta, type EstadoAlta } from "@/components/modal-alta";
import { registrarReconocimientoSnii, type EstadoSnii } from "./actions";
import { FormularioSniiCampos, type ProfesorOpcion } from "./formulario-campos";

export function FormularioSnii({ profesores }: { profesores: ProfesorOpcion[] }) {
  async function registrarEnModal(_: EstadoAlta, datos: FormData): Promise<EstadoAlta> {
    return await registrarReconocimientoSnii({} as EstadoSnii, datos) as EstadoAlta;
  }

  return (
    <ModalAlta
      titulo="Registrar reconocimiento SNII"
      textoBoton="Registrar reconocimiento"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarEnModal}
    >
      {({ estado, valor, marcarCambios }) => (
        <FormularioSniiCampos
          profesores={profesores}
          estado={estado as EstadoSnii}
          valor={(nombre, inicial) => valor(nombre, inicial)}
          marcarCambios={marcarCambios}
        />
      )}
    </ModalAlta>
  );
}
