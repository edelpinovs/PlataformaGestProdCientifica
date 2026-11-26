# Revisión del PR #361: completar los profesores PEND con los listados oficiales 2027 (#354)

Revisión del [PR #361](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/361) de `edelpinovs` (I1), rama `feat/M2-RF-004-completar-pendientes-2027` → `main`. Lleva `Refs #354` (no `Closes`: el issue termina cuando una persona aplica en la base compartida). Es la fase F3 de [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](../PLAN_IMPORTACION_DATOS_REALES_2027.md).

| Campo | Valor |
|---|---|
| PR | #361 · issue #354 |
| Autor | @edelpinovs (el código lo escribió Claude Code a petición suya) |
| Commit revisado | `4dc063e` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 11, Node 24). `simular` contra la base compartida (solo lectura). **Sin ensayo en base local** (Docker no arranca en ese equipo) |
| Resultado | **Aprobable con comentarios.** La lógica está probada con datos ficticios y las reglas clave tienen dientes (ver §3). Falta ejecutar `aplicar` y `revertir` contra una base real, y que otra persona apruebe |
| Estado | **Integrado** en `main` el 2026-11-26 (merge `265402d`) por @edelpinovs, el autor, **sin una aprobación registrada de otra persona** (D-006). **Aplicado** en la base compartida el 2026-11-26 (121 personas, 700 cambios; ver `IMPORTACION_DATOS_REALES.md`). #354 sigue abierto hasta que una persona lo cierre |

