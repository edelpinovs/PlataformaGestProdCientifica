# Verificación del autor para el issue 97

| Dato | Valor |
|---|---|
| Issue | [#97](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/97) |
| PR borrador | [#98](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/98), con base temporal en la rama del motor #63 |
| Requisitos | RF-PC-01, RF-PC-09 y primera parte de RF-PC-02, RF-PC-04 a RF-PC-06 y RF-PC-10 |
| Rama | `feat/M6-RF-PC-01-consulta-publicaciones` |
| Responsable | I6 |
| Fecha | 2026-11-05 |
| Revisión independiente | Pendiente; este registro no es una aprobación |

## Comportamiento

El listado pasa de las últimas 50 obras fijas a una consulta paginada. Permite buscar por título, autores o DOI y filtrar por profesor, año, tipo, fuente y estado. Los filtros se combinan; profesor y estado se comprueban en una misma autoría. Cada publicación aparece una sola vez aunque tenga varios profesores.

El formulario GET conserva los parámetros en la URL y limpia la página al aplicar filtros. Los enlaces Anterior y Siguiente mantienen los filtros y el tamaño de página. Se admiten 20, 50 o 100 filas. La página exige el permiso actual de Producción; no se agregan roles ni se modifica Reportes, Validación o Prisma.

La consulta se implementa sobre el motor del PR #63, todavía pendiente de integración. El PR de esta entrega debe usar inicialmente esa rama como base para mostrar solo los cambios de consulta; antes de llevarlo a main se debe resolver la dependencia con el #63.

## Verificación con datos de demostración

Lecturas realizadas desde el entorno local mediante el servicio real de consulta y Prisma. Se filtró por `[DEMO]`; no se insertaron, editaron ni eliminaron registros. La salida de diagnóstico solo incluyó cantidades y comprobaciones, sin nombres ni identificadores.

| Comprobación | Resultado |
|---|---|
| Total filtrado | 30 obras DEMO |
| Primera página, tamaño 20 | 20 filas; intervalo 1–20 |
| Segunda página | 10 filas; intervalo 21–30 |
| Obras repetidas entre páginas | Ninguna |
| Profesor y estado | Las filas devueltas tienen una autoría que cumple ambos filtros |
| Fuente | Las filas devueltas corresponden a la fuente seleccionada |
| Texto con `%` literal | No se convierte en un comodín que devuelve todas las obras |

## Pruebas automatizadas

- `src/modules/produccion/consulta.test.ts`: parámetros ausentes y manipulados, mensajes en español, combinación de filtros, año UTC, caracteres especiales, tamaños de página y conservación de parámetros.
- `src/app/produccion/consultas.test.ts`: límite y orden de lectura, ajuste de páginas excesivas, mismo filtro para total y filas, y snapshot consistente.
- `src/app/produccion/page.test.tsx`: denegación de acceso antes de consultar datos, rechazo de URL inválida y envío al servicio de parámetros validados.

## Límites de esta comprobación

Pendiente la revisión visual de los cambios en navegador, incluidos claro, oscuro y celular. Las capturas anteriores de Producción corresponden al listado previo y no prueban estos controles nuevos. Tampoco se midió rendimiento con 50000 publicaciones ni se agregaron indicadores, exportación o el alcance compartido de D-211.

## Chequeos de la entrega

| Chequeo | Resultado |
|---|---|
| `npm test` | Correcto: 35 archivos, 475 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; acceso a Google Fonts habilitado |

No se instalaron dependencias ni se aplicaron migraciones. La verificación con Prisma solo realizó lecturas sobre las publicaciones de demostración existentes.
