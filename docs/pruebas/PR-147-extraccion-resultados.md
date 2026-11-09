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
| 1 | D-214, D-215 y D-216 ya existen en `main` (y D-217); renumerar a D-218 a D-220 y actualizar referencias | Bloqueante |
| 2 | La última escritura de la transacción de `procesarCarga` no revisa `count`; si pierde la reserva, deja la carga en revisión | A corregir |
| 3 | `unpdf` (Node ≥ 24) y `RenglonResultado` sin acordar en el equipo | A corregir |
| 4 | Sin probar con un listado oficial real ni medido el tiempo completo en Vercel | Seguimiento |
| 5 | Quita paneles laterales no pedidos; historial sin paginar (#113); ExcelJS carga el libro completo | Menor |

## 4. Dictamen

**Solicitar cambios.** Lo bloqueante es la bitácora; el código no tiene defectos graves.
