# Revisión del PR #203: semáforo al armar el reporte de vigencias (RF-026)

Registro de la revisión del [PR #203](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/203) de `layon-king` (rama `feat/M7-RF-026-semaforo`, cierra el issue #31). El comentario está publicado en el PR.

## 1. Alcance revisado

La pantalla `src/app/reportes/page.tsx` deja de ser un módulo pendiente: la coordinación arma el reporte eligiendo distinciones (SNII, PRODEP, cuerpo académico) y columnas, con búsqueda, filtro por semáforo, orden y paginación de 10 en 10. El semáforo se calcula al abrir el reporte con `calcularSemaforo`; un cuerpo académico vence el 31 de diciembre de su año de vencimiento. Cuatro archivos: la página, `cargar-vigencias.ts` (consultas), `vigencias.ts` (reglas puras) y `vigencias.test.ts`.

## 2. Chequeos

En un worktree aparte del commit `6217443`: `npm test` (785 pruebas), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`) y Vercel pasaron y la rama no tiene conflicto con `main`. La página empieza con `requireModulo("reportes")` (ADMINISTRADOR y COORDINADOR); no hay Server Actions. La exclusión de «No aprobado» sigue D-104 (cuenta el resultado, no el nivel).

No se ejecutó `npm run build` y la pantalla no se vio en el navegador (tema claro, oscuro ni celular); el plan de pruebas del PR sigue sin marcar. `cargarVigencias` (las consultas) no tiene prueba; las pruebas cubren las funciones puras.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | Una persona con un periodo anterior y uno vigente aparece dos veces, y el anterior sale como «Vencido»: `cargarVigencias` no se queda con el periodo vigente por persona y tipo. Los datos de demostración ya traen el caso (profesores 1 y 2: un Candidato que terminó hace 401 días más el periodo actual). Se registra como D-227, pendiente de la Coordinación | A corregir o acordar |
| 2 | Reglas nuevas sin registrar: umbral de 12 meses para amarillo (plan §8 punto 5, solo propuesta), 31 de diciembre como vencimiento de un cuerpo académico y contar «En reconsideración». Se registran como D-226, pendiente | A corregir (bitácora) |
| 3 | La paginación es en memoria (carga todo y corta de 10 en 10), no `skip`/`take` con `count` como pide `AGENTS.md`. Se entiende porque el semáforo se calcula en la aplicación, pero falta justificarlo en el issue | Menor |
| 4 | Ordenar por «Semáforo» es alfabético («Por vencer», «Vencido», «Vigente»), no por urgencia | Menor |
| 5 | Sin prueba de `cargarVigencias` (qué resultados se consultan) | Menor |

## 4. Dictamen

**Aprobable con comentarios.** Las reglas puras y los permisos están bien y probados; lo abierto es el comportamiento con periodos anteriores (D-227), la bitácora (D-226) y la revisión visual, que falta en el PR y en esta revisión. La aprobación en GitHub la da otra persona del equipo.
