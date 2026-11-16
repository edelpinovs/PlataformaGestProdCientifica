# Revisión del PR #205: reporte de convocatoria anual por género y departamento (RF-028)

Registro de la revisión del [PR #205](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/205) de `layon-king` (rama `feat/M7-RF-028-convocatoria`, cierra el issue #33). El comentario está publicado en el PR.

## 1. Alcance revisado

Pantalla nueva `src/app/reportes/convocatoria/` (enlace desde Reportes): vigentes, nuevos ingresos, promociones y no aprobados, por departamento y género, con filtros de programa, año y género, columnas elegibles, búsqueda, orden y paginación. Las reglas están en `src/modules/reportes/convocatoria.ts`: un dictamen ligado a una convocatoria cuenta una vez; una renovación SNII que sube de nivel respecto al dictamen aprobado anterior es promoción y si no sube es vigente; PRODEP no tiene promoción; «En reconsideración» no entra; el no aprobado que solo está en la participación cuenta una vez. Cinco archivos: la página, el cambio en `reportes/page.tsx`, `cargar-convocatoria.ts`, `convocatoria.ts` y su prueba.

El PR está apilado: su base es la rama del [#204](PR-204-vencimientos-por-anio.md) y no `main`, así que no debe integrarse antes que ese.

## 2. Chequeos

En un worktree del commit `08b7bfa` fusionado con `main`: `npm test` (879 pruebas), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`) y Vercel pasaron y no hay conflicto. La página empieza con `requireModulo("reportes")`; no hay Server Actions ni escrituras.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador (tema claro, oscuro ni celular); el plan de pruebas del PR sigue sin marcar.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | Las definiciones de «vigentes» (solo renovaciones que no suben de nivel y renovaciones PRODEP), «promoción» (nivel más alto que el último dictamen aprobado anterior) y la exclusión de «En reconsideración» no están acordadas ni en `docs/DECISIONES.md`. La exclusión además contradice al #203, que sí cuenta la reconsideración como distinción. Se registran como D-228, pendiente | A corregir (bitácora) |
| 2 | Solo cuentan dictámenes con `convocatoriaId`; los registrados a mano sin convocatoria no aparecen. En los datos de demostración solo un SNII (de la convocatoria de 1999) está ligado y no hay PRODEP ni participaciones, así que la pantalla no permite ver los cuatro conteos con la demo. Conviene ampliar la demostración o aclararlo en el issue | Menor |
| 3 | La prueba no cubre varios periodos anteriores (que se toma el último), el mismo día de inicio, un nivel que baja ni el orden y la paginación de `consultarConvocatoria` | Menor |
| 4 | `leerAnio`, las constantes del año y `esArmado` están copiados de `vigencias.ts`; conviene exportarlos desde un solo lugar | Menor |
| 5 | Quien tiene participación aprobada pero aún no tiene dictamen no se cuenta en ninguna columna; si es lo esperado, decirlo en la descripción | Menor |

## 4. Dictamen

**Aprobable con comentarios.** El código y los permisos están bien y las reglas puras tienen prueba; lo abierto es acordar las definiciones (D-228), la demostración, la revisión visual y el orden de integración con el #204. La aprobación en GitHub la da otra persona del equipo.
