"use client";

import { useActionState } from "react";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { MINIMO_CONTRASENA } from "@/modules/cuenta/contrasena";
import { cambiarContrasena, type EstadoCambioContrasena } from "./actions";

export function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState<EstadoCambioContrasena, FormData>(cambiarContrasena, {});

  return (
    <form action={accion} className="flex max-w-md flex-col gap-4">
      <label className={claseEtiqueta}>
        Contraseña actual
        <input name="actual" type="password" required autoComplete="current-password"
          aria-invalid={estado.campo === "actual"} className={claseCampo(estado.campo === "actual")} />
      </label>
      <label className={claseEtiqueta}>
        Nueva contraseña
        <input name="nueva" type="password" required minLength={MINIMO_CONTRASENA} autoComplete="new-password"
          aria-invalid={estado.campo === "nueva"} className={claseCampo(estado.campo === "nueva")} />
      </label>
      <label className={claseEtiqueta}>
        Repite la nueva contraseña
        <input name="confirmacion" type="password" required minLength={MINIMO_CONTRASENA} autoComplete="new-password"
          aria-invalid={estado.campo === "confirmacion"} className={claseCampo(estado.campo === "confirmacion")} />
      </label>
      <p className="text-xs text-texto-3">Mínimo {MINIMO_CONTRASENA} caracteres y distinta de la actual.</p>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.exito && <Aviso tipo="exito">{estado.exito}</Aviso>}
      <button type="submit" disabled={enviando} className={`${claseBoton} w-fit`}>
        {enviando ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
