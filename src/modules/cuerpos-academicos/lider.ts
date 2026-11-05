import { z } from "zod";

const eligeIntegrante = "Elige un integrante.";

export const designarLider = z.object({
  cuerpoId: z.coerce.number({ error: eligeIntegrante }).int().positive(),
  profesorId: z.coerce.number({ error: eligeIntegrante }).int(eligeIntegrante).positive(eligeIntegrante),
});

export type DesignarLider = z.infer<typeof designarLider>;

export type IntegranteParaLider = {
  profesorId: number;
  nombre: string;
};

// RF-014 · CU-008: un solo líder (lo garantiza liderId) y tiene que ser integrante del CA.
export function revisarDesignacionLider(
  profesorId: number | undefined,
  integrantes: IntegranteParaLider[],
): { mensaje: string } | null {
  if (integrantes.length === 0) {
    return { mensaje: "Primero asigna integrantes. El líder debe ser integrante de este cuerpo académico." };
  }
  if (!profesorId) {
    return { mensaje: eligeIntegrante };
  }
  const integrante = integrantes.find((i) => i.profesorId === profesorId);
  if (!integrante) {
    return { mensaje: "Esa persona no es integrante de este cuerpo académico. Elige a alguien de la lista." };
  }
  return null;
}

export function mensajeTrasDesignar(nombre: string, yaEraLider: boolean) {
  return yaEraLider
    ? `${nombre} ya es el líder de este cuerpo académico.`
    : `Se designó a ${nombre} como líder.`;
}
