"use client";

import { ModalAlta } from "@/components/modal-alta";
import { CamposProfesor } from "./campos-profesor";
import { crearProfesorEnModal } from "./actions";

type Props = {
  grados: { id: number; nombre: string; nomenclatura: string }[];
  departamentos: { id: number; nombre: string }[];
};

/** Piloto de D-214 y D-216: el alta de un profesor se abre en un modal desde el listado. */
export function RegistrarProfesor({ grados, departamentos }: Props) {
  return (
    <ModalAlta
      titulo="Registrar profesor"
      textoBoton="Registrar profesor"
      descripcion="Los campos marcados con * son obligatorios."
      accion={crearProfesorEnModal}
    >
      {({ estado, valor }) => (
        <CamposProfesor
          grados={grados}
          departamentos={departamentos}
          valor={(nombre) => valor(nombre)}
          campo={estado.campo}
        />
      )}
    </ModalAlta>
  );
}
