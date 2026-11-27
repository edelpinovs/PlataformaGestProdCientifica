import { z } from "zod";
import { nombreCatalogo, normalizar } from "./comun";

// Issue 264: catálogo de subáreas. Cada subárea pertenece a un área y su nombre no se repite dentro de ella.

const sinArea = "Elige el área a la que pertenece.";

export const subarea = z.object({
  nombre: nombreCatalogo(150),
  // Llega del <select> como texto; "" (sin elegir) se convierte en 0 y no pasa.
  areaId: z.coerce.number({ error: sinArea }).int(sinArea).positive(sinArea),
});

export type Subarea = z.infer<typeof subarea>;

export type ContextoSubarea = {
  areas: { id: number; nombre: string }[];
  subareas: (Subarea & { id?: number })[];
};

export type ProblemaSubarea = { campo: keyof Subarea; mensaje: string };

// Al editar se pasa `idPropio`, para que la subárea no choque consigo misma.
export function revisarSubarea(nueva: Subarea, contexto: ContextoSubarea, idPropio?: number): ProblemaSubarea | null {
  const area = contexto.areas.find((a) => a.id === nueva.areaId);
  if (!area) return { campo: "areaId", mensaje: "El área elegida no existe. Recarga la página y elige otra." };

  const otras = idPropio === undefined ? contexto.subareas : contexto.subareas.filter((s) => s.id !== idPropio);
  const igual = otras.find((s) => s.areaId === nueva.areaId && normalizar(s.nombre) === normalizar(nueva.nombre));
  if (igual) return { campo: "nombre", mensaje: `El área «${area.nombre}» ya tiene una subárea llamada «${igual.nombre}».` };
  return null;
}
