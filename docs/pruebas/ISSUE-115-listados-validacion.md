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

## Seguimiento y atención de hallazgos (I7 - @yanetzijimeno8297)

Fecha: 2026-11-23. Rama: `feat/M7-RF-024-revision-vistas-validacion`.

Se resolvieron todos los puntos abiertos de la revisión del PR #160:

1. **Un solo control para cambiar de vista:** Se eliminó la duplicidad del selector de listado en `BarraListado`. Ahora la navegación superior (`<nav aria-label="Listados de validación">`) es el único control visible para cambiar de vista, con estilo acorde a la pauta (`bg-marca-suave text-marca font-semibold` para la activa).
2. **Preservación de búsqueda y filtros (`enlaceCambioVista`):** Al cambiar de vista se preserva la búsqueda `q` y los filtros compatibles (como `tipo` entre bandeja y manuales), omitiendo los incompatibles para no provocar errores de validación. La paginación se reinicia a la página 1. La vista activa se conserva en los envíos de formulario mediante un campo oculto.
3. **Métricas con SQL `COUNT`:** Se reemplazó la carga de `todasLasAutorias` por `prisma.autoria.groupBy` con `_count`, mapeado con la función pura `mapearConteosEstado`. El conteo oficial se calcula directamente en PostgreSQL sin transferir registros a Node.js.
4. **Excepciones de Editar y Eliminar (regla #59):** Documentadas explícitamente en `src/modules/validacion/README.md`. Los resúmenes son cálculos agregados en tiempo de ejecución (no admiten edición directa); en la bandeja se aplica rechazo por homónimo (`RECHAZADA`) para evitar eliminar registros multifuente compartidos entre coautores; las manuales conservan `FilaEditable`.
5. **Revisión y aprobación del cambio de comportamiento por I7:** Como dueña del módulo Validación (I7), apruebo formalmente la distribución del conteo oficial en vistas seleccionables e independientes. Facilita la navegación, evita saturar la pantalla con tablas masivas y mantiene las métricas globales visibles en las tarjetas superiores.
6. **Comprobación de calidad:** 1,098 pruebas unitarias e integración pasando en Vitest (100 archivos), `npm run lint`, `npm run typecheck` y `npm run build` en verde.
