# Issue #115: listados de Validación

Fecha: 2026-11-09. Rama: `feat/M7-RF-024-listados-validacion`.

## Alcance

- Cuatro vistas seleccionables en la URL: bandeja, publicaciones manuales, conteo por profesor y conteo por departamento.
- Búsqueda en los campos visibles, filtros de estado/fuente/tipo y departamento, orden permitido por encabezado y selector para celular.
- Diez resultados, última página ante un número fuera de rango, resumen y navegación compartidos.
- Bandeja y captura manual: `count` y `skip`/`take`; los resúmenes usan SQL parametrizado con `COUNT`, `LIMIT` y `OFFSET` porque ordenan un agregado de autorías validadas. Toda consulta usa el cliente de `@/lib/prisma`.
- Autoria no tiene `id`: el desempate usa su clave compuesta `publicacionId`, `profesorId`. Las capturas se muestran por autoría para poder ordenar y buscar por el profesor efectivamente mostrado; una publicación con varios autores puede aparecer en varias filas.
- Los conteos son resultados calculados, sin Editar/Eliminar: cambian al revisar las autorías, no mediante edición directa. En la bandeja se rechaza la autoría por homónimo en lugar de eliminar una obra importada compartida. Las publicaciones manuales conservan FilaEditable.
- Confirmar, rechazar, editar y eliminar conservan el estado validado del listado; no aceptan destinos externos. Docente sin profesor asociado consulta un alcance vacío.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 631 pruebas, 55 archivos; todas pasan |
| `npm run lint` | Pasa |
| `npm run typecheck` | Pasa |
| `npm run build` | Pasa con acceso de red para descargar Geist y Geist Mono; el primer intento sin red falló por esa descarga |
| Claro, oscuro y celular en navegador | Pendiente: el host del navegador no estaba disponible y el acceso nativo a Chrome agotó el tiempo de autorización |
| SQL agregado contra Supabase | Pasa: `SELECT` de conteo y página para profesores y departamentos con alcance docente vacío (`profesorId = -1`); devuelve cero filas sin escrituras ni exposición de registros. Falta revisar resultados con contenido en el navegador |

En Windows se ejecutaron los scripts mediante `npm.cmd`, ya que PowerShell bloquea `npm.ps1`. Las pruebas cubren validación de URL en español, búsqueda literal de comodines, etiquetas y año, desempate, retorno tras acciones y parametrización SQL. Las pruebas existentes de integración simulada de Producción y Validación siguen pasando.

Fuente, tipo y estado se ordenan por su etiqueta en español, no por el orden interno de los enums de PostgreSQL. Se cuentan los grupos finitos y se distribuyen `skip`/`take` entre ellos para recuperar como máximo diez filas; una prueba cubre la página que cruza entre grupos.

La revisión independiente y las comprobaciones visuales siguen pendientes; este registro no es un dictamen de aprobación del PR.
