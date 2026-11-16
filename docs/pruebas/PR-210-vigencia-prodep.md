# Revisión del PR #210: vigencia PRODEP de 3 o 6 años (RF-010)

Registro de la revisión del [PR #210](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/210) de `Ared11` (rama `feat/M3-RF-010-vigencia-prodep`, cierra #15). El comentario está publicado en el PR.

## 1. Alcance revisado

La regla de vigencia (`calcularVigenciaProdep` y el esquema Zod en `src/modules/reconocimientos/prodep.ts`) y, junto con ella, todo el módulo PRODEP: pantalla `/reconocimientos/prodep` con listado paginado, formulario con fecha de fin calculada, y las acciones de alta, edición y eliminación (incluido el traslape de periodos de RF-011). Diez archivos, 1,151 líneas añadidas.

## 2. Chequeos

En copia local de la rama: `npm test` (776 pruebas), `npm run lint` y `npm run typecheck` pasan. Si se rompe la regla de los 6 años fallan 3 pruebas, y si se quita la exigencia de contigüidad falla 1. El CI (`verificar`) y Vercel pasaron; la fusión con `main` no tiene conflicto de texto.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | Los PR #209 (RF-009), #210 y #211 (RF-011) crean los mismos archivos de `prodep/` desde el mismo commit base (`76f6db8`): 8 conflictos de «añadido en ambos» entre cada par. El #210 además trae el módulo completo y no solo RF-010 | Bloqueante |
| 2 | D-222 ya existe en `main` (`unpdf`); renumerar a D-226 (D-225 es la del #202); el 2026-11-16 `main` ocupó hasta D-231 y pasó a D-232 | Bloqueante (bitácora) |
| 3 | La decisión entra como `vigente` con el criterio confirmado por el propio autor; el issue #15 y el plan §8 punto 6 dicen que falta definirlo: debe quedar `pendiente` hasta confirmarlo | A corregir |
| 4 | `prodep/page.tsx` lee todos los profesores y todo el historial PRODEP en cada visita y los pasa a cada fila (hasta 10 copias); basta el historial del profesor elegido | A corregir |
| 5 | Editar o eliminar un registro no revisa los posteriores; la contigüidad exige `fin = inicio − 1` exacto y puede no coincidir con las fechas oficiales de RF-017/019; un primer reconocimiento cargado como «Renovación» nunca llega a 6 años | Seguimiento |
| 6 | Sin prueba de las acciones (el #209 sí trae `actions.test.ts`): falta la edición que excluye el propio registro del historial y `P2003` | Menor |
| 7 | La descripción marca la pantalla revisada en claro, oscuro y celular; no se pudo comprobar | Menor |

## 4. Dictamen

**Solicitar cambios** (2026-11-16, primera revisión). La lógica de cálculo es correcta y está bien probada; lo bloqueante es el solapamiento con el #209 y el #211 y la decisión que choca con la bitácora. Propuesta: tomar el #209 como base común (RF-009, ya trae `actions.test.ts`), integrarlo primero y rehacer el #210 y el #211 encima, limitando cada uno a su regla. El orden lo acuerda el equipo (pendiente del grupo en `docs/SEGUIMIENTO.md`). La aprobación en GitHub la da otra persona del equipo.

## 5. Seguimiento del 2026-11-16

Se aplicó la propuesta de la revisión: el #210 se rehízo sobre el #209 en la rama de la autora (`806cb54`, sin `--force`). `npm test` (903 pruebas), `npm run lint`, `npm run typecheck` y `npm run build` pasan en copia local. No se vio el formulario en el navegador.

| # | Estado |
|---|---|
| 1 | **Corregido para el #210.** Se fusionó la rama del #209 como base común; el #210 conserva solo la regla de RF-010 (`calcularVigenciaProdep`, `crearEsquemaReconocimientoProdep`, `textoVigenciaProdep`) con sus pruebas en `prodep-vigencia.test.ts`. El #211 sigue pendiente de rehacerse sobre el #209 |
| 2 | **Corregido.** La decisión es ahora D-232 (primero D-226; `main` pasó a usar D-226 a D-231 el mismo día) |
| 3 | **Corregido.** D-232 queda `pendiente` hasta que el equipo o la Coordinación confirme el criterio (plan §8 punto 6) |
| 4 | **Corregido.** La página es la del #209 y no envía el historial; la vista previa la calcula `consultarVigenciaProdep` en el servidor |
| 5 | **Abierto (seguimiento).** Registros posteriores y contigüidad exacta frente a fechas oficiales |
| 6 | **Corregido.** Pruebas de las acciones: fin incorrecto en alta y edición, seis años, exclusión del propio registro, contratación antes del historial y vista previa. Fallan al quitar la validación del servidor (3) o la exclusión del propio registro (2) |
| 7 | **Abierto.** Falta ver el formulario en claro, oscuro y celular |

**Dictamen actualizado: aprobable con comentarios**, con la condición de integrar primero el #209 (aún sin revisión en el seguimiento). Al ajustar la base, un alta que las pruebas del #209 daban por válida de `2026-01-01` a `2026-12-31` pasa a terminar el `2028-12-31`; esas pruebas se actualizaron. La aprobación en GitHub la da otra persona del equipo.

## 6. Actualización del 2026-11-16 (tarde)

El #209 se integró en `main` y el #210 se fusionó con `main` en la rama de la autora (`c05337a`, sin `--force`): el único conflicto era `docs/DECISIONES.md`, la decisión de RF-010 pasó a D-232 y el diff contra `main` quedó solo en RF-010. `npm test` (929 pruebas), `npm run lint` y `npm run typecheck` pasan. El #211 se rehízo apilado sobre este PR (ver [PR-211](PR-211-traslape-prodep.md)), así que el #210 debe integrarse primero. Sigue pendiente ver el formulario en claro, oscuro y celular.
