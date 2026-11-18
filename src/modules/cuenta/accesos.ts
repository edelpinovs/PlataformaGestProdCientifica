import type { Rol } from "@/lib/auth/roles";
import { MODULOS, type Modulo } from "@/modules/registry";

// «Accesos frecuentes» de Mi cuenta (issue #226). Funciones puras: la Server Action
// registrarAcceso (src/app/cuenta/actions.ts) y la página solo las orquestan.

/** Una visita por módulo cada 30 minutos: evita escribir en la base con cada clic. */
export const VENTANA_VISITA_MS = 30 * 60 * 1000;

/** Cuántos accesos muestra el panel. */
export const LIMITE_ACCESOS = 4;

/** El módulo del registro con ese slug, solo si el rol puede abrirlo. Acepta cualquier valor. */
export function moduloRegistrable(slug: unknown, rol: Rol): Modulo | null {
  if (typeof slug !== "string") return null;
  const modulo = MODULOS.find((m) => m.slug === slug);
  return modulo && modulo.roles.includes(rol) ? modulo : null;
}

/** ¿Toca registrar otra visita? `ultima` es la marca (ms) de la última registrada, o null si no hay. */
export function debeRegistrar(ultima: number | null, ahora: number): boolean {
  if (ultima === null || !Number.isFinite(ultima) || ultima > ahora) return true;
  return ahora - ultima >= VENTANA_VISITA_MS;
}

export type FilaAcceso = { modulo: string; conteo: number; ultimoAcceso: Date };

export type AccesoFrecuente = {
  slug: string;
  nombre: string;
  descripcion: string;
  href: string;
  conteo: number;
};

/**
 * Los módulos más visitados que el rol actual puede abrir: por conteo, luego el acceso más reciente
 * y, por último, el slug para que el orden sea estable. Los módulos retirados o sin acceso se omiten.
 */
export function accesosFrecuentes(filas: FilaAcceso[], rol: Rol, limite = LIMITE_ACCESOS): AccesoFrecuente[] {
  return filas
    .flatMap((fila) => {
      const modulo = moduloRegistrable(fila.modulo, rol);
      return modulo ? [{ modulo, fila }] : [];
    })
    .sort(
      (a, b) =>
        b.fila.conteo - a.fila.conteo ||
        b.fila.ultimoAcceso.getTime() - a.fila.ultimoAcceso.getTime() ||
        a.modulo.slug.localeCompare(b.modulo.slug),
    )
    .slice(0, limite)
    .map(({ modulo, fila }) => ({
      slug: modulo.slug,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      href: `/${modulo.slug}`,
      conteo: fila.conteo,
    }));
}

/** Los módulos que el rol puede abrir: es lo que se ofrece cuando aún no hay historial. */
export function modulosDelRol(rol: Rol): Modulo[] {
  return MODULOS.filter((m) => m.roles.includes(rol));
}

const NUMERO = new Intl.NumberFormat("es-MX");

export function textoVisitas(conteo: number): string {
  return `${NUMERO.format(conteo)} ${conteo === 1 ? "visita" : "visitas"}`;
}
