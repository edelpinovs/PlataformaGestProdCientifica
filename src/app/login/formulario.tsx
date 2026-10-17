"use client";

import { useActionState } from "react";
import { PantallaAcceso } from "@/components/pantalla-acceso";
import { Aviso, claseBoton, claseCampo, claseEtiqueta } from "@/components/ui";
import { iniciarSesion, type EstadoLogin } from "./actions";
import { SesionDesdeEnlace } from "./sesion-desde-enlace";

export function FormularioLogin({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <PantallaAcceso titulo="Iniciar sesión" subtitulo="Plataforma de Gestión de la Producción Científica">
      <SesionDesdeEnlace />
      <form action={accion} className="flex flex-col gap-4">
        {/* Si se activa SIIAU, este formulario también pedirá el código UDG (name="codigo").
            Ver docs/diseno/LOGIN_SIIAU.md. */}
        <label className={claseEtiqueta}>
          Correo institucional
          <input id="correo" name="correo" type="email" required autoComplete="email" defaultValue={estado.correo}
            className={claseCampo(Boolean(estado.error))} />
        </label>
        <label className={claseEtiqueta}>
          Contraseña
          <input id="contrasena" name="contrasena" type="password" required autoComplete="current-password"
            className={claseCampo(Boolean(estado.error))} />
        </label>
        {aviso && !estado.error && <Aviso tipo="aviso">{aviso}</Aviso>}
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </PantallaAcceso>
  );
}