Esta revisión la hace el mismo agente que escribió el código: **no sustituye la aprobación de otra persona del equipo (D-006).**

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/lib/completar-profesores.ts` (nuevo) | Lógica pura: cruce, conversiones, choques de únicos, informes, bitácora y reversión |
| `scripts/lib/completar-profesores.test.ts` (nuevo) | 28 pruebas con datos ficticios |
| `scripts/completar-profesores.ts` (nuevo) | CLI `simular`, `aplicar --confirmo` y `revertir <bitácora> --confirmo` |
| `scripts/lib/datos-reales.ts` y `.test.ts` | `leerPaquete2027()` y la comprobación de carpeta ignorada extraída a una función común; 2 pruebas |
| `package.json` | `importar:completar:simular`, `:aplicar` y `:revertir` |
| `docs/IMPORTACION_DATOS_REALES.md` | Sección nueva, sin nombres |

Siete archivos, +1076 / −8 líneas. Sin esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 130 archivos, **1543 pruebas** (30 nuevas) |
| `npm run lint` y `npx prisma validate` | Correctos |
| `npm run typecheck` | Falla **solo localmente** en `datos-reales/pgpc-2027/schema/seed.prisma.ts` (archivo del paquete que el `tsconfig` recoge). Excluyendo `datos-reales/`, `tsc --noEmit` pasa limpio. Ver comentario 5 |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `simular` en la base compartida | 122 candidatos · 121 a actualizar · 1 sin cambios · **0 conflictos** (código 112, correo 121, género 114, contratación 111, grado 114, departamento 17, CVU 111) |

## 3. Pruebas con dientes

Para comprobar que las pruebas detectan un error de verdad, se rompió el código a propósito en tres sitios y se corrió el archivo de pruebas (los cambios se descartaron después; el árbol quedó limpio):

| Error introducido | Pruebas que fallaron |
|---|---|
| Género sin invertir (`H→F`) | 3 |
| Sin comprobar que código, correo o CVU ya son de otra persona | 3 |
| Sobrescribir un correo que ya no es `@pendiente.invalid` | 1 |

## 4. Lo que se leyó y está bien

- Solo llena campos con marcador; lo ya editado no se toca (pruebas de «no sobrescribe»).
- Con 0 o más de 1 coincidencia, o si dos personas cruzan con el mismo registro, no se toca a nadie.
- Un choque de único quita **solo ese campo**; el resto de la persona se completa. Los repetidos dentro del lote se detectan antes de escribir.
- Cada actualización exige que la persona conserve **todos** los valores leídos (`updateMany` con `count === 1`); si no, se deshace la transacción completa. La reversión es por campo y solo toca lo que conserva el valor que puso el script.
- La bitácora solo acepta nombres de campo de una lista permitida; nunca van directo a una consulta.
- La terminal imprime solo conteos y `host:puerto/base` sin credenciales. El detalle con nombres va a `datos-reales/`, que git ignora, y `leerPaquete2027()` se niega a leer si la carpeta no está ignorada.
- No hay `TRUNCATE`, borrados sin `WHERE`, `$executeRawUnsafe` ni `upsert`. Los mensajes al usuario están en español.

## 5. Comentarios

| # | Gravedad | Comentario |
|---|---|---|
| 1 | Media | **`aplicar` y `revertir` nunca se han ejecutado contra una base real.** No tienen prueba automática y el ensayo local está aplazado. El primer `aplicar` en la base compartida sería su primera ejecución. Mitigaciones: respaldo fresco (el último es del 2026-11-25; repetirlo antes de aplicar), una sola transacción, la guarda de valores leídos y la bitácora. Conviene probar `revertir` en una base local cuando Docker funcione, antes de depender de él |
| 2 | Baja | El resumen no dice **cuántos cruces fueron por conjunto de palabras** y cuántos por nombre exacto. Es la parte menos estricta del cruce y convendría poder verla en la simulación |
| 3 | Baja | `leerBitacora` valida `campo` pero no el tipo de `id`, `antes` ni `despues`. No hay riesgo de inyección (Prisma rechaza valores inválidos), pero el error sería un texto técnico en inglés. Validarlo con Zod y un mensaje en español |
| 4 | Baja | No registra un evento en `Auditoria` (contrato §4.11, opcional). Aceptable para esta entrega |
| 5 | Info | El `typecheck` local falla por el `.ts` del paquete de datos. Si el equipo quiere que funcione con el paquete en su sitio, hay que excluir `datos-reales/` en `tsconfig.json` (configuración común: se acuerda antes) |
| 6 | Info | La descripción del PR decía «29 nuevas pruebas»; son 30 (28 + 2). Corregido |
| 7 | Info | La simulación dio 0 conflictos, así que el manejo de choques (P5) solo se ha ejercitado con datos ficticios, no con los reales |

## 6. Lo que NO se probó

- `aplicar` y `revertir` contra una base (ni la compartida ni una local).
- La idempotencia sobre la base real: solo se probó en la lógica pura. El segundo `simular` posterior al `aplicar` queda como comprobación.
- El ensayo completo del plan (simular → aplicar → revertir → aplicar → simular = 0).
- No hay pantallas que revisar.

## 7. ¿Qué pasa con los datos al integrar?

**Integrar el PR no cambia ningún dato.** Solo agrega código a `main`; ni el despliegue ni el CI ejecutan los scripts, y los datos reales no viajan en el PR (viven en `datos-reales/`, ignorado por git). La base compartida solo cambia cuando una persona ejecuta `npm run importar:completar:aplicar -- --confirmo` desde su equipo, con su `.env`. Hasta entonces los 122 profesores siguen con sus marcadores `PEND`.

Antes de ese `aplicar` hay que: tener F2 hecha o descartada, un respaldo fresco, el aviso en el chat del equipo, una `simular` reciente sin cambios inesperados, y que esa persona acepte que `revertir` no se ha probado.

## 8. Pendiente para cerrar

- [ ] Aprobación de otra persona del equipo (D-006).
- [ ] Comentarios 1 a 3 atendidos o aceptados.
- [ ] Una persona ejecuta `aplicar` y se registran los conteos (sin nombres) en `IMPORTACION_DATOS_REALES.md`.
- [ ] Cerrar #354 después del `aplicar`.
