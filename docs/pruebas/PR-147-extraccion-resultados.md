# Revisión del PR #147: extracción de los listados oficiales de resultados (RF-017)

Registro de la revisión del [PR #147](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/147) de `Grillo-de-Alambre` (rama `feat/M5-RF-017-extraccion-resultados`, cierra #22). El comentario está publicado en el PR.

## 1. Alcance revisado

Lectura de Excel (ExcelJS) y PDF (`unpdf`), interpretación de columnas, tabla nueva `RenglonResultado` con su migración, procesamiento en segundo plano con `after()`, acción `volverALeer` y cambios al historial de `/convocatorias`.

## 2. Chequeos

Solo se leyó el diff. El CI (`verificar`) y Vercel pasaron; no se ejecutaron `npm test`, `lint` ni `typecheck` en copia local, y la pantalla no se vio en el navegador.

La fusión con `main` tiene conflicto únicamente en `docs/DECISIONES.md`.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | D-214, D-215 y D-216 ya existen en `main` (y D-217); renumerar y actualizar referencias | Bloqueante |
| 2 | La última escritura de la transacción de `procesarCarga` no revisa `count`; si pierde la reserva, deja la carga en revisión | A corregir |
| 3 | `unpdf` (Node ≥ 24) y `RenglonResultado` sin acordar en el equipo | A corregir |
| 4 | Sin probar con un listado oficial real ni medido el tiempo completo en Vercel | Seguimiento |
| 5 | Quita paneles laterales no pedidos; historial sin paginar (#113); ExcelJS carga el libro completo | Menor |

## 4. Dictamen

**Solicitar cambios.** Lo bloqueante es la bitácora; el código no tiene defectos graves.

## 5. Seguimiento del 2026-11-16

Las correcciones de los puntos 1 y 2 las subió la autora el mismo día (`d85f903` y `d31dc81`); la revisión las coteja con lo pedido. En copia local de la rama `npm test` (841 pruebas), `npm run lint` y `npm run typecheck` pasan. No se ejecutó `npm run build` ni se vio la pantalla en el navegador.

| # | Estado |
|---|---|
| 1 | **Corregido.** Se fusionó `main` y las decisiones quedaron como D-222 (`unpdf`), D-223 (`RenglonResultado`) y D-224 (vigencia SNII; `main` ya usaba hasta D-221 al corregir). Referencias actualizadas en `prisma/schema.prisma`, `ISSUE-022` y `SEGUIMIENTO.md`. |
| 2 | **Corregido.** `procesarCarga` revisa `count` en la última escritura; si perdió la reserva, la transacción se revierte y se retira sin marcar la carga como fallida. La prueba nueva en `procesamiento.test.ts` falla si se quita el arreglo («expected EN_REVISION to be PROCESANDO») y pasa con él (comprobado en local). |
| 3 | **Acordado.** D-222 y D-223 quedaron vigentes el 2026-11-16. Falta confirmar Node ≥ 24 en Vercel. |
| 4 | **Abierto (seguimiento).** Listado oficial real y tiempo completo en Vercel; D-224 sigue pendiente. |
| 5 | Sin cambios (menores). |

**Dictamen actualizado: aprobable con comentarios.** La aprobación en GitHub la da otra persona del equipo, como pide `AGENTS.md`.
