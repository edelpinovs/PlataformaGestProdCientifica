import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { normalizar } from "@/modules/catalogos/comun";
import { ACCIONES_AUDITORIA, CLAVES_ACCION, MODULOS_AUDITORIA } from "./auditoria";
import { CLAVES_PERIODO, rangoFechaBusqueda, rangoPeriodo, type Periodo } from "./fechas";

// Listado de la bitácora de auditoría (regla D-009). Es de solo lectura: un registro histórico no
// se edita ni se elimina (excepción a #59, justificada en el issue 242).

export const LISTADO_AUDITORIA: DefinicionListado = {
  columnas: ["fecha", "actor", "modulo", "accion"],
  ordenInicial: { columna: "fecha", dir: "desc" },
  filtros: { modulo: MODULOS_AUDITORIA.map((m) => m.valor), accion: CLAVES_ACCION, periodo: CLAVES_PERIODO },
};

export const COLUMNAS_AUDITORIA = [
  { clave: "fecha", texto: "Fecha" },
  { clave: "actor", texto: "Persona" },
  { clave: "modulo", texto: "Módulo" },
  { clave: "accion", texto: "Acción" },
];

/**
 * La búsqueda libre cubre lo que muestra el listado: persona, módulo, acción, resumen y fecha. Módulo y
 * acción se guardan como claves internas, así que se busca por su texto; la fecha se busca como
 * `2026`, `2026-11` o `2026-11-24`, en hora de Ciudad de México (#277). El filtro «Periodo» acota la
 * fecha a hoy, los últimos 7 o 30 días o el mes en curso; `ahora` solo cambia en las pruebas.
 */
export function filtroAuditoria(consulta: ConsultaListado, ahora: Date = new Date()) {
  const texto = normalizar(consulta.q.trim());
  const porTexto = condicionTexto(consulta.q, (contiene) => [{ actorCorreo: contiene }, { resumen: contiene }]);

  const alternativas: object[] = [...(porTexto.OR ?? [])];
  if (texto) {
    const modulos = MODULOS_AUDITORIA.filter((m) => normalizar(m.texto).includes(texto)).map((m) => m.valor);
    if (modulos.length) alternativas.push({ modulo: { in: modulos } });
    const acciones = CLAVES_ACCION.filter((a) => normalizar(ACCIONES_AUDITORIA[a].texto).includes(texto));
    if (acciones.length) alternativas.push({ accion: { in: acciones } });
  }

  const fecha = rangoFechaBusqueda(consulta.q);
  if (fecha) alternativas.push({ creadoEn: { gte: fecha.desde, lt: fecha.hasta } });
  const periodo = consulta.filtros.periodo ? rangoPeriodo(consulta.filtros.periodo as Periodo, ahora) : null;

  return {
    ...(alternativas.length ? { OR: alternativas } : {}),
    ...(periodo ? { creadoEn: { gte: periodo.desde, lt: periodo.hasta } } : {}),
    ...(consulta.filtros.modulo ? { modulo: consulta.filtros.modulo } : {}),
    ...(consulta.filtros.accion ? { accion: consulta.filtros.accion } : {}),
  };
}

export function ordenAuditoria(consulta: ConsultaListado) {
  return ordenarPor(consulta, {
    fecha: (dir) => ({ creadoEn: dir }),
    actor: (dir) => ({ actorCorreo: dir }),
    modulo: (dir) => ({ modulo: dir }),
    accion: (dir) => ({ accion: dir }),
  });
}
