import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/roles";

export function Encabezado({ correo, rol }: { correo: string; rol: Rol }) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold">PGPC · CUValles</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{correo} · {ETIQUETA_ROL[rol]}</span>
          <Link href="/cuenta/contrasena" className="underline underline-offset-2">Cambiar contraseña</Link>
          <form action={cerrarSesion}>
            <button type="submit" className="underline underline-offset-2">Cerrar sesión</button>
          </form>
        </div>
      </div>
    </header>
  );
}
