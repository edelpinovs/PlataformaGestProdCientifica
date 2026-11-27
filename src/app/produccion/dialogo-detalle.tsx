"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { claseBotonSecundario, Icono } from "@/components/ui";

/** Ojo de 24×24 para «Ver detalle». Se define aquí mientras el issue 341 no agregue `ver` a ICONOS. */
export const ICONO_VER = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";

/**
 * Detalle de solo lectura en un `<dialog>` modal. El contenido lo arma el servidor según la URL
 * (`?registro=<id>`); cerrar (botón, Escape o clic fuera) quita ese parámetro sin mover el scroll
 * y devuelve el foco al icono de la fila que lo abrió.
 */
export function DialogoDetalle({ titulo, urlCerrar, focoAlCerrar, children }: {
  titulo: string;
  /** URL del listado sin `registro`, con la búsqueda, los filtros, el orden y la página actuales. */
  urlCerrar: string;
  /** `id` del elemento que recibe el foco al cerrar. */
  focoAlCerrar: string;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const cerrando = useRef(false);
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento || elemento.open) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    elemento.showModal();
    return () => { document.body.style.overflow = anterior; };
  }, []);

  function cerrar() {
    if (cerrando.current) return;
    cerrando.current = true;
    dialogo.current?.close();
    document.body.style.overflow = "";
    router.replace(urlCerrar, { scroll: false });
    // El icono de la fila sigue en la página: el foco vuelve a él para seguir con el teclado.
    requestAnimationFrame(() => document.getElementById(focoAlCerrar)?.focus());
  }

  return <dialog ref={dialogo} aria-modal="true" aria-labelledby={`${id}-titulo`}
    onCancel={(evento) => { evento.preventDefault(); cerrar(); }}
    onClick={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}
    className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl border-0 bg-superficie p-0 text-texto backdrop:bg-texto/40">
    {/* El relleno va en este contenedor: así un clic en el margen interior no llega al <dialog> ni lo cierra. */}
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-titulo`} className="text-base font-semibold">{titulo}</h2>
        <button type="button" onClick={cerrar} aria-label="Cerrar el detalle" title="Cerrar"
          className="rounded-xl p-2 text-texto-3 hover:bg-hover hover:text-texto">
          <Icono d="M6 6l12 12M18 6 6 18" />
        </button>
      </div>
      {children}
      <div className="flex justify-end">
        <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cerrar</button>
      </div>
    </div>
  </dialog>;
}
