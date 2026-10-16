"use client";

import { useActionState } from "react";
import { registrarDivision, type EstadoDivision } from "./actions";

const campo = "rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";
const campoConError = "rounded border border-red-600 px-3 py-2 dark:bg-neutral-900";

export function FormularioDivision() {
  const [estado, accion, enviando] = useActionState<EstadoDivision, FormData>(registrarDivision, {});

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrada ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Nombre
          <input name="nombre" required maxLength={150} placeholder="División de Ingenierías"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"}
            className={estado.campo === "nombre" ? campoConError : campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:w-40">
          Clave institucional
          <input name="clave" required maxLength={20} placeholder="DI"
            defaultValue={estado.valores?.clave}
            aria-invalid={estado.campo === "clave"}
            className={estado.campo === "clave" ? campoConError : campo} />
        </label>
        <button type="submit" disabled={enviando}
          className="rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <p role="alert" className="text-sm text-red-600">{estado.error}</p>}
      {estado.registrada && (
        <p role="status" className="text-sm text-teal-700">Se registró «{estado.registrada}».</p>
      )}
    </form>
  );
}
