"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

export function FormularioLogin({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-neutral-500">Plataforma de Gestión de la Producción Científica</p>
      </div>
      <form action={accion} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Correo institucional
          <input id="correo" name="correo" type="email" required autoComplete="email"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input id="contrasena" name="contrasena" type="password" required autoComplete="current-password"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        {aviso && !estado.error && <p role="status" className="text-sm text-amber-700">{aviso}</p>}
        {estado.error && <p role="alert" className="text-sm text-red-600">{estado.error}</p>}
        <button type="submit" disabled={enviando}
          className="rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
