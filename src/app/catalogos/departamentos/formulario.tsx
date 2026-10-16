"use client";

import { useActionState } from "react";
import { registrarDepartamento, type EstadoDepartamento } from "./actions";

const campo = "rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";
const campoConError = "rounded border border-red-600 px-3 py-2 dark:bg-neutral-900";

type Opcion = { id: number; nombre: string; clave: string };

export function FormularioDepartamento({ divisiones }: { divisiones: Opcion[] }) {
  const [estado, accion, enviando] = useActionState<EstadoDepartamento, FormData>(registrarDepartamento, {});
  const clase = (nombre: EstadoDepartamento["campo"]) => (estado.campo === nombre ? campoConError : campo);

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm sm:w-64">
          División académica
          <select name="divisionId" required defaultValue={estado.valores?.divisionId ?? ""}
            aria-invalid={estado.campo === "divisionId"} className={clase("divisionId")}>
            <option value="" disabled>Elige una división</option>
            {divisiones.map((d) => (
              <option key={d.id} value={d.id}>{d.nombre} ({d.clave})</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm sm:min-w-56">
          Nombre
          <input name="nombre" required maxLength={150} placeholder="Departamento de Ciencias Exactas"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"} className={clase("nombre")} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:w-40">
          Nomenclatura
          <input name="nomenclatura" required maxLength={20} placeholder="DCE"
            defaultValue={estado.valores?.nomenclatura}
            aria-invalid={estado.campo === "nomenclatura"} className={clase("nomenclatura")} />
        </label>
        <button type="submit" disabled={enviando}
          className="rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <p role="alert" className="text-sm text-red-600">{estado.error}</p>}
      {estado.registrado && (
        <p role="status" className="text-sm text-teal-700">Se registró «{estado.registrado}».</p>
      )}
    </form>
  );
}
