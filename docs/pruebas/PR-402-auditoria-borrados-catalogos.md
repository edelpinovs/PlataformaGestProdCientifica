# Revisión del PR #402: bitácora de los borrados de Catálogos (#376, #277)

Revisión del [PR #402](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/402) de `edelpinovs` (I1), rama `feat/M1-277-auditoria-borrados-catalogos` → `main`. Lleva `Closes #376`. Es un sub-issue de la bitácora de auditoría (#277): usa la pieza compartida `registrarAuditoria` (PR #374) para que *Eliminar* un grado científico, una división o un departamento deje su constancia (`registro.eliminado`, módulo `catalogos`) en la misma transacción que el borrado.

| Campo | Valor |
|---|---|
| PR | #402 · issue #376 (`Closes`) |
| Autor | @edelpinovs (I1) |
| Commit revisado | `cc47378` (sin conflictos con el `main` actual) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consulta a la base compartida **solo de lectura** (`prisma migrate status`). Sin sesión real ni pantallas |
| Resultado | **Aprobable.** Cumple el *Terminado cuando* del #376; lo que queda es probar la transacción contra la base real y la aprobación de otra persona, porque la autoría es de I1 |

Esta revisión la hace un agente que trabaja para I1 sobre código de I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/catalogos/grados/actions.ts` | `eliminarGrado`: el `deleteMany` y la bitácora van en `prisma.$transaction` |
| `src/app/catalogos/divisiones/actions.ts` | `eliminarDivision`: igual, dentro del `try` que ya capturaba `P2003` |
| `src/app/catalogos/departamentos/actions.ts` | `eliminarDepartamento`: igual |
| `src/app/catalogos/auditoria-borrados.test.ts` (nuevo) | 12 pruebas, 4 por catálogo |

Cuatro archivos, +122 / −8 líneas. No toca `prisma/schema.prisma`, `src/lib/` ni `src/components/`; reutiliza `registrarAuditoria`, `eventoAuditoria` y `resumenEliminacion` que ya están en `main`. La acción `registro.eliminado` ya existía en `ACCIONES_AUDITORIA`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 142 archivos, **1752 pruebas**. La descripción dice 1751 de 1752 con `http.test.ts` fallando por tiempo; en mi equipo pasó completo |
| `npm run lint`, `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Sin conflictos |
| Migración | No aplica. Comprobé en solo lectura que la tabla `Auditoria` ya está aplicada (`migrate status`: 16 migraciones, base al día) |
| Pantallas y borrado contra la base | **No los probé.** La descripción lo reconoce |

## 3. Lo que se leyó y está bien

- **Misma transacción:** el `deleteMany` y el `auditoria.create` van juntos en una transacción interactiva; si la bitácora lanza, el borrado se revierte y el error sube sin redirección (hay prueba).
- **Solo se registra lo que ocurrió:** la constancia se escribe únicamente si `count > 0`. Si la condición del `DELETE` (que alguien empiece a usar el registro en ese instante) impide borrar, no queda constancia de un borrado inexistente (hay prueba).
- **Lo anterior se conserva:** la condición dentro del `DELETE`, los mensajes de «no se puede eliminar», la captura de `P2003` (en divisiones y departamentos, ahora alrededor de la transacción) y la redirección no cambian. Un `P2003` dentro de la transacción la revierte entera, que es lo correcto.
- **Permisos:** `requireModulo("catalogos")` sigue al inicio de cada acción; ahora se usa su resultado como actor.
- **Sin datos personales:** el resumen lleva el tipo, el nombre del catálogo y su id, por ejemplo «Eliminó el departamento «Física» (id 7).». Son datos institucionales (D-294).
- **Pruebas:** cubren, por catálogo, el evento esperado (actor, módulo, acción, entidad, id y resumen), el caso en que no se borró nada, la falla de la bitácora y el registro inexistente.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **La transacción y su reversión solo se probaron con dobles.** Que una falla de la bitácora revierta el `DELETE` depende de que `tx.auditoria.create` y `tx.<catálogo>.deleteMany` compartan la transacción de Prisma; el código lo hace bien, pero ninguna prueba lo comprueba contra la base. Antes de cerrar #376 conviene ensayarlo con un registro de demostración (`npm run db:demo`), comprobando que el borrado deja su fila en `Auditoria` |
| 2 | Menor | **Si la bitácora falla, la persona ve la pantalla de error de Next**, sin mensaje en español. Es lo que pide el issue (que el cambio no se guarde), pero la regla del equipo prefiere errores legibles. Es el mismo punto del #393: conviene decidirlo una vez para todos los módulos |
| 3 | Menor | **El resumen incluye el nombre del catálogo, y el issue pedía «el tipo de catálogo y su id».** No es un dato personal, y el nombre sirve cuando el registro ya no existe; solo conviene que el equipo lo confirme dentro de D-294 para que los demás módulos sigan el mismo criterio |
| 4 | Menor | **Altas y ediciones de Catálogos no dejan constancia.** Está fuera del alcance del #376 (solo borrados), pero la bitácora de Catálogos quedará incompleta hasta que se decida en #277 |
| 5 | Menor | **El PR lo escribe I1**, así que lo aprueba otra persona (D-006); esta revisión no lo sustituye |

## 5. Dictamen

**Aprobable.** No hay nada que impida integrarlo una vez que otra persona lo apruebe. Antes de cerrar #376, ensayar un borrado con datos de demostración (hallazgo 1). No requiere migración ni avisos al equipo.
