"use client";

import { ModalAlta } from "@/components/modal-alta";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarGrado } from "./actions";

/** D-214: el alta de un grado científico se abre en un modal desde el listado. */
export function RegistrarGrado() {
  return (
    <ModalAlta
      titulo="Registrar grado científico"
      textoBoton="Registrar grado"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarGrado}
    >
      {({ estado, valor }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            <span>Nombre <span aria-hidden className="text-peligro">*</span></span>
            <input name="nombre" required maxLength={100} placeholder="Doctorado"
              defaultValue={valor("nombre")}
              aria-invalid={estado.campo === "nombre"}
              className={claseCampo(estado.campo === "nombre")} />
          </label>
          <label className={claseEtiqueta}>
            <span>Nomenclatura <span aria-hidden className="text-peligro">*</span></span>
            <input name="nomenclatura" required maxLength={10} placeholder="DR"
              defaultValue={valor("nomenclatura")}
              aria-invalid={estado.campo === "nomenclatura"}
              className={claseCampo(estado.campo === "nomenclatura")} />
          </label>
        </div>
      )}
    </ModalAlta>
  );
}
