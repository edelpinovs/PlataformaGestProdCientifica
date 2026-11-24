import { condicionTexto, ordenarPor, type ConsultaListado, type DefinicionListado } from "@/lib/listados/consulta";
import { normalizar } from "@/modules/catalogos/comun";
import { ACCIONES_AUDITORIA, CLAVES_ACCION, MODULOS_AUDITORIA } from "./auditoria";

// Listado de la bitácora de auditoría (regla D-009). Es de solo lectura: un registro histórico no
// se edita ni se elimina (excepción a #59, justificada en el issue 242).

export const LISTADO_AUDITORIA: DefinicionListado = {
  columnas: ["fecha", "actor", "modulo", "accion"],
  ordenInicial: { columna: "fecha", dir: "desc" },
  filtros: { modulo: MODULOS_AUDITORIA.map((m) => m.valor), accion: CLAVES_ACCION },
};

export const COLUMNAS_AUDITORIA = [
  { clave: "fecha", texto: "Fecha" },
  { clave: "actor", texto: "Persona" },
  { clave: "modulo", texto: "Módulo" },
  { clave: "accion", texto: "Acción" },
];

/**
 * La búsqueda libre cubre lo que muestra el listado: persona, módulo, acción y resumen. Módulo y
 * acción se guardan como claves internas, así que se busca por su texto.
 */
export function filtroAuditoria(consulta: ConsultaListado) {
  const texto = normalizar(consulta.q.trim());
  const porTexto = condicionTexto(consulta.q, (contiene) => [{ actorCorreo: contiene }, { resumen: contiene }]);

  const alternativas: object[] = [...(porTexto.OR ?? [])];
  if (texto) {
    const modulos = MODULOS_AUDITORIA.filter((m) => normalizar(m.texto).includes(texto)).map((m) => m.valor);
    if (modulos.length) alternativas.push({ modulo: { in: modulos } });
    const acciones = CLAVES_ACCION.filter((a) => normalizar(ACCIONES_AUDITORIA[a].texto).includes(texto));
    if (acciones.length) alternativas.push({ accion: { in: acciones } });
  }

  return {
    ...(alternativas.length ? { OR: alternativas } : {}),
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
