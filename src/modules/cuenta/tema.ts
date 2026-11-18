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

/** Texto para `document.cookie`: la misma cookie, de un año, que escribe el botón del menú. */
export function cookieTema(tema: Tema): string {
  return `tema=${tema}; path=/; max-age=31536000; SameSite=Lax`;
}
