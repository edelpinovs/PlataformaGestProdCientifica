// Enlaces de invitación y recuperación que apuntan a la propia aplicación.
// Abrirlos solo muestra un botón: el token se gasta al pulsarlo, así que las vistas
// previas de chat y los filtros de correo no lo consumen.
export const TIPOS_ENLACE = ["invite", "recovery"] as const;
export type TipoEnlace = (typeof TIPOS_ENLACE)[number];

export function esTipoEnlace(valor: unknown): valor is TipoEnlace {
  return (TIPOS_ENLACE as readonly unknown[]).includes(valor);
}

export function enlaceConfirmacion(sitio: string, tokenHash: string, tipo: TipoEnlace): string {
  const url = new URL("/auth/confirmar", sitio);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", tipo);
  return url.toString();
}
