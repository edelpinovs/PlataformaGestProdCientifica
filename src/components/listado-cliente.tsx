"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * Lista de un filtro que aplica el cambio al elegir con ratón o toque, sin pulsar «Buscar».
 *
 * Con teclado no se envía sola: en varios navegadores las flechas sobre una lista cerrada cambian
 * el valor y disparan `change` en cada pulsación, y enviar entonces recargaría la página al primer
 * movimiento e impediría recorrer las opciones (WCAG 3.2.2). Con teclado se aplica con el botón
 * «Buscar», que siempre está visible. La marca `data-teclado` vive en el elemento, no en React,
 * para no volver a pintar el campo.
 */
export function SelectorFiltro({ onChange, onKeyDown, onPointerDown, onBlur, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...resto}
      onKeyDown={(evento) => {
        evento.currentTarget.dataset.teclado = "1";
        onKeyDown?.(evento);
      }}
      onPointerDown={(evento) => {
        delete evento.currentTarget.dataset.teclado;
        onPointerDown?.(evento);
      }}
      onBlur={(evento) => {
        delete evento.currentTarget.dataset.teclado;
        onBlur?.(evento);
      }}
      onChange={(evento) => {
        if (!evento.currentTarget.dataset.teclado) evento.currentTarget.form?.requestSubmit();
        onChange?.(evento);
      }} />
  );
}
