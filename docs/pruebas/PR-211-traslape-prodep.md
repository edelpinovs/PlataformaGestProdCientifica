# Revisión del PR #211: periodos PRODEP que no se traslapan (RF-011)

Registro de la revisión del [PR #211](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/211) de `Ared11` (rama `feat/M3-RF-011-traslape-prodep`, cierra #16). Los comentarios están publicados en el PR.

## 1. Alcance revisado

`hayTraslapeProdep` (sobre `hayTraslape` de `vigencia.ts`), su conexión en `guardarProdep` para el alta y la edición, y, en la versión original, una carpeta `prodep/` completa (pantalla, formularios, listado) que repetía la del #209.

## 2. Chequeos

**Primera revisión (rama original).** `npm test` (789 pruebas), `npm run lint` y `npm run typecheck` pasan. Si se deja de ignorar `NO_APROBADO` falla 1 prueba y si se quita la detección fallan 8. La rama chocaba con `main` en 9 archivos porque el #209 ya estaba integrado.

**Tras rehacerlo (`0de128b`).** `npm test` (944 pruebas), `npm run lint`, `npm run typecheck` y `npm run build` pasan en copia local. Si se quita el rechazo del traslape fallan 2 pruebas de las acciones y si se deja de ignorar `NO_APROBADO` fallan 2. La pantalla no se vio en el navegador. Una corrida de `npm test` dio un fallo aislado de `lector-pdf.test.ts` (RF-017, sin relación con el PR) mientras compilaba en paralelo; sola y repetida pasó.

## 3. Hallazgos

| # | Hallazgo | Estado |
|---|---|---|
| 1 | Chocaba con `main` en 9 archivos: el #209 ya estaba integrado | Corregido: la rama parte de `main` y de la rama del #210 |
| 2 | Perdía la regla de Tiempo Completo de RF-009 | Corregido |
| 3 | Cambiaba la regla de fechas del #209 (`>=` a `>`) | Corregido: se conserva la del #209 |
| 4 | `prodep-listado.ts` duplicaba el listado del #209 | Corregido: se quitó |
| 5 | La comprobación del traslape y el guardado no son atómicos (mismo caso que D-201 para SNII) | Abierto (seguimiento) |
| 6 | La descripción marca la pantalla revisada en claro, oscuro y celular; no se pudo comprobar | Abierto |

## 4. Dictamen

Primera revisión: **solicitar cambios**. Tras rehacerlo el 2026-11-16: **aprobable con comentarios**, con la condición de integrar primero el #210, sobre el que quedó apilado. Se conservó `hayTraslapeProdep` con sus pruebas, y la validación reutiliza el historial que ya consulta la regla de vigencia de RF-010. La aprobación en GitHub la da otra persona del equipo.
