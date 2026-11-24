import type { Rol } from "@/lib/auth/roles";

// Roles que inician, reintentan y continúan escaneos (D-257, #265; reemplaza a D-121).
// Docencia no escanea: solo consulta su producción desde Validación.
export const ROLES_ESCANEO = ["ADMINISTRADOR", "COORDINADOR"] as const satisfies readonly Rol[];

export function puedeEscanear(rol: Rol): boolean {
  return (ROLES_ESCANEO as readonly Rol[]).includes(rol);
}

export const AVISO_SIN_PERMISO_ESCANEO =
  "Solo Administración y Coordinación pueden iniciar, reintentar o continuar búsquedas. Puedes consultar los resultados registrados.";
