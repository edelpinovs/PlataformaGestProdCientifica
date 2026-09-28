// Roles de RNF-005. Deben coincidir con el enum Rol de prisma/schema.prisma.
export const ROLES = ["ADMINISTRADOR", "COORDINADOR", "DOCENTE"] as const;
export type Rol = (typeof ROLES)[number];

export const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: "Administrador",
  COORDINADOR: "Coordinación de Investigación",
  DOCENTE: "Docente",
};
