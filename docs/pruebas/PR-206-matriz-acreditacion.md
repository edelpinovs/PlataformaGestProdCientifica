# Revisión del PR #206: matriz de profesores para acreditación (RF-029)

Registro de la revisión del [PR #206](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/206) de `layon-king` (rama `feat/M7-RF-029-matriz`, cierra el issue #34). El comentario está publicado en el PR.

## 1. Alcance revisado

Pantalla nueva `src/app/reportes/matriz/`: una fila por profesor con código, nombre, departamento, programas educativos, grado, contratación, estatus, SNII y PRODEP; se filtra por departamento o programa educativo y ofrece columnas elegibles, búsqueda, orden y paginación. El SNII y el PRODEP aparecen solo si hoy están vigentes (resultado aprobado, ya iniciado y no vencido); con dos SNII vigentes se muestra el que vence más tarde. Los proyectos activos quedan fuera, como dejó el plan. Siete archivos: la matriz (`matriz.ts`, `cargar-matriz.ts` y su prueba), la página, los enlaces entre reportes (`enlaces.tsx`) y dos páginas existentes que los usan.

## 2. Chequeos

En un worktree del commit `52f1b2e` fusionado con `main` (que ya trae los #203, #204 y #205): `npm test` (885 pruebas), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`) y Vercel pasaron. La página empieza con `requireModulo("reportes")`; no hay Server Actions ni escrituras. El departamento y el programa de la URL se validan contra el catálogo cargado.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador (tema claro, oscuro ni celular); el plan de pruebas del PR sigue sin marcar.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | La matriz solo toma dictámenes con resultado «Aprobado»: un periodo «En reconsideración» sale como «Sin SNII». Es la tercera forma de tratar la reconsideración en M7: el #203 la cuenta como distinción y el #205 la excluye. Se registra como D-229, pendiente; conviene acordar una sola regla | A corregir (bitácora) |
| 2 | La matriz incluye a todos los profesores, también los de estatus no activo, sin un filtro de estatus. Si para acreditación solo cuentan los activos, falta el filtro; confirmarlo con la Coordinación | Menor (a confirmar) |
| 3 | `leerColumnas`, `esArmado` y `leerId` son ya la tercera copia del mismo código (con `vigencias.ts` y `convocatoria.ts`); conviene moverlos a una pieza compartida del módulo | Menor |
| 4 | La prueba «no arma una fila de proyectos activos» no prueba una regla (solo revisa que la fila no tenga una clave). Faltan casos: fin igual a hoy, EMERITO, profesor sin departamento ni grado, y el orden y la paginación | Menor |
| 5 | Ordenar por «SNII» es alfabético («Candidato», «Nivel I», «Sin SNII»…), no por nivel | Menor |
| 6 | La descripción dice que el PR apunta a la rama del #205, pero apunta a `main` (el #205 ya está integrado) | Menor |

## 4. Dictamen

**Aprobable con comentarios.** El código y los permisos están bien y la regla de vigencia está probada. Lo abierto es acordar cómo se trata la reconsideración (D-229), confirmar el estatus, la revisión visual y la descripción. La aprobación en GitHub la da otra persona del equipo.
