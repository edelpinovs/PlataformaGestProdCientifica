"use client";

import { ModalAlta } from "@/components/modal-alta";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarDivision } from "./actions";

/** D-214: el alta de una división académica se abre en un modal desde el listado. */
export function RegistrarDivision() {
  return (
    <ModalAlta
      titulo="Registrar división académica"
      textoBoton="Registrar división"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarDivision}
    >
      {({ estado, valor }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            <span>Nombre <span aria-hidden className="text-peligro">*</span></span>
            <input name="nombre" required maxLength={150} placeholder="División de Ingenierías"
              defaultValue={valor("nombre")}
              aria-invalid={estado.campo === "nombre"}
              className={claseCampo(estado.campo === "nombre")} />
          </label>
          <label className={claseEtiqueta}>
            <span>Clave institucional <span aria-hidden className="text-peligro">*</span></span>
            <input name="clave" required maxLength={20} placeholder="DI"
              defaultValue={valor("clave")}
              aria-invalid={estado.campo === "clave"}
              className={claseCampo(estado.campo === "clave")} />
          </label>
        </div>
      )}
    </ModalAlta>
  );
}
