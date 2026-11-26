# Revisión del PR #393: registra en la bitácora las cargas confirmadas y los borrados de Convocatorias (#380, RF-241)

Revisión del [PR #393](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/393) de `Grillo-de-Alambre` (I5, responsable de Convocatorias), rama `feat/M5-380-auditoria-convocatorias` → `main`. `Closes #380`, sub-issue de #277. Usa la pieza compartida del #374 (`registrarAuditoria`, `eventoAuditoria`) para dejar constancia, **en la misma transacción que el cambio**, de tres acciones: confirmar una carga, eliminar una carga y eliminar un participante. Sin migración.

| Campo | Valor |
|---|---|
| PR | #393 · issue #380 (`Closes`) |
| Autor | @Grillo-de-Alambre |
| Commit revisado | `f068102` (la fusión con el `main` actual no tiene conflictos) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. No se tocó la base compartida. Sin pantallas ni escritura real en la bitácora |
| Resultado | **Aprobable con comentarios.** Hace lo que pide el issue, con la garantía de transacción y sin datos personales; los comentarios son menores |

Esta revisión la hace un agente que trabaja para I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/convocatorias/revision/[id]/actions.ts` | `confirmarCarga` registra `carga.confirmada` dentro de la transacción de D-293, con `resumenCargaConfirmada` (id, renglones, reconocimientos creados) |
| `src/app/convocatorias/carga/actions.ts` | `eliminarCarga` registra `registro.eliminado` (módulo `convocatorias`) en la misma transacción del borrado |
| `src/app/convocatorias/participantes/actions.ts` | `eliminarParticipante` pasa a una transacción interactiva: el `DELETE` condicionado y su registro; si no borró nada, no registra |
| Pruebas de las tres acciones | Evento esperado (actor, módulo, acción, entidad y resumen), el resumen no trae el nombre del profesor, y no se escribe cuando se rechaza o el borrado no quita nada. Son las primeras pruebas de `eliminarCarga` |

Seis archivos, +103 / −10. Solo toca M5; usa la tabla de acciones del #374 sin agregar nada.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 139 archivos, **1720 pruebas** (coincide con la descripción) |
| `npm run lint` y `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`, incluye `build`) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Sin conflictos |
| Escritura real en la bitácora o prueba contra la base | **No se hizo** (la autora tampoco: habría que confirmar o borrar registros solo para probar) |

## 3. Lo que se leyó y está bien

- **Misma transacción que el cambio:** en las tres acciones, `registrarAuditoria(tx, …)` va dentro de la transacción interactiva; si el registro falla, el cambio se revierte (cumple el primer punto de *Terminado cuando*).
- **Solo se registra lo que ocurrió:** el borrado conserva su condición dentro del `DELETE` (carga no confirmada; participante de una convocatoria sin carga confirmada) y el registro solo se escribe si `count` fue mayor que cero; ante carga ya confirmada o inexistente, nada.
- **Sin datos personales (D-294):** los resúmenes llevan identificadores, programa, año y conteos; no el nombre del profesor ni el del archivo (que podría nombrar a una persona), y hay prueba de que el nombre no aparece.
- **Los permisos no cambian:** las tres siguen empezando con `requireModulo("convocatorias")`; ahora se usa su resultado (`perfil`) como actor.
- **Módulo explícito en los borrados:** pasa `"convocatorias"` a `eventoAuditoria`, evitando el valor por omisión «sistema» (hallazgo 2 de la revisión del #374).
- **Alcance acotado:** no agrega acciones ni helpers; usa los del #374.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **Si el registro de la bitácora falla, la persona ve la pantalla de error de Next**, no un mensaje en español: la transacción no tiene `try/catch`. Antes también podía fallar el borrado, pero ahora hay un motivo más. Conviene capturar el error y devolver un mensaje propio («No se pudo registrar el cambio. Inténtalo de nuevo.»), como ya hace la exportación de la bitácora |
| 2 | Menor | **Al borrar una carga se pierden también sus renglones** (cascada) y el resumen no dice cuántos. Para una auditoría útil convendría sumar el conteo («… con N renglones»); el issue pide solo identificadores y conteos, y este es uno natural |
| 3 | Menor | **Otras acciones de M5 que cambian datos no dejan constancia:** asignar o quitar un renglón a mano, *Volver a leer* (que reemplaza los renglones) y las altas de participantes. Están fuera del #380, pero conviene decidir con I1 si deben quedar en la bitácora o dejarlo anotado en #277 |
| 4 | Menor | **Sin prueba contra la base** de que la transacción revierte cuando el registro falla; las pruebas usan dobles. Es razonable (la regla es de Prisma), pero queda como punto a mirar la primera vez que se confirme una carga real o de demostración |
| 5 | Informativo | El texto de `eliminarCarga` y la redirección siguen mostrando el nombre del archivo en la URL (`?eliminado=…`); no es parte de este PR ni de la bitácora, solo se anota porque el nombre podría identificar a una persona |

## 5. Dictamen

**Aprobable con comentarios.** Sin hallazgos que bloqueen. Falta la aprobación de otra persona (D-006). Los puntos 1 y 2 son pequeños y pueden resolverse aquí o en un seguimiento; el 3 es una decisión de alcance para #277. D-294 sigue `pendiente` del visto bueno de los dueños, pero este PR respeta lo que ya dice. No requiere migración.
