"use client";

import { ModalAlta } from "@/components/modal-alta";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarArea } from "./actions";

/** D-214: el alta de un área se abre en un modal desde el listado. */
export function RegistrarArea() {
  return (
    <ModalAlta
      titulo="Registrar área"
      textoBoton="Registrar área"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarArea}
    >
      {({ estado, valor }) => (
        <label className={claseEtiqueta}>
          <span>Nombre <span aria-hidden className="text-peligro">*</span></span>
          <input name="nombre" required maxLength={150} placeholder="Ciencias de la Salud"
            defaultValue={valor("nombre")}
            aria-invalid={estado.campo === "nombre"}
            className={claseCampo(estado.campo === "nombre")} />
        </label>
      )}
    </ModalAlta>
  );
}
