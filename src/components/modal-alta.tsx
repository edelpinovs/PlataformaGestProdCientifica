"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Aviso, claseBoton, claseBotonSecundario } from "./ui";
import { decidirCierre, resultadoAlta, valoresAlta, type EstadoAlta } from "./modal-alta-logica";

export type { EstadoAlta, ValoresAlta } from "./modal-alta-logica";

type CamposAlta = {
  estado: EstadoAlta;
  enviando: boolean;
  /** Valor de un campo simple conservado tras un error del servidor. */
  valor: (nombre: string, inicial?: string) => string;
  /** Para controles propios que no emiten change/input en el formulario. */
  marcarCambios: () => void;
};

type Props = {
  titulo: string;
  textoBoton: string;
  descripcion?: string;
  accion: (estado: EstadoAlta, datos: FormData) => Promise<EstadoAlta>;
  /** Se compone desde un componente cliente; no se pasa una función desde una página servidor. */
  children: (campos: CamposAlta) => ReactNode;
};

/** Alta reutilizable. El módulo conserva permisos, validación Zod y revalidatePath en su acción. */
export function ModalAlta(props: Props) {
  const [abierto, abrir] = useState(false);
  const [aviso, cambiarAviso] = useState("");
  const disparador = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!abierto && devolverFoco.current) {
      disparador.current?.focus();
      devolverFoco.current = false;
    }
  }, [abierto]);

  function cerrar() {
    devolverFoco.current = true;
    abrir(false);
  }

  function guardado(mensaje: string) {
    cambiarAviso(`${mensaje} El registro puede quedar fuera de esta vista por la búsqueda, los filtros o la página actual.`);
    cerrar();
    // refresh conserva la URL completa y el estado del listado; no navega al inicio.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div><button ref={disparador} type="button" className={claseBoton} onClick={() => { cambiarAviso(""); abrir(true); }}>{props.textoBoton}</button></div>
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {abierto && <DialogoAlta {...props} cerrar={cerrar} guardado={guardado} />}
    </div>
  );
}

function DialogoAlta({ titulo, descripcion, accion, children, cerrar, guardado }: Props & { cerrar: () => void; guardado: (mensaje: string) => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const continuar = useRef<HTMLButtonElement>(null);
  const bloqueo = useRef(false);
  const valoresIniciales = useRef("");
  const [conCambios, cambiarCambios] = useState(false);
  const [confirmando, confirmar] = useState(false);
  const id = useId();
  const [estado, enviar, enviando] = useActionState(async (anterior: EstadoAlta & { intento: number }, datos: FormData) => {
    let resultado: EstadoAlta;
    try {
      // No se envía el contador local al servidor ni se acepta éxito sin confirmación explícita.
      const previo: EstadoAlta = { error: anterior.error, campo: anterior.campo, valores: anterior.valores, exito: anterior.exito };
      resultado = resultadoAlta(await accion(previo, datos), datos);
    } catch {
      resultado = resultadoAlta({ error: "No se pudo guardar. Tus datos siguen en el formulario; inténtalo de nuevo." }, datos);
    } finally {
      bloqueo.current = false;
    }
    if (resultado.exito) guardado(resultado.exito);
    return { ...resultado, intento: anterior.intento + 1 };
  }, { intento: 0 });

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (formulario.current) valoresIniciales.current = JSON.stringify(valoresAlta(new FormData(formulario.current)));
    elemento.showModal();
    return () => { elemento.close(); document.body.style.overflow = anterior; };
  }, []);

  useEffect(() => {
    if (confirmando) continuar.current?.focus();
    else {
      const campo = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?? formulario.current?.querySelector<HTMLElement>(estado.error ? '[data-error-alta]' : 'input:not([type="hidden"]), select, textarea, button');
      campo?.focus();
    }
  }, [confirmando, estado.intento, estado.error]);

  function pedirCierre() {
    const decision = decidirCierre(enviando || bloqueo.current, conCambios);
    if (decision === "cerrar") cerrar();
    if (decision === "confirmar") confirmar(true);
  }

  function revisarCambios() {
    if (formulario.current) cambiarCambios(JSON.stringify(valoresAlta(new FormData(formulario.current))) !== valoresIniciales.current);
  }

  return (
    <dialog ref={dialogo} role={confirmando ? "alertdialog" : "dialog"} aria-modal="true"
      aria-labelledby={`${id}-${confirmando ? "confirmacion" : "titulo"}`}
      aria-describedby={confirmando ? `${id}-cambios` : descripcion ? `${id}-descripcion` : undefined}
      onKeyDown={evento => {
        if (evento.key !== "Tab") return;
        const campos = [...evento.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')]
          .filter(campo => campo.tabIndex >= 0 && !campo.matches(":disabled") && campo.getClientRects().length > 0);
        const primero = campos[0];
        const ultimo = campos.at(-1);
        if (!primero) { evento.preventDefault(); evento.currentTarget.focus(); }
        else if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo?.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
      }}
      onCancel={evento => { evento.preventDefault(); if (confirmando) confirmar(false); else pedirCierre(); }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-superficie p-5 text-texto backdrop:bg-texto/40">
      {confirmando && <div className="flex flex-col gap-4">
        <h2 id={`${id}-confirmacion`} className="text-base font-semibold">¿Descartar los cambios?</h2>
        <p id={`${id}-cambios`} className="text-sm text-texto-2">Los datos de este formulario aún no se han guardado.</p>
        <div className="flex flex-wrap justify-end gap-4">
          <button ref={continuar} type="button" className={claseBoton} onClick={() => confirmar(false)}>Seguir editando</button>
          <button type="button" className={claseBotonSecundario} onClick={cerrar}>Descartar cambios</button>
        </div>
      </div>}
      <div hidden={confirmando}>
        <h2 id={`${id}-titulo`} className="text-base font-semibold">{titulo}</h2>
        {descripcion && <p id={`${id}-descripcion`} className="mt-1 text-sm text-texto-3">{descripcion}</p>}
        <form key={estado.intento} ref={formulario} action={enviar} className="mt-4 flex flex-col gap-4"
          onInput={revisarCambios} onChange={revisarCambios}
          onSubmit={evento => {
            if (bloqueo.current || enviando) { evento.preventDefault(); return; }
            bloqueo.current = true;
            revisarCambios();
          }}>
          {estado.error && <div tabIndex={-1} data-error-alta><Aviso tipo="error">{estado.error}</Aviso></div>}
          <fieldset disabled={enviando} className="flex min-w-0 flex-col gap-4">
            {children({ estado, enviando, marcarCambios: () => cambiarCambios(true), valor: (nombre, inicial = "") => {
              const valor = estado.valores?.[nombre];
              return typeof valor === "string" ? valor : inicial;
            } })}
          </fieldset>
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-4 bg-superficie py-3">
            <button type="button" disabled={enviando} className={claseBotonSecundario} onClick={pedirCierre}>Cancelar</button>
            <button type="submit" disabled={enviando} className={claseBoton}>{enviando ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
