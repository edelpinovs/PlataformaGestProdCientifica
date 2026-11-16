# Revisión del PR #208: reporte completo por profesor

Registro de la revisión del [PR #208](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/208) de `layon-king` (rama `feat/M7-reporte-completo`, sin issue). El comentario está publicado en el PR.

## 1. Alcance revisado

Pantalla nueva `src/app/reportes/completo/`: una fila por profesor, con las columnas que la persona marca (directorio, SNII, PRODEP, cuerpo académico, convocatoria y publicaciones validadas), filtro por departamento y programa educativo, búsqueda, orden y paginación, y la descarga a Excel y PDF con la misma selección (el reporte se suma a `exportar.ts` y a la ruta de exportación). Siete archivos: la página, `completo.ts`, `cargar-completo.ts` y su prueba, el enlace en `enlaces.tsx` y los cambios en `exportar.ts` y en la ruta. El SNII y el PRODEP salen solo si hoy están vigentes; los proyectos activos no entran.

El PR dice que es adicional a RF-026 a RF-030 y no cierra ningún issue.

## 2. Chequeos

En un worktree del commit `61e1539` fusionado con `main` (que ya trae los #206 y #207): `npm test` (894 pruebas), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`) y Vercel pasaron. La página empieza con `requireModulo("reportes")` y la exportación reutiliza la ruta protegida del #207; no hay Server Actions ni escrituras.

No se ejecutó `npm run build`, no se descargaron los archivos ni se abrieron en Excel, y la pantalla no se vio en el navegador (tema claro, oscuro ni celular); el plan de pruebas del PR sigue sin marcar.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | El trabajo no parte de un issue: `AGENTS.md` pide trabajar sobre uno con su lista *Terminado cuando*. La rama (`feat/M7-reporte-completo`) y el commit («Reporte completo: …») tampoco siguen el patrón `feat/M<n>-RF-<xxx>-<tema>` y `RF-001: …`. Se registra como D-231, pendiente: crear el issue (o ligarlo a un RF) y dejar el alcance acordado con la Coordinación | A corregir |
| 2 | La columna «Publicaciones» junta en una celda los títulos de todas las publicaciones validadas de la persona. En el PDF una celda se recorta a tres líneas con «...» (hallazgo 3 del #207), así que se pierden títulos sin aviso; en el Excel, una celda tiene un límite de 32 767 caracteres y no se probó con una persona con muchas publicaciones | A corregir o acordar |
| 3 | El SNII y el PRODEP solo cuentan dictámenes aprobados: un periodo «En reconsideración» sale como «Sin SNII» o «Sin PRODEP». Es el mismo caso de D-229 (ya son cuatro pantallas con tratamientos distintos) | A acordar (D-229) |
| 4 | Con más de un cuerpo académico, «Cuerpo académico» lista todos los nombres pero «Vencimiento del cuerpo» y su semáforo corresponden solo al que vence antes, sin indicar cuál | Menor |
| 5 | `cargarCompleto` trae a todos los profesores con los títulos de todas sus publicaciones validadas en cada visita, cada orden, cada página y cada descarga; con datos reales puede ser lento | Menor |
| 6 | `leerColumnas`, `esArmado` y `leerId` son ya la cuarta copia del mismo código (`vigencias.ts`, `convocatoria.ts`, `matriz.ts` y este) | Menor |
| 7 | Incluye a todos los profesores, también los no activos, sin filtro de estatus (misma duda que en la matriz del #206) | Menor (a confirmar) |

## 4. Dictamen

**Aprobable con comentarios.** El código, los permisos y las pruebas de las reglas están bien; lo que impide dar el visto bueno sin más es que el trabajo no tiene issue ni alcance acordado (D-231) y que la columna de publicaciones se pierde en el PDF. La aprobación en GitHub la da otra persona del equipo.
