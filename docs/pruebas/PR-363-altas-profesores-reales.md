# Revisión del PR #363: dar de alta a los profesores reales que faltan (#356)

Revisión del [PR #363](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/363) de `edelpinovs` (I1), rama `feat/M2-RF-004-altas-profesores-reales` → `main`. Lleva `Refs #356` (no `Closes`: el issue termina cuando una persona aplica en la base compartida). Es la fase F4 de [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](../PLAN_IMPORTACION_DATOS_REALES_2027.md) y depende de F3 ([PR-361](PR-361-completar-profesores-pend.md)).

| Campo | Valor |
|---|---|
| PR | #363 · issue #356 |
| Autor | @edelpinovs (el código lo escribió Claude Code a petición suya) |
| Commit revisado | `76e04bc` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 11, Node 24). `simular` contra la base compartida (solo lectura). **Sin ensayo en base local** (Docker no arranca en ese equipo) |
| Resultado | **Aprobable con comentarios.** La lógica está probada con datos ficticios, las reglas clave tienen dientes y los dos refactores no cambian el comportamiento de F3 ni de `importar:limpiar`. Falta ejecutar `aplicar` y `revertir` contra una base real, y que otra persona apruebe |

Esta revisión la hace el mismo agente que escribió el código: **no sustituye la aprobación de otra persona del equipo (D-006).**

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/lib/altas-profesores.ts` (nuevo) | Lógica pura: existentes, omitidos con motivo, ajustes, informes, bitácora y reversión |
| `scripts/lib/altas-profesores.test.ts` (nuevo) | 24 pruebas con datos ficticios |
| `scripts/altas-profesores.ts` (nuevo) | CLI `simular`, `aplicar --confirmo` y `revertir <bitácora> --confirmo` |
| `scripts/lib/completar-profesores.ts` | La validación con `registrarProfesor` pasa a la función exportada `incidenciasDeRegistro`, que comparten F3 y F4 |
| `scripts/lib/cargar-profesores.ts` y `scripts/importar-profesores.ts` | La condición «sin nada colgando» pasa a `SIN_USO_PROFESOR`, que comparten `importar:limpiar` y la reversión de F4 |
| `package.json` | `importar:altas:simular`, `:aplicar` y `:revertir` |
| `docs/IMPORTACION_DATOS_REALES.md` | Sección nueva, sin nombres |

Ocho archivos, +995 / −33 líneas. Sin esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 131 archivos, **1567 pruebas** (24 nuevas; las 28 de F3 siguen en verde) |
| `npm run lint` y `npx prisma validate` | Correctos |
| `npm run typecheck` | Falla **solo localmente** por el `.ts` del paquete de datos (igual que en el #361); excluyendo `datos-reales/`, `tsc --noEmit` pasa limpio |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `simular` en la base compartida | 181 registros · 133 con código · 125 ya existen · **10 a dar de alta** (6 de tiempo completo, 4 de asignatura; ninguno con género ni contratación pendientes) · 46 omitidos (38 sin código, 8 sin correo) · 0 ajustes · 122 `PEND` siguen en la base |

## 3. Pruebas con dientes

Se rompió el código a propósito en tres sitios y se corrió el archivo de pruebas (cada vez se restauró desde una copia y se comprobó que quedara idéntico):

| Error introducido | Pruebas que fallaron |
|---|---|
| Crear a la persona aunque ya exista por nombre | 4 |
| Quitar la exigencia de correo institucional | 1 |
| Quitar la comprobación de «código ya lo tiene otra persona» | 1 |

La primera mutación quedó aplicada un momento porque el archivo aún no estaba en git y `git checkout` no la deshizo; se detectó y se revirtió a mano antes de seguir.

## 4. Lo que se leyó y está bien

- Solo crea a quien tiene código UdeG real y correo; quien no, va al informe con su motivo (P6).
- Quien ya existe por nombre (exacto o mismas palabras) no se duplica; un código ajeno con otro nombre se informa y no se toma por la misma persona.
- Nombre, código o correo repetidos en el paquete: nadie de los implicados se crea. Un CVU que choca no impide la alta (se crea sin CVU).
- Las conversiones son las de F3 (se importan, no se duplican) y la validación es la del formulario; un dato obligatorio inválido manda a la persona al informe, uno opcional se descarta.
- `aplicar` corre en una sola transacción; un `P2002` (otra persona ocupó el valor entre la simulación y la escritura) deshace todo con un mensaje en español.
- `revertir` borra con `id`, `codigo`, `correo` y `SIN_USO_PROFESOR` en cada `WHERE`; lo que ya tiene datos asociados se reporta y no se toca. La bitácora se valida con Zod y mensajes en español.
- `SIN_USO_PROFESOR` es exactamente el objeto que estaba dentro de `limpiar()`, y una prueba nueva comprueba que cubra todas las relaciones dependientes de `Profesor` en el esquema.
- La terminal imprime solo conteos y `host:puerto/base` sin credenciales. No escribe ORCID, Scopus ni Scholar.

## 5. Comentarios

| # | Gravedad | Comentario |
|---|---|---|
| 1 | Media | **`aplicar` y `revertir` nunca se han ejecutado contra una base real**, y aquí `revertir` **borra filas**. Lo acotan los `WHERE` y la lista de ids de la bitácora, pero conviene probarlo en una base local cuando Docker funcione, antes de depender de él |
| 2 | Media | **El orden con F3 solo se avisa, no se exige.** Si F4 se aplica antes que F3, un `PEND` escrito con otro nombre en el paquete podría duplicarse. Con los datos de hoy el riesgo parece bajo (125 existentes frente a 122 `PEND`: cada `PEND` cruzó con un registro), pero no es una prueba. Valorar que `aplicar` se niegue mientras queden `PEND`, salvo una opción explícita |
| 3 | Baja | Una persona que **ya existe por nombre pero trae un código distinto** al de la base no se avisa: se cuenta como «ya existe». El propio paquete documenta un caso así (un código distinto para la misma persona en dos archivos). Convendría listarlos en el informe |
| 4 | Baja | `leerBitacora` de F4 valida con Zod, pero la de F3 (`completar-profesores.ts`) sigue sin validar los tipos (comentario 3 de la revisión del #361). Unificarlas |
| 5 | Baja | Las **46 personas omitidas** (38 sin código, 8 sin correo) no tendrán reconocimientos ni cuerpos académicos cargados en F5 a F7; esos registros irán al informe del cliente. Las 8 que solo carecen de correo se podrían dar de alta si el cliente lo entrega |
| 6 | Info | Sin ensayo local ni registro en `Auditoria` (opcional del contrato), igual que en F3 |
| 7 | Info | `importar:limpiar` no tiene prueba automática propia (es un script que escribe en la base); su condición es la misma de antes y ahora la protege la prueba de relaciones de `SIN_USO_PROFESOR` |

## 6. Lo que NO se probó

- `aplicar` y `revertir` contra una base (ni la compartida ni una local), incluido el borrado.
- La idempotencia sobre la base real: solo en la lógica pura. El segundo `simular` posterior al `aplicar` queda como comprobación.
- El ensayo completo del plan (simular → aplicar → revertir → aplicar → simular = 0).
- No hay pantallas que revisar.

## 7. ¿Qué pasa con los datos al integrar?

**Integrar el PR no cambia ningún dato.** Solo agrega código a `main`; ni el despliegue ni el CI ejecutan los scripts. La base cambia cuando una persona ejecuta `npm run importar:altas:aplicar -- --confirmo` desde su equipo, con su `.env`, y entonces crearía **10 profesores** (según la simulación de hoy).

Antes de ese `aplicar` hay que: haber aplicado F3, tener un respaldo fresco, avisar en el chat del equipo, hacer una `simular` reciente sin cambios inesperados, y aceptar que `revertir` no se ha probado.

## 8. Pendiente para cerrar

- [ ] Aprobación de otra persona del equipo (D-006).
- [ ] Comentarios 1 a 3 atendidos o aceptados.
- [ ] Una persona aplica F3 y después F4, y se registran los conteos (sin nombres) en `IMPORTACION_DATOS_REALES.md`.
- [ ] Cerrar #356 después del `aplicar`.
