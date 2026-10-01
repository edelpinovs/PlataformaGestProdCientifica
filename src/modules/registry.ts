import type { Rol } from "@/lib/auth/roles";

export type Modulo = {
  slug: string;
  nombre: string;
  descripcion: string;
  integrante: string;
  requisitos: string;
  liberacion: string;
  roles: Rol[];
};

// Módulos del SDD PGPC-SDD-V4-2026 (§1.2 y §6). Cada uno vive en src/app/<slug>.
export const MODULOS: Modulo[] = [
  {
    slug: "catalogos",
    nombre: "Catálogos institucionales",
    descripcion: "Divisiones, departamentos, grados científicos y programas educativos.",
    integrante: "@edelpinovs",
    requisitos: "RF-001 a RF-003",
    liberacion: "2026-10-05",
    roles: ["ADMINISTRADOR"],
  },
  {
    slug: "profesores",
    nombre: "Directorio de profesores",
    descripcion: "Perfil, adscripción, contratación, estatus laboral e identificadores.",
    integrante: "@dpfuentes92",
    requisitos: "RF-004 a RF-006",
    liberacion: "2026-10-05",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
  {
    slug: "reconocimientos",
    nombre: "Reconocimientos SNII y PRODEP",
    descripcion: "Niveles, vigencias, renovaciones y reconsideraciones.",
    integrante: "@Ared11",
    requisitos: "RF-007 a RF-011",
    liberacion: "2026-10-26",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
  {
    slug: "cuerpos-academicos",
    nombre: "Cuerpos académicos",
    descripcion: "Registro de CA, integrantes, líder y LGAC.",
    integrante: "@marisleidysvazquez8293-arch",
    requisitos: "RF-012 a RF-015",
    liberacion: "2026-10-26",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
  {
    slug: "convocatorias",
    nombre: "Ingesta de convocatorias",
    descripcion: "Carga de resultados oficiales, cruce con el directorio y conciliación.",
    integrante: "@Grillo-de-Alambre",
    requisitos: "RF-016 a RF-019",
    liberacion: "2026-11-09",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
  {
    slug: "produccion",
    nombre: "Motor de escaneo",
    descripcion: "Extracción desde ORCID, Scopus y OpenAlex con deduplicación.",
    integrante: "@irybyron",
    requisitos: "RF-020 a RF-022",
    liberacion: "2026-11-23",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
  {
    slug: "validacion",
    nombre: "Validación de producción",
    descripcion: "Bandeja de pendientes, captura manual y control de homónimos.",
    integrante: "@yanetzijimeno8297",
    requisitos: "RF-023 a RF-025",
    liberacion: "2026-11-23",
    roles: ["ADMINISTRADOR", "COORDINADOR", "DOCENTE"],
  },
  {
    slug: "reportes",
    nombre: "Vigencias y reportes",
    descripcion: "Semáforo de vigencias, reportes de convocatoria y matriz de acreditación.",
    integrante: "@leonelmartinez8296-LMP",
    requisitos: "RF-026 a RF-030",
    liberacion: "2026-11-30",
    roles: ["ADMINISTRADOR", "COORDINADOR"],
  },
];

export function getModulo(slug: string): Modulo {
  const modulo = MODULOS.find((m) => m.slug === slug);
  if (!modulo) throw new Error(`Módulo desconocido: ${slug}`);
  return modulo;
}
