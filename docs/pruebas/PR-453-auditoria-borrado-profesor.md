# Revisión del PR #453: la bitácora registra el borrado de un profesor

Revisión del [PR #453](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/453) de `dpfuentes92`. Es el sub-issue de Profesores de [#277](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/277) (bitácora de auditoría, D-294).

| Campo | Valor |
|---|---|
| PR | #453 (`Closes #377`) |
| Autor | @dpfuentes92 (I2) |
| Rama | `feat/M2-auditoria-borrado-profesor` → `main` |
| Commit revisado | `75792ef` |
| Fecha de la revisión | 2026-11-28 |
| Revisó | @edelpinovs (I1), con Claude Code. Es el dueño de la bitácora compartida, no de Profesores |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`) en el commit del PR. La rama ya contiene `main` (0 commits atrás). Sin base de datos y sin `next dev` |
| Resultado | **Aprobado con comentarios.** El cambio es correcto, pequeño y bien probado; solo hay detalles menores y una observación sobre los scripts |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/profesores/actions.ts` | `eliminarProfesor` guarda el borrado y su registro `registro.eliminado` (módulo `profesores`) en una transacción interactiva; el resumen lleva solo el código |
| `src/app/profesores/actions.test.ts` | 5 pruebas nuevas del borrado y su bitácora |
| `src/modules/profesores/profesores.test.ts` | Los dobles incluyen la bitácora y la transacción; las pruebas existentes de `eliminarProfesor` verifican que se escriba, o no, el registro |

Sin migración, sin cambios en `src/lib/`, `src/components/` ni `prisma/schema.prisma`, y sin acción nueva en `ACCIONES_AUDITORIA`: usa `registro.eliminado` con el módulo indicado, tal como pide el issue.

## 2. Lo que comprobé en el código

| Punto del issue #377 | Resultado |
|---|---|
| El borrado y la constancia se guardan juntos o ninguno | Correcto: `prisma.$transaction(async (tx) => …)` hace el `deleteMany` y `registrarAuditoria(tx, …)` dentro de la misma transacción |
| No queda constancia de un borrado que no ocurrió | Correcto: con `count === 0` (alguien relacionó al profesor en ese instante) devuelve 0 sin escribir |
| El resumen lleva el código, no el nombre ni el correo | Correcto: `resumenEliminacion("el profesor", actual.codigo)` → «Eliminó el profesor DEMO001.». La prueba comprueba que no aparezcan nombre, apellido ni correo |
| La captura de `P2003` sigue funcionando | Correcto: el `try/catch` rodea a la transacción, así que un `P2003` revierte todo y se explica como antes |
| Permiso | Sin cambio: `requireModulo("profesores")`, ahora guardando su resultado como `actor` |
| Mensajes y redirección | Sin cambio |

## 3. Verificaciones automáticas

| Comprobación | Resultado |
|---|---|
| Pruebas de `src/app/profesores`, `src/modules/profesores` y `src/modules/administracion` | 281 de 281 |
| `npm test` completo (`--pool=vmThreads`) | 1924 de 1925. Falla `src/modules/produccion/conectores/http.test.ts` («un JSON inválido no se reintenta», tiempo agotado), que también falla en `main` y no es de este PR |
| `npm run lint` | Sin errores |
| `npm run typecheck` | Sin errores |
| CI del PR (`verificar`) | Verde |
| Las pruebas detectan la falta del cambio | Con `actions.ts` de `main` y las pruebas del PR fallan 3 (la constancia del borrado, la transacción y el error de la bitácora), así que no pasan igual sin el cambio |

## 4. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | Tres scripts también borran profesores sin dejar constancia: `scripts/altas-profesores.ts`, `scripts/importar-profesores.ts` y `scripts/demo.ts`. No es de este PR (la bitácora cubre las acciones de la aplicación y esos son flujos de importación de D-259 que ejecuta una persona del equipo), pero conviene decidir si deben registrarse | Observación |
| 2 | La rama y el commit no siguen la convención (`feat/M<n>-RF-<xxx>-<tema>`, commits con «RF-xxx:») | Menor |
| 3 | El `import` de `@/lib/auditoria` va después de `@/lib/auth/session`; el orden alfabético de los vecinos sería el contrario | Menor |
| 4 | Las pruebas de borrado quedaron repartidas en dos archivos (`actions.test.ts` y `profesores.test.ts`) con cobertura parecida | Menor |

## 5. Lo que NO se comprobó

- **La pantalla.** El PR no cambia la interfaz y no la abrí; el listado y la confirmación de borrado deberían verse igual. La constancia se ve en `/administracion/auditoria`.
- **El borrado contra la base compartida.** La transacción interactiva solo está probada con dobles, igual que en los demás módulos.
- **Un borrado real fallando a mitad de la transacción**: se probó con un doble que rechaza, no con una base.

## 6. Pendiente para integrar

- Aprobación de otra persona en GitHub: esta revisión no se ha publicado como aprobación.
- Decidir (hallazgo 1) si los scripts de importación deben dejar constancia.
