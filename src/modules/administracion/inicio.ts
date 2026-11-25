import { MESES_AVISO } from "@/modules/reportes/semaforo";
import { cuentaParaSemaforo, finDeCuerpo } from "@/modules/reportes/vigencias";

// Inicio del panel de administración (issue 276): cifras que se cuentan en la base y la lista
// «Requiere atención». Son funciones puras; la página hace los `count` con Prisma.
//
// «Vigencias por vencer» es el amarillo del semáforo de Reportes (RF-026): se reutiliza su regla
// (MESES_AVISO y cuentaParaSemaforo) en lugar de copiarla, así que si se acuerdan D-227 o D-229 la
// cifra cambia junto con el reporte.

export const RESULTADOS_DICTAMEN = ["APROBADO", "NO_APROBADO", "EN_RECONSIDERACION"] as const;

/** Resultados de SNII y PRODEP que entran al semáforo de vigencias. */
export const RESULTADOS_EN_SEMAFORO = RESULTADOS_DICTAMEN.filter(cuentaParaSemaforo);

/**
 * Fechas de fin que el semáforo pinta de amarillo: desde hoy hasta MESES_AVISO meses después,
 * ambos incluidos. Usa el mismo cálculo que `calcularSemaforo`; la prueba comprueba que coinciden.
 */
export function rangoPorVencer(hoy: Date): { desde: Date; hasta: Date } {
  const hasta = new Date(hoy);
  hasta.setMonth(hasta.getMonth() + MESES_AVISO);
  return { desde: hoy, hasta };
}

/** Años de vencimiento de cuerpo académico cuyo fin (31 de diciembre) cae en el rango. */
export function aniosCuerpoPorVencer({ desde, hasta }: { desde: Date; hasta: Date }): number[] {
  const anios: number[] = [];
  for (let anio = desde.getUTCFullYear(); anio <= hasta.getUTCFullYear(); anio++) {
    const fin = finDeCuerpo(anio);
    if (fin >= desde && fin <= hasta) anios.push(anio);
  }
  return anios;
}

export type CifrasAtencion = {
  /** Profesores activos sin perfil de acceso (misma regla que «Sin perfil de acceso» de Calidad). */
  sinPerfil: number;
  /** Cuerpos académicos sin líder (misma regla que «Cuerpo académico sin líder» de Calidad). */
  cuerposSinLider: number;
  /** Distinciones SNII, PRODEP y CA en amarillo del semáforo. */
  porVencer: number;
  /** Autorías pendientes de validación. */
  pendientesValidar: number;
};

export type PuntoAtencion = {
  clave: keyof CifrasAtencion;
  cifra: number;
  texto: string;
  /** Pantalla donde se atiende. */
  enlace: string;
};

const numero = new Intl.NumberFormat("es-MX");

const PUNTOS: { clave: keyof CifrasAtencion; enlace: string; uno: string; varios: string }[] = [
  {
    clave: "sinPerfil", enlace: "/administracion/calidad?regla=SIN_PERFIL",
    uno: "profesor activo no tiene perfil de acceso", varios: "profesores activos no tienen perfil de acceso",
  },
  {
    clave: "cuerposSinLider", enlace: "/administracion/calidad?regla=CA_SIN_LIDER",
    uno: "cuerpo académico no tiene líder", varios: "cuerpos académicos no tienen líder",
  },
  {
    clave: "porVencer", enlace: "/reportes?semaforo=AMARILLO",
    uno: `vigencia vence en los próximos ${MESES_AVISO} meses`, varios: `vigencias vencen en los próximos ${MESES_AVISO} meses`,
  },
  {
    clave: "pendientesValidar", enlace: "/validacion",
    uno: "publicación espera validación", varios: "publicaciones esperan validación",
  },
];

/** Lo que conviene atender, en orden fijo; solo aparece lo que tiene al menos un caso. */
export function requiereAtencion(cifras: CifrasAtencion): PuntoAtencion[] {
  return PUNTOS.filter((p) => cifras[p.clave] > 0).map((p) => {
    const cifra = cifras[p.clave];
    return { clave: p.clave, cifra, texto: `${numero.format(cifra)} ${cifra === 1 ? p.uno : p.varios}`, enlace: p.enlace };
  });
}
