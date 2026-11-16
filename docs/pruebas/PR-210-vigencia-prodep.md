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
| 2 | D-222 ya existe en `main` (`unpdf`); renumerar a D-226 (D-225 es la del #202) | Bloqueante (bitácora) |
| 3 | La decisión entra como `vigente` con el criterio confirmado por el propio autor; el issue #15 y el plan §8 punto 6 dicen que falta definirlo: debe quedar `pendiente` hasta confirmarlo | A corregir |
| 4 | `prodep/page.tsx` lee todos los profesores y todo el historial PRODEP en cada visita y los pasa a cada fila (hasta 10 copias); basta el historial del profesor elegido | A corregir |
| 5 | Editar o eliminar un registro no revisa los posteriores; la contigüidad exige `fin = inicio − 1` exacto y puede no coincidir con las fechas oficiales de RF-017/019; un primer reconocimiento cargado como «Renovación» nunca llega a 6 años | Seguimiento |
| 6 | Sin prueba de las acciones (el #209 sí trae `actions.test.ts`): falta la edición que excluye el propio registro del historial y `P2003` | Menor |
| 7 | La descripción marca la pantalla revisada en claro, oscuro y celular; no se pudo comprobar | Menor |

## 4. Dictamen

**Solicitar cambios.** La lógica de cálculo es correcta y está bien probada; lo bloqueante es el solapamiento con el #209 y el #211 y la decisión que choca con la bitácora. Propuesta: tomar el #209 como base común (RF-009, ya trae `actions.test.ts`), integrarlo primero y rehacer el #210 y el #211 encima, limitando cada uno a su regla. El orden lo acuerda el equipo (pendiente del grupo en `docs/SEGUIMIENTO.md`). La aprobación en GitHub la da otra persona del equipo.
