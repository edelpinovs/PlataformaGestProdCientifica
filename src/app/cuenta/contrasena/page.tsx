"use client";

import { useActionState } from "react";
import { guardarContrasena, type EstadoContrasena } from "./actions";

export default function ContrasenaPage() {
  const [estado, accion, enviando] = useActionState<EstadoContrasena, FormData>(
    guardarContrasena,
    {},
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Define tu contraseña</h1>
        <p className="text-sm text-neutral-500">La usarás para entrar a la plataforma con tu correo institucional.</p>
      </div>
      <form action={accion} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nueva contraseña
          <input id="contrasena" name="contrasena" type="password" required minLength={8} autoComplete="new-password"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Repite la contraseña
          <input id="confirmacion" name="confirmacion" type="password" required minLength={8} autoComplete="new-password"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        </label>
        {estado.error && <p role="alert" className="text-sm text-red-600">{estado.error}</p>}
        <button type="submit" disabled={enviando}
          className="rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
          {enviando ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </main>
  );
}
