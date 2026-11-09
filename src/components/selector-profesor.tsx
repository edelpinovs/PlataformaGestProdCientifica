"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buscarProfesores, type OpcionProfesor } from "@/modules/profesores/selector";
import { Aviso, claseBotonSecundario, claseCampo, claseEtiqueta } from "./ui";

type Props = {
  opciones: readonly OpcionProfesor[];
  nombre?: string;
  etiqueta?: string;
  valorInicial?: number;
  requerido?: boolean;
  deshabilitado?: boolean;
  error?: string;
  /** Composición cliente: por ejemplo, marcarCambios de ModalAlta. */
  alSeleccionar?: (id: number | undefined) => void;
};

/** El servidor debe entregar solo opciones permitidas y volver a validar al guardar. */
export function SelectorProfesor({ opciones, nombre = "profesorId", etiqueta = "Profesor", valorInicial, requerido = true, deshabilitado = false, error, alSeleccionar }: Props) {
  const [seleccion, seleccionar] = useState(valorInicial);
  const [busqueda, buscar] = useState("");
  const [abierto, abrir] = useState(false);
  const [indice, activar] = useState(0);
  const [invalido, invalidar] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const listado = useRef<HTMLUListElement>(null);
  const id = useId();
  const coincidencias = buscarProfesores(opciones, busqueda);
  const resultados = coincidencias.slice(0, 10);
  const activo = Math.min(indice, resultados.length - 1);
  const elegido = opciones.find(p => p.id === seleccion);
  const noDisponible = seleccion !== undefined && !elegido;
  const mensaje = error || (noDisponible ? "El profesor seleccionado ya no está entre las opciones permitidas. Elige otro." : invalido ? "Selecciona un profesor de la lista." : undefined);

  useEffect(() => {
    campo.current?.setCustomValidity(requerido && seleccion === undefined ? "Selecciona un profesor de la lista." : "");
  }, [requerido, seleccion]);

  useEffect(() => {
    if (abierto) listado.current?.querySelector<HTMLElement>('[data-activa="true"]')?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo, busqueda]);

  function elegir(profesor: OpcionProfesor) {
    if (deshabilitado || campo.current?.matches(":disabled")) return;
    seleccionar(profesor.id);
    buscar("");
    invalidar(false);
    abrir(false);
    alSeleccionar?.(profesor.id);
    campo.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4" onBlur={evento => { if (!evento.currentTarget.contains(evento.relatedTarget)) abrir(false); }}>
      <input type="hidden" name={nombre} value={seleccion ?? ""} disabled={deshabilitado} />
      <label className={claseEtiqueta}>
        {etiqueta}
        <input ref={campo} type="search" role="combobox" autoComplete="off" value={busqueda} disabled={deshabilitado}
          placeholder="Busca por nombre, apellidos o código" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={abierto && !deshabilitado}
          aria-controls={abierto && !deshabilitado ? `${id}-opciones` : undefined} aria-activedescendant={abierto && !deshabilitado && resultados[activo] ? `${id}-${resultados[activo].id}` : undefined}
          aria-required={requerido} aria-invalid={Boolean(mensaje)} aria-describedby={`${id}-ayuda${mensaje ? ` ${id}-error` : ""}`}
          className={`${claseCampo(Boolean(mensaje))} min-w-0 w-full`}
          onInvalid={() => invalidar(true)}
          onFocus={() => { abrir(true); activar(0); }}
          onChange={evento => { buscar(evento.target.value); abrir(true); activar(0); }}
          onKeyDown={evento => {
            if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
              evento.preventDefault();
              abrir(true);
              activar(abierto ? (activo + (evento.key === "ArrowDown" ? 1 : -1) + resultados.length) % Math.max(1, resultados.length) : evento.key === "ArrowDown" ? 0 : Math.max(0, resultados.length - 1));
            } else if (abierto && (evento.key === "Home" || evento.key === "End")) {
              evento.preventDefault(); activar(evento.key === "Home" ? 0 : resultados.length - 1);
            } else if (abierto && evento.key === "Enter") {
              evento.preventDefault();
              if (resultados[activo]) elegir(resultados[activo]);
            } else if (abierto && evento.key === "Escape") {
              // El primer Escape cierra sugerencias; el siguiente llega al modal contenedor.
              evento.preventDefault(); evento.stopPropagation(); abrir(false);
            } else if (evento.key === "Tab") abrir(false);
          }} />
      </label>
      <p id={`${id}-ayuda`} className="text-xs text-texto-3">Escribe para buscar y usa las flechas y Enter para elegir. Buscar conserva la selección actual.</p>
      {abierto && !deshabilitado && <div className="flex flex-col gap-4">
        <ul ref={listado} id={`${id}-opciones`} role="listbox" aria-label={`Opciones de ${etiqueta.toLocaleLowerCase("es")}`} className="max-h-48 overflow-y-auto rounded-xl bg-superficie-alt p-2">
          {resultados.map((profesor, posicion) => <li key={profesor.id} id={`${id}-${profesor.id}`} role="option" aria-selected={seleccion === profesor.id} data-activa={activo === posicion}
            className={`cursor-pointer rounded-xl px-3 py-2 text-sm break-words ${activo === posicion ? "bg-marca-suave text-marca" : "text-texto hover:bg-hover"}`}
            onMouseDown={evento => evento.preventDefault()} onClick={() => elegir(profesor)}>
            {profesor.apellidos}, {profesor.nombres} · {profesor.codigo}
          </li>)}
        </ul>
        <p role="status" className="text-xs text-texto-3">{!coincidencias.length ? "No se encontraron profesores" : coincidencias.length > 10 ? `${coincidencias.length} coincidencias. Se muestran las primeras 10; precisa la búsqueda.` : `${coincidencias.length} coincidencias.`}</p>
      </div>}
      {seleccion !== undefined && <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-superficie-alt p-3">
        <p role="status" className="min-w-0 text-sm break-words text-texto-2">Seleccionado: {elegido ? `${elegido.apellidos}, ${elegido.nombres} · ${elegido.codigo}` : `Profesor con identificador ${seleccion}`}</p>
        <button type="button" className={claseBotonSecundario} disabled={deshabilitado} aria-label="Quitar profesor seleccionado"
          onClick={() => { seleccionar(undefined); invalidar(false); alSeleccionar?.(undefined); campo.current?.focus(); }}>Quitar selección</button>
      </div>}
      {mensaje && <div id={`${id}-error`}><Aviso tipo="error">{mensaje}</Aviso></div>}
    </div>
  );
}
