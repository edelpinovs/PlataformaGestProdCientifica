# Revisión del PR #417: la falta de identificador no cuenta como falla y el historial no inventa datos (#416)

Revisión del [PR #417](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/417) de `irybyron` (módulo M6, Producción). Cierra [#416](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/416), que reúne los hallazgos de la revisión de Producción con datos reales del 2026-11-26 y los puntos abiertos de las revisiones de #334 y #343.

| Campo | Valor |
|---|---|
| PR | #417 (`Closes #416`) |
| Autor | @irybyron |
| Rama | `fix/M6-RF-020-sin-identificador-416` → `main` |
| Commit revisado | `4de7a56`, mezclado con `main` (7 commits por delante de la base del PR) en `2287562` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con el cliente de Prisma generado con una URL ficticia. Sin base de datos, sin `next dev` y sin sesión |
| Resultado | **Aprobable con comentarios.** Los cinco puntos del issue están resueltos y las pruebas pasan. Queda un caso donde el resultado dice «Escaneo finalizado» sin haber consultado nada (hallazgo 1) y falta ver las pantallas con sesión real |

**Límite de esta revisión:** la hace un agente a petición de I1, y el PR también se escribió con ayuda de un agente. No sustituye la aprobación de una persona del equipo (D-006).

## 1. Alcance

| Punto del issue | Cambio | Archivos |
|---|---|---|
| Falta de identificador como falla | El motor guarda la consulta como `SIN_IDENTIFICADOR` (valor nuevo dentro de `Job.datos`, sin migración), no agrega error y no registra corte. El resultado la muestra neutra con qué hacer. El reintento la omite | `escaneo.ts`, `fuentes.ts`, `lotes.ts`, `resultado-escaneo.ts`, `resultado-escaneo.tsx` |
| Búsquedas antiguas (INCIDENCIA + `FALTA_IDENTIFICADOR`) | `consultasDeFuentes` y `erroresDeConsulta` las leen igual que las nuevas, en el resultado, el reintento y el detalle | `lotes.ts` |
| Resultado anterior a la vista en Escanear | Cambiar fuentes, profesor o fechas oculta la barra y el resultado hasta el siguiente envío | `formulario-escaneo.tsx` |
| Detalle de búsquedas antiguas con datos falsos | «No registradas en esta búsqueda» en lugar de ceros o «ninguna»; sin consultas no se muestra la tabla por profesor; el fin sale de la última actualización | `detalle-busqueda.ts`, `historial/page.tsx` |
| «Reintentar» sin nada que reintentar | Solo aparece si `seleccionReintento` devuelve algo; si no, una nota explica por qué | `historial/page.tsx` |
| Clic en el margen interior del modal | El relleno pasa del `<dialog>` a su contenedor | `dialogo-detalle.tsx` |

Solo toca archivos de `src/app/produccion/` y `src/modules/produccion/`. Sin cambios de esquema, migración, dependencias ni `src/components/`. Pruebas nuevas o ajustadas en cuatro archivos `.test.ts` y en dos pruebas de navegador.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 1766 pruebas. Son 4 más que las 1762 del PR; el diff de `main` desde su base agrega pruebas en `calidad.test.ts` |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `node src/app/produccion/escaneo-manual.navegador.mjs` | Correcto en claro, oscuro y celular, incluido «resultado anterior oculto» |
| `node src/app/produccion/historial.navegador.mjs` | Correcto en claro, oscuro y celular, incluido el clic en el margen interior y «no ofrece reintentar lo que solo faltó por clave» |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | Sin conflictos; GitHub la marca `MERGEABLE` |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se revisó y está bien

- **El motor no inventa fallas ni cortes.** `SIN_IDENTIFICADOR` no entra a `resumen.errores`, no se agrega a `cortesPendientes` y no marca `huboErrorEnProfesor`, así que el profesor cuenta como procesado. Un trabajo donde solo faltaron identificadores termina `COMPLETADO` y no `FALLIDO`.
- **Sin migración.** El estado vive en `Job.datos` y `consultaFuenteEsquema` acepta el valor nuevo con su mensaje en español. Los trabajos guardados antes se siguen leyendo.
- **Las búsquedas antiguas se traducen en un solo lugar.** Resultado, reintento y detalle pasan por `consultasDeFuentes`, así que no pueden contradecirse entre sí. Lo comprobé con una búsqueda antigua `FALLIDO` que solo tenía `FALTA_IDENTIFICADOR` (R3) y con otra que además tenía un error de persistencia (R4): la primera sale sin incidencias y la segunda conserva el error.
- **Una fuente mixta no oculta la falla.** Con un profesor sin identificador y otro con límite del proveedor, la fuente sale «falló» con el motivo primero y la nota del identificador después (R1). El reintento solo toma al profesor que sí falló (R5).
- **El reintento no promete lo imposible.** La nota distingue «falta la clave», «falta el identificador» y «no hay consultas fallidas».
- **Cancelar sigue siendo cancelar.** Una búsqueda cancelada con consultas sin identificador sale como aviso de cancelación, no como éxito (R6).
- **Ocultar el resultado no pierde el envío.** `descartarResultado` no actúa mientras la búsqueda está en curso (`estado.pendiente`) y el siguiente envío sube `intento`, que vuelve a mostrar el resultado.
- **Reglas del equipo.** Textos en español y sin culpar a la persona; colores solo por nombre (el estado neutro es `null` en `TIPO_ESTADO`); el modal conserva `role`, `aria-modal` y el cierre con Escape; `Closes #416` y commit con el requisito.

## 4. Hallazgos

### Hallazgo 1 (medio): si ninguna fuente se pudo consultar, el encabezado dice «Escaneo finalizado»

Con todos los profesores sin identificador para las fuentes elegidas (R2), el trabajo termina `COMPLETADO` y el resultado queda así:

> **tipo `exito`:** «Escaneo finalizado. Publicaciones encontradas: 0. … No se encontraron publicaciones para el periodo consultado.»

Debajo, la fuente sale «sin identificador» con su nota. Pero el encabezado en verde afirma que se buscó en un periodo y no se halló nada, y no se consultó ninguna fuente. Con los profesores reales cargados (122, la mayoría sin ORCID ni Scopus), escanear solo ORCID u OpenAlex da exactamente este caso. Es el mismo tipo de dato falso que el issue quiere evitar en el historial.

**Qué hacer:** en `presentarResultadoEscaneo`, si ninguna consulta quedó en `COMPLETADA`, `SIN_RESULTADOS` o `INCIDENCIA`, reemplazar la última frase por algo como «No se consultó ninguna fuente: faltan identificadores de los profesores.», y quitar el verde de éxito (por ejemplo `aviso`). Agregar la prueba.

### Hallazgo 2 (bajo): «falta el identificador» también se muestra cuando el identificador existe pero tiene mal formato

`conectores/google-scholar.ts` devuelve `FALTA_IDENTIFICADOR` también cuando el Scholar ID existe pero no cumple `/^[\w-]+$/`; el motor de este PR lo convierte en «falta el identificador del profesor… Regístralo en Profesores». Profesores valida el formato al guardar, así que es poco probable, pero el texto sería engañoso para un dato que llegara mal por otra vía. No requiere cambio ahora; conviene anotarlo.

### Detalles menores

- **Sin prueba de la página del historial.** La lógica nueva de `historial/page.tsx` (fin tomado de `actualizadoEn`, «Menos de un minuto», nota del reintento) vive en una página de servidor y solo la cubre la prueba de navegador con datos simulados. Es poca lógica, pero sacar el cálculo de `fin` y de `reintento` a una función de `src/modules/produccion/` permitiría probarla.
- **Duplicación de texto.** Los textos «falta el identificador…» aparecen en `resultado-escaneo.ts` y, parecidos, en `lotes.ts`. Si cambia uno, hay que acordarse del otro.

## 5. Pruebas de revisión

Archivo temporal `src/modules/produccion/_revision417.test.ts`, borrado después. Llama a `presentarResultadoEscaneo` y `seleccionReintento` con datos ficticios.

| # | Caso | Resultado |
|---|---|---|
| R1 | Una fuente con un profesor `SIN_IDENTIFICADOR` y otro `INCIDENCIA` (límite del proveedor) | «falló», motivo del límite y después la nota del identificador. Tipo `error` |
| R2 | Todos sin identificador, `COMPLETADO`, sin errores | Tipo `exito` y «No se encontraron publicaciones para el periodo consultado.» → hallazgo 1 |
| R3 | Búsqueda antigua `FALLIDO` solo con `FALTA_IDENTIFICADOR` | Sin incidencias, línea «sin identificador» |
| R4 | Búsqueda antigua `FALLIDO` con `FALTA_IDENTIFICADOR` y `Persistencia: …` | Tipo `error`; conserva la incidencia de persistencia |
| R5 | Reintento con un profesor sin identificador y otro con incidencia | Solo reintenta al segundo y con su fuente |
| R6 | `CANCELADO` con consultas sin identificador | Tipo `aviso` de cancelación |

## 6. Lo que no se probó

- **Con sesión real** en la vista previa de Vercel (claro, oscuro y celular). Las pruebas de navegador usan datos simulados y no pasan por `requireModulo`, Prisma ni el historial real.
- **Un escaneo real** contra ORCID, OpenAlex o Scopus con los profesores cargados.
- **`npm run build`** local.
- **Lo que el PR ya declara sin probar:** la lista del historial sigue mostrando «Con incidencias» en búsquedas antiguas que solo carecían de identificador, porque su estado guardado es `FALLIDO`.
- **Límite de esta revisión:** no es una revisión independiente. La aprobación en GitHub debe darla otra persona del equipo (D-006).
