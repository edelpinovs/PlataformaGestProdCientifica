"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * Lista de un filtro que aplica el cambio al elegir (sin pulsar «Buscar»). Sin JavaScript sigue
 * siendo un campo normal del formulario GET: el botón «Buscar» de <noscript> lo envía.
 */
export function SelectorFiltro(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(evento) => evento.currentTarget.form?.requestSubmit()} />;
}
