"use client";

import { useActionState } from "react";
import { PantallaAcceso } from "@/components/pantalla-acceso";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { guardarContrasena, type EstadoContrasena } from "./actions";

export default function ContrasenaPage() {
  const [estado, accion, enviando] = useActionState<EstadoContrasena, FormData>(
    guardarContrasena,
    {},
  );

  return (
    <PantallaAcceso titulo="Define tu contraseña"
      subtitulo="La usarás para entrar a la plataforma con tu correo institucional.">
      <form action={accion} className="flex flex-col gap-4">
        <label className={claseEtiqueta}>
          Nueva contraseña
          <input id="contrasena" name="contrasena" type="password" required minLength={8} autoComplete="new-password"
            className={claseCampo()} />
        </label>
        <label className={claseEtiqueta}>
          Repite la contraseña
          <input id="confirmacion" name="confirmacion" type="password" required minLength={8} autoComplete="new-password"
            className={claseCampo()} />
        </label>
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </PantallaAcceso>
  );
}
