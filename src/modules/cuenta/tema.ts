// Tema de la interfaz. Solo claro y oscuro: no se sigue el del sistema operativo (AGENTS.md).
// La cookie `tema` la lee el script de src/app/layout.tsx antes de pintar la página.

export const TEMAS = ["claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const ETIQUETA_TEMA: Record<Tema, string> = { claro: "Claro", oscuro: "Oscuro" };

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

/** Tema válido, o el claro (predeterminado) si el valor falta o no se reconoce. */
export function temaDe(valor: unknown): Tema {
  return esTema(valor) ? valor : "claro";
}

/** Valida el tema que llega del navegador antes de guardarlo en el perfil (#283). */
export function validarTema(valor: unknown): { ok: true; tema: Tema } | { ok: false; error: string } {
  if (esTema(valor)) return { ok: true, tema: valor };
  return { ok: false, error: "Elige el tema claro o el oscuro." };
}

/** Tema guardado en el perfil, o null si no hay uno válido (entonces manda el del navegador). */
export function temaGuardado(valor: unknown): Tema | null {
  return esTema(valor) ? valor : null;
}

/** Duración de la cookie `tema`: un año, en segundos. */
export const DURACION_COOKIE_TEMA = 31536000;

/** Texto para `document.cookie`: la misma cookie, de un año, que escribe el botón del menú. */
export function cookieTema(tema: Tema): string {
  return `tema=${tema}; path=/; max-age=${DURACION_COOKIE_TEMA}; SameSite=Lax`;
}
