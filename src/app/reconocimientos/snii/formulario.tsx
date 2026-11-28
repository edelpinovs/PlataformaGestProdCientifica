"use client";

import { ModalAlta } from "@/components/modal-alta";
import { registrarReconocimientoSniiEnModal } from "./actions";
import { FormularioSniiCampos, type ProfesorOpcion } from "./formulario-campos";

export function FormularioSnii({ profesores }: { profesores: ProfesorOpcion[] }) {
  return (
    <ModalAlta
      titulo="Registrar reconocimiento SNII"
      textoBoton="Registrar reconocimiento"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarReconocimientoSniiEnModal}
    >
      {({ estado, valor, marcarCambios }) => (
        <FormularioSniiCampos
          profesores={profesores}
          estado={{ campo: estado.campo }}
          valores={{
            profesorId: valor("profesorId"),
            cvu: valor("cvu"),
            confirmarCambioCvu: valor("confirmarCambioCvu") === "on",
            nivel: valor("nivel"),
            tipoParticipacion: valor("tipoParticipacion"),
            fechaInicio: valor("fechaInicio"),
            fechaFin: valor("fechaFin"),
            enRecursoReconsideracion: valor("enRecursoReconsideracion") === "on",
          }}
          marcarCambiosProfesor={marcarCambios}
        />
      )}
    </ModalAlta>
  );
}
