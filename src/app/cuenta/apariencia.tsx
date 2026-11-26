"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema } from "@/components/aplicar-tema";
import { ETIQUETA_TEMA, temaDe, TEMAS, type Tema } from "@/modules/cuenta/tema";

// El tema vive en el atributo data-tema de <html> (lo pone el script de src/app/layout.tsx).
// Se lee con useSyncExternalStore: el servidor no lo conoce y muestra «claro» hasta hidratar,
// y el selector del menú lateral y este se mantienen sincronizados porque observan el atributo.
function suscribir(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => observador.disconnect();
}

const leerTema = (): Tema => temaDe(document.documentElement.getAttribute("data-tema"));
const temaDelServidor = (): Tema => "claro";

export function Apariencia() {
  const actual = useSyncExternalStore(suscribir, leerTema, temaDelServidor);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Tema de la interfaz" className="inline-flex w-fit gap-1 rounded-xl bg-superficie-alt p-1">
        {TEMAS.map((tema) => (
          <button
            key={tema}
            type="button"
            aria-pressed={actual === tema}
            onClick={() => aplicarTema(tema)}
            className={`rounded-lg px-4 py-2 text-sm ${
              actual === tema ? "bg-marca-suave font-medium text-marca" : "text-texto-2 hover:bg-hover"
            }`}
          >
            {ETIQUETA_TEMA[tema]}
          </button>
        ))}
      </div>
      <p className="text-xs text-texto-3">Se guarda en tu cuenta y se aplica en toda la plataforma, también en otros navegadores.</p>
    </div>
  );
}
