import { redirect } from "next/navigation";
import { esTipoEnlace } from "@/lib/auth/enlace";
import { confirmarEnlace } from "./actions";

// Destino de los enlaces que generan `npm run invitar` e `invitar:lote`.
// Abrir la página no consume el enlace; el botón sí.
export default async function ConfirmarPage({ searchParams }: PageProps<"/auth/confirmar">) {
  const { token_hash: tokenHash, type } = await searchParams;
  if (typeof tokenHash !== "string" || !tokenHash || !esTipoEnlace(type)) {
    redirect("/login?error=enlace-invalido");
  }

  const esInvitacion = type === "invite";
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{esInvitacion ? "Te invitaron a la plataforma" : "Restablece tu contraseña"}</h1>
        <p className="text-sm text-neutral-500">
          Plataforma de Gestión de la Producción Científica. Pulsa continuar para {esInvitacion ? "activar tu cuenta y definir tu contraseña" : "definir una contraseña nueva"}.
        </p>
      </div>
      <form action={confirmarEnlace} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className="rounded bg-teal-700 px-3 py-2 font-medium text-white hover:bg-teal-800">
          Continuar
        </button>
      </form>
    </main>
  );
}
