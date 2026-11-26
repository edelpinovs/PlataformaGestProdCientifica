"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claseBoton, claseBotonSecundario, EtiquetaEstado, Icono } from "./ui";

export type CampoDetalleModal = { etiqueta: string; valor: string; pendiente?: boolean };
export type SeccionDetalleModal = { titulo: string; campos: CampoDetalleModal[] };

/**
 * Detalle de solo lectura (issue 341). El servidor arma el contenido según el parámetro ver.
 * Cerrar (botón, Escape o clic fuera) quita ese parámetro y devuelve el foco a la fila.
 */
export function ModalDetalle({
  titulo,
  subtitulo,
  urlCerrar,
  focoAlCerrar,
  secciones,
  cargando = false,
  editarHref,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  urlCerrar: string;
  focoAlCerrar: string;
  secciones?: SeccionDetalleModal[];
  cargando?: boolean;
  /** Quien puede editar el registro. Conserva la búsqueda, los filtros, el orden y la página. */
  editarHref?: string;
  children?: ReactNode;
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
    requestAnimationFrame(() => document.getElementById(focoAlCerrar)?.focus());
  }

  return (
    <dialog ref={dialogo} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} aria-busy={cargando}
      onCancel={(evento) => { evento.preventDefault(); cerrar(); }}
      onClick={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}
      className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none border-0 bg-superficie p-5 text-texto backdrop:bg-texto/40 sm:m-auto sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:rounded-2xl">
      <div className="flex min-h-full flex-col gap-4 sm:min-h-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${id}-titulo`} className="text-base font-semibold">{titulo}</h2>
            {subtitulo && <p className="mt-1 text-sm text-texto-3">{subtitulo}</p>}
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar el detalle" title="Cerrar"
            className="rounded-xl p-2 text-texto-3 hover:bg-hover hover:text-texto">
            <Icono d="M6 6l12 12M18 6 6 18" />
          </button>
        </div>
        {cargando ? <p className="text-sm text-texto-3">Cargando…</p> : (
          <div className="flex flex-col gap-5">
            {secciones?.map((seccion) => (
              <section key={seccion.titulo} aria-label={seccion.titulo} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-texto-2">{seccion.titulo}</h3>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {seccion.campos.map((campo) => (
                    <div key={campo.etiqueta} className="flex min-w-0 flex-col gap-1">
                      <dt className="text-xs text-texto-3">{campo.etiqueta}</dt>
                      <dd className="break-words text-sm text-texto">
                        {campo.pendiente
                          ? <EtiquetaEstado tipo="aviso">{campo.valor}</EtiquetaEstado>
                          : campo.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {children}
          </div>
        )}
        <div className="mt-auto flex flex-wrap justify-end gap-2">
          {editarHref && <Link href={editarHref} className={claseBoton} scroll={false}>Editar</Link>}
          <button type="button" onClick={cerrar} className={claseBotonSecundario}>Cerrar</button>
        </div>
      </div>
    </dialog>
  );
}
