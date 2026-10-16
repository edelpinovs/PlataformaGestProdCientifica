// Login con SIIAU, misma idea que SIGI-LEIP (código UDG y, si la red falla, copia local).
// Inactivo: `iniciarSesion` no invoca este módulo y el login vigente sigue siendo correo + Supabase.
// El flujo completo y lo que falta decidir para activarlo están en docs/diseno/LOGIN_SIIAU.md.

export type EstadoTipoUsuario = "reconocido" | "no-udg";
export type EstadoValidacion = "aceptada" | "rechazada" | "inesperada";
export type DecisionConexion = "usar-copia-local" | "sin-copia";

// siiau-tipo-usuario: 401 o "Codigo incorrecto" significa que no es un código UDG.
// Cualquier otra respuesta se intenta validar (igual que el backend híbrido de LEIP).
export function clasificarTipoUsuario(data: unknown): EstadoTipoUsuario {
  if (!data || typeof data !== "object") return "reconocido";
  const cuerpo = data as { respuesta?: unknown; error?: unknown };
  if (cuerpo.respuesta === "401 Unauthorized" || cuerpo.error === "Codigo incorrecto") return "no-udg";
  return "reconocido";
}

// siiau-validate: `respuesta: false` son credenciales malas. Con `nombre`, el acceso es válido.
export function clasificarValidacion(data: unknown): EstadoValidacion {
  if (!data || typeof data !== "object") return "inesperada";
  const cuerpo = data as { respuesta?: unknown; nombre?: unknown };
  if (cuerpo.respuesta === false) return "rechazada";
  if (typeof cuerpo.nombre === "string" && cuerpo.nombre.length > 0) return "aceptada";
  return "inesperada";
}

// 2) SIIAU caído y ya hay copia → entrar con esa copia.
// 3) Primera vez y SIIAU caído → no entra.
export function decisionSiConexionFalla(hayCopiaLocal: boolean): DecisionConexion {
  return hayCopiaLocal ? "usar-copia-local" : "sin-copia";
}
