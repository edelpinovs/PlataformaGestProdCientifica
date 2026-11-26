import type { EventoAuditoria } from "@/modules/administracion/auditoria";

// Escritura compartida de la bitácora de auditoría (#277). Cualquier módulo la usa dentro de la misma
// transacción que su cambio, para que nunca haya un cambio sin su constancia ni una constancia sin cambio:
//
//   await prisma.$transaction([
//     prisma.perfil.update({ ... }),
//     registrarAuditoria(prisma, eventoAuditoria("usuario.editado", actor, entidad, resumen)),
//   ]);
//
// o, con transacción interactiva, `registrarAuditoria(tx, evento)`. El evento se arma con
// `eventoAuditoria` (src/modules/administracion/auditoria.ts), que fija el módulo y recorta el texto.
// El resumen lleva identificadores y conteos, no datos personales.

type ClienteAuditoria<R> = { auditoria: { create(args: { data: EventoAuditoria }): R } };

/** Devuelve la operación pendiente (aún no se ejecuta): se pasa a `$transaction` o se espera dentro de ella. */
export function registrarAuditoria<R>(cliente: ClienteAuditoria<R>, evento: EventoAuditoria): R {
  return cliente.auditoria.create({ data: evento });
}
