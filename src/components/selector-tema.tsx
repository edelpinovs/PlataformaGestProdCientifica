"use client";

import { aplicarTema } from "./aplicar-tema";

// Cambia entre tema claro (predeterminado) y oscuro, y lo guarda un año en la cookie `tema`,
// que el script de src/app/layout.tsx lee antes de pintar, y en el perfil (issue 283).
// Muestra las dos etiquetas y el CSS (variante dark:) decide cuál se ve: así el servidor
// no necesita saber el tema y no hay desajuste al hidratar.
export function SelectorTema({ className = "" }: { className?: string }) {
  function cambiar() {
    const raiz = document.documentElement;
    const tema = raiz.getAttribute("data-tema") === "oscuro" ? "claro" : "oscuro";
    aplicarTema(tema);
  }

  return (
    <button type="button" onClick={cambiar} className={className}>
      <span className="dark:hidden">Tema oscuro</span>
      <span className="hidden dark:inline">Tema claro</span>
    </button>
  );
}
