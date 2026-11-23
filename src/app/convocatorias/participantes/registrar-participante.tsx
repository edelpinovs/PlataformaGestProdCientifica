"use client";

import { ModalAlta } from "@/components/modal-alta";
import { SelectorProfesor } from "@/components/selector-profesor";
import { claseCampo, claseEtiqueta } from "@/components/ui";
import type { OpcionProfesor } from "@/lib/selectores/profesor";
import { registrarParticipante } from "./actions";

/** RF-018 (D-214): el alta de un participante se abre en un modal desde el listado. */
export function RegistrarParticipante({ profesores, anioActual }: { profesores: OpcionProfesor[]; anioActual: number }) {
  return (
    <ModalAlta
      titulo="Registrar participante"
      textoBoton="Registrar participante"
      descripcion="Registra a quien participó en la convocatoria. Quienes salgan en el listado oficial y no estén registrados se agregan al confirmar la carga."
      accion={registrarParticipante}
    >
      {({ estado, valor, marcarCambios }) => {
        const inicial = valor("profesorId");
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={claseEtiqueta}>
                Programa
                <select name="programa" required defaultValue={valor("programa", "SNII")}
                  aria-invalid={estado.campo === "programa"} className={claseCampo(estado.campo === "programa")}>
                  <option value="SNII">SNII</option>
                  <option value="PRODEP">PRODEP</option>
                </select>
              </label>
              <label className={claseEtiqueta}>
                Año de la convocatoria
                <input name="anio" type="number" required min={2000} max={anioActual + 1}
                  defaultValue={valor("anio", String(anioActual))}
                  aria-invalid={estado.campo === "anio"} className={claseCampo(estado.campo === "anio")} />
              </label>
            </div>
            <SelectorProfesor opciones={profesores} valorInicial={inicial ? Number(inicial) : undefined}
              alSeleccionar={marcarCambios}
              error={estado.campo === "profesorId" ? estado.error : undefined} />
          </div>
        );
      }}
    </ModalAlta>
  );
}
