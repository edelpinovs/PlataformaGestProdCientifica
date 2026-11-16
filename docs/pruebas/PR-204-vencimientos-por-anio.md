# Revisión del PR #204: filtrar vencimientos por año (RF-027)

Registro de la revisión del [PR #204](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/204) de `layon-king` (rama `feat/M7-RF-027-anio`, cierra el issue #32). El comentario está publicado en el PR.

## 1. Alcance revisado

Un filtro «Año de vencimiento» en el reporte de vigencias (RF-026, [PR #203](pruebas/PR-203-semaforo-vigencias.md)). `analizarReporte` lee `anio` con Zod (cuatro dígitos entre 1990 y 2100; un valor inválido se ignora y se avisa), `consultarVigencias` compara con el año UTC de `fin`, `opcionesAnio` arma el selector y `enlaceReporte` conserva el año al ordenar o paginar. En un cuerpo académico el año es el de vencimiento. Tres archivos: la página, `vigencias.ts` y `vigencias.test.ts`.

## 2. Chequeos

En un worktree del commit `591d215` fusionado con `main` (ya trae el #203): `npm test` (872 pruebas), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`) y Vercel pasaron y la rama no tiene conflicto. El filtro no agrega consultas ni Server Actions: la protección sigue siendo `requireModulo("reportes")` de la página.

No se ejecutó `npm run build` y la pantalla no se vio en el navegador (tema claro, oscuro ni celular); el plan de pruebas del PR sigue sin marcar.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | La descripción dice que el PR apunta a la rama del #203, pero apunta a `main` (el #203 ya está integrado). Actualizar el texto | Menor |
| 2 | El filtro por año hereda D-227: al elegir un año pasado aparecen también los periodos anteriores de personas que hoy tienen otro vigente. Se resuelve junto con D-227 | A acordar (D-227) |
| 3 | Faltan pruebas de combinar el año con la búsqueda, el semáforo o las distinciones elegidas, y de `opcionesAnio` con un año elegido sin filas | Menor |
| 4 | El RF habla de «vencimientos proyectados» y el selector ofrece también años ya vencidos; conviene confirmar con la Coordinación si el listado debe limitarse al año en curso y los siguientes | Menor (a confirmar) |
| 5 | Con el selector nuevo la cuadrícula de filtros queda con tres campos en dos columnas; conviene verlo en el navegador | Menor |

## 4. Dictamen

**Aprobable con comentarios.** La regla es simple, está probada y los permisos no cambian. Lo abierto es la descripción, D-227 y la revisión visual, que falta en el PR y en esta revisión. La aprobación en GitHub la da otra persona del equipo.
