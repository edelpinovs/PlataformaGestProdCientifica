import { redirect } from "next/navigation";
import { PantallaAcceso } from "@/components/pantalla-acceso";
import { claseBoton } from "@/components/ui";
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
    <PantallaAcceso
      titulo={esInvitacion ? "Te invitaron a la plataforma" : "Restablece tu contraseña"}
      subtitulo={`Plataforma de Gestión de la Producción Científica. Pulsa continuar para ${esInvitacion ? "activar tu cuenta y definir tu contraseña" : "definir una contraseña nueva"}.`}
    >
      <form action={confirmarEnlace} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className={claseBoton}>Continuar</button>
      </form>
    </PantallaAcceso>
  );
}
