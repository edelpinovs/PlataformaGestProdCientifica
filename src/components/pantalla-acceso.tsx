// Estructura de las pantallas sin menú (iniciar sesión, confirmar enlace, definir contraseña):
// tarjeta centrada sobre el fondo de la plataforma. Pauta: docs/diseno/PAUTA_VISUAL.md.
export function PantallaAcceso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-fondo p-4 text-texto">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-[28px] bg-superficie p-6 shadow-marco sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-marca text-sm font-bold text-sobre-marca">P</span>
          <span>
            <span className="block text-sm font-semibold leading-tight">PGPC</span>
            <span className="block text-xs text-texto-3">CUValles</span>
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm text-texto-3">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
