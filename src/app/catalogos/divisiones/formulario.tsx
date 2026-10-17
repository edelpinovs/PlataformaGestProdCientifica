"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { registrarDivision, type EstadoDivision } from "./actions";

export function FormularioDivision() {
  const [estado, accion, enviando] = useActionState<EstadoDivision, FormData>(registrarDivision, {});

  return (
    // La key vacía los campos tras un alta y conserva lo escrito si hubo error.
    <form key={estado.registrada ?? "formulario"} action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className={`${claseEtiqueta} flex-1`}>
          Nombre
          <input name="nombre" required maxLength={150} placeholder="División de Ingenierías"
            defaultValue={estado.valores?.nombre}
            aria-invalid={estado.campo === "nombre"}
            className={claseCampo(estado.campo === "nombre")} />
        </label>
        <label className={`${claseEtiqueta} sm:w-40`}>
          Clave institucional
          <input name="clave" required maxLength={20} placeholder="DI"
            defaultValue={estado.valores?.clave}
            aria-invalid={estado.campo === "clave"}
            className={claseCampo(estado.campo === "clave")} />
        </label>
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.registrada && (
        <Aviso tipo="exito">Se registró «{estado.registrada}».</Aviso>
      )}
    </form>
  );
}
