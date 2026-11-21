"use client";

import { ModalAlta } from "@/components/modal-alta";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarDepartamento } from "./actions";

type Division = { id: number; nombre: string; clave: string };

/** D-214: el alta de un departamento se abre en un modal desde el listado. */
export function RegistrarDepartamento({ divisiones }: { divisiones: Division[] }) {
  return (
    <ModalAlta
      titulo="Registrar departamento"
      textoBoton="Registrar departamento"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarDepartamento}
    >
      {({ estado, valor }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${claseEtiqueta} sm:col-span-2`}>
            <span>División académica <span aria-hidden className="text-peligro">*</span></span>
            <select name="divisionId" required defaultValue={valor("divisionId")}
              aria-invalid={estado.campo === "divisionId"}
              className={claseCampo(estado.campo === "divisionId")}>
              <option value="" disabled>Elige una división</option>
              {divisiones.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre} ({d.clave})</option>
              ))}
            </select>
          </label>
          <label className={claseEtiqueta}>
            <span>Nombre <span aria-hidden className="text-peligro">*</span></span>
            <input name="nombre" required maxLength={150} placeholder="Departamento de Ciencias Exactas"
              defaultValue={valor("nombre")}
              aria-invalid={estado.campo === "nombre"}
              className={claseCampo(estado.campo === "nombre")} />
          </label>
          <label className={claseEtiqueta}>
            <span>Nomenclatura <span aria-hidden className="text-peligro">*</span></span>
            <input name="nomenclatura" required maxLength={20} placeholder="DCE"
              defaultValue={valor("nomenclatura")}
              aria-invalid={estado.campo === "nomenclatura"}
              className={claseCampo(estado.campo === "nomenclatura")} />
          </label>
        </div>
      )}
    </ModalAlta>
  );
}
