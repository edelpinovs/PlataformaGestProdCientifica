"use client";

import { ModalAlta } from "@/components/modal-alta";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarSubarea } from "./actions";

type Area = { id: number; nombre: string };

/** D-214: el alta de una subárea se abre en un modal desde el listado. */
export function RegistrarSubarea({ areas }: { areas: Area[] }) {
  return (
    <ModalAlta
      titulo="Registrar subárea"
      textoBoton="Registrar subárea"
      descripcion="Los campos marcados con * son obligatorios."
      accion={registrarSubarea}
    >
      {({ estado, valor }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${claseEtiqueta} sm:col-span-2`}>
            <span>Área <span aria-hidden className="text-peligro">*</span></span>
            <select name="areaId" required defaultValue={valor("areaId")}
              aria-invalid={estado.campo === "areaId"}
              className={claseCampo(estado.campo === "areaId")}>
              <option value="" disabled>Elige un área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </label>
          <label className={`${claseEtiqueta} sm:col-span-2`}>
            <span>Nombre <span aria-hidden className="text-peligro">*</span></span>
            <input name="nombre" required maxLength={150} placeholder="Genética molecular"
              defaultValue={valor("nombre")}
              aria-invalid={estado.campo === "nombre"}
              className={claseCampo(estado.campo === "nombre")} />
          </label>
        </div>
      )}
    </ModalAlta>
  );
}
