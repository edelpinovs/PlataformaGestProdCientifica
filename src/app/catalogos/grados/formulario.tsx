"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarGrado, type EstadoGrado } from "./actions";

export function FormularioGrado() {
  const [estado, accion, enviando] = useActionState<EstadoGrado, FormData>(registrarGrado, {});

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrado ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className={`${claseEtiqueta} flex-1`}>
          Nombre
          <input name="nombre" required maxLength={100} placeholder="Doctorado"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"}
            className={claseCampo(estado.campo === "nombre")} />
        </label>
        <label className={`${claseEtiqueta} sm:w-40`}>
          Nomenclatura
          <input name="nomenclatura" required maxLength={10} placeholder="DR"
            defaultValue={estado.valores?.nomenclatura}
            aria-invalid={estado.campo === "nomenclatura"}
            className={claseCampo(estado.campo === "nomenclatura")} />
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrado && (
        <Aviso tipo="exito">Se registró «{estado.registrado}».</Aviso>
      )}
    </form>
  );
}
