"use client";

import { useActionState } from "react";
import { registrarGrado, type EstadoGrado } from "./actions";

const campo = "rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";
const campoConError = "rounded border border-red-600 px-3 py-2 dark:bg-neutral-900";

export function FormularioGrado() {
  const [estado, accion, enviando] = useActionState<EstadoGrado, FormData>(registrarGrado, {});

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Nombre
          <input name="nombre" required maxLength={100} placeholder="Doctorado"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"}
            className={estado.campo === "nombre" ? campoConError : campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:w-40">
          Nomenclatura
          <input name="nomenclatura" required maxLength={10} placeholder="DR"
            defaultValue={estado.valores?.nomenclatura}
            aria-invalid={estado.campo === "nomenclatura"}
            className={estado.campo === "nomenclatura" ? campoConError : campo} />
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
