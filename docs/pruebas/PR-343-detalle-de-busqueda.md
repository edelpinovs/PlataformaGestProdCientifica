# Revisión del PR #343: el detalle de una búsqueda muestra qué encontró y se abre en un modal (#342)

Revisión del [PR #343](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/343) de `irybyron` (I6, responsable del módulo Producción), rama `feat/M6-RF-020-detalle-historial` → `main`. Lleva `Closes #342` («Producción: el detalle de una búsqueda muestra qué encontró»). El detalle del historial ahora dice cuántas obras devolvió cada fuente, qué publicaciones guardó, el resultado por profesor y la duración, y se abre en un modal desde un icono (pedido de la autora, referencia para el [issue #341](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/341)).

| Campo | Valor |
|---|---|
| PR | #343 · issue #342 |
| Autor | @irybyron |
| Commit revisado | `5ffff99` (la rama sale de un `main` anterior; GitHub la marca `MERGEABLE`) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consultas a la base compartida **solo de lectura**. Sin sesión real |
| Resultado | **Aprobable con comentarios.** El modal y la lógica nueva funcionan y están probados. Pero para los trabajos **antiguos** (que son la mayoría de los reales) el detalle dice cosas falsas, y un clic en el relleno del modal lo cierra |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/detalle-busqueda.ts` (nuevo) | `analizarBusqueda` (total de obras, resultado por profesor, publicaciones guardadas) y `textoDuracion`; todo desde lo que ya guarda `Job.datos` |
| `src/app/produccion/dialogo-detalle.tsx` (nuevo) | `<dialog>` modal con `showModal()`, cierre con botón, X, Escape o clic fuera, y devolución del foco al icono; define `ICONO_VER` (el ojo) |
| `src/app/produccion/historial/page.tsx` | Duración y obras recibidas en el encabezado; sección «Publicaciones guardadas en esta búsqueda» (hasta 20, «Nueva» o «Ya existía, actualizada», con enlace a Publicaciones); «Resultado por profesor» (varios profesores, hasta 20); el icono de ojo en la tabla; etiqueta de estado sin partirse |
| `src/modules/produccion/resultado-escaneo.ts` y `.tsx` | Cada fuente muestra cuántas obras devolvió («3 obras») |
| `src/app/produccion/historial.navegador.mjs`, `pruebas-navegador.mjs` | La prueba abre el modal, cierra con Escape, comprueba el foco y que se conserve la página; el arnés gana `replace` |
| Pruebas | `detalle-busqueda.test.ts` (nuevo) y `resultado-escaneo.test.ts` |

Nueve archivos, +245 / −17 líneas. Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`: `ICONO_VER` vive en Producción para no tocar `ICONOS` antes de acordar el #341.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 126 archivos, **1502 pruebas** (coincide con la descripción) |
| `npm run lint` y `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Pruebas de navegador `historial`, `fuentes`, `escaneo-manual` y `selector-profesor` | **Correctas en claro, oscuro y celular**, ejecutadas en esta revisión |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **Todo sale de lo que ya se guarda:** sin esquema ni migración, y el contenido lo sigue armando el servidor con `?registro=<id>`; cada tabla se limita a 20 filas.
- **Los enlaces a Publicaciones están bien armados:** `?q=` con el DOI o con el título, con `encodeURIComponent` (el buscador de Publicaciones ya cubre ambos).
- **Accesibilidad del modal:** `<dialog>` con `aria-labelledby`, foco inicial dentro, Escape cierra y el foco vuelve al icono de la fila (la captura de la tabla lo muestra con el anillo de foco); el icono tiene `aria-label` «Ver detalle de la búsqueda N» y `title`; `scroll={false}` y `router.replace` conservan el scroll, la búsqueda, los filtros, el orden y la página.
- **Sigue la pauta visual:** colores por nombre, `rounded-2xl`, `claseAccionIcono`, etiquetas de `EtiquetaEstado`; sin colores de la paleta de Tailwind.
- **No toca piezas compartidas** y deja el `ICONO_VER` y el modal como referencia para el #341, como pedía el issue.
- **Los datos de personas** del detalle ya los veía quien tiene acceso al módulo (nombre y código del profesor), y no se agrega ningún dato nuevo.

## 4. Revisión visual

Capturas generadas con una copia temporal de la prueba de navegador del PR que **no cierra** el modal (la prueba original lo cierra con Escape antes de capturar, así que ninguna captura suya muestra el modal abierto). Datos ficticios; quedan en la carpeta temporal y no se suben. Revisé las tres:

| Tema | Resultado |
|---|---|
| Claro, escritorio | Rejilla de ocho datos (inicio, profesores, fuentes, periodo, término, duración, obras recibidas y avance), una línea por fuente con «3 obras» en Crossref, publicaciones con «Nueva» y «Ya existía, actualizada», botón «Reintentar lo que falló» y «Cerrar». Se lee bien |
| Oscuro | Mismo orden y buen contraste |
| Celular (390 px) | El modal ocupa casi todo el ancho, apilado y con desplazamiento interno |

La captura de la tabla (con el modal cerrado) muestra el icono de ojo en «Detalle» y la fila abierta resaltada.

## 5. Pruebas de revisión (solo lectura; sin imprimir nombres ni títulos)

Script temporal con `analizarBusqueda`, `textoDuracion` y la consulta de publicaciones sobre los 29 trabajos reales (se borró después):

| Qué comprueba | Resultado |
|---|---|
| Trabajos con datos válidos | 28 de 29 (uno antiguo no pasa el esquema) |
| Con `procedencia` / con `consultasFuentes` | **7** y **10** de 28 |
| Con más de 20 publicaciones | 1 (mostraría «Se muestran 20 de N») |
| Publicaciones de la procedencia que existen en la base | **65 de 65**: no hay huecos |
| Marcadas «Nueva» / «Ya existía, actualizada» | 52 / 19 |
| Tamaño máximo de `Job.datos` | 21 044 caracteres |
| Trabajos que **guardaron publicaciones pero no tienen `procedencia`** | **9**: el detalle diría «Publicaciones guardadas en esta búsqueda (0)» y «Esta búsqueda no guardó publicaciones nuevas ni actualizó existentes» (hallazgo 1) |
| Trabajos sin `consultasFuentes` pero con «Publicaciones encontradas» mayor que 0 | **9**: el detalle diría «Obras recibidas de las fuentes: 0» (hallazgo 1) |
| Trabajos terminados sin fecha de término | **18**: «Terminó: Sin terminar» y «Duración: Sin terminar» |
| Clic en el relleno del modal | `document.elementFromPoint` en el margen izquierdo, inferior y superior **devuelve el propio `<dialog>`**, por lo que `evento.target === evento.currentTarget` y el modal se cierra (hallazgo 2) |

## 6. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante | **Para los trabajos antiguos el detalle afirma cosas falsas.** Antes de este cambio el motor no guardaba `procedencia`, `consultasFuentes` ni `finalizadoEn` en todos los casos: de los 28 trabajos válidos reales, 21 no tienen `procedencia`, 18 no tienen `consultasFuentes` y 18 terminados no tienen `finalizadoEn`. Con ellos: dice que la búsqueda **no guardó publicaciones** aunque guardó (9 trabajos), «Obras recibidas: 0» aunque encontró (9) y «Sin terminar» en búsquedas terminadas (18). La prueba «tolera búsquedas antiguas» exige `obrasRecibidas = 0`, o sea, normaliza el engaño | Distinguir «sin dato» de «cero»: si no hay `consultasFuentes`, mostrar «No registradas»; si no hay `procedencia` y `publicacionesGuardadas` es mayor que 0, mostrar «Esta búsqueda no registró cuáles publicaciones guardó» en lugar de «no guardó»; si falta `finalizadoEn` en una búsqueda terminada, «Fecha de término no registrada». Ajustar la prueba |
| 2 | Menor | **Un clic en el relleno del modal lo cierra.** El `<dialog>` tiene `p-5` y el cierre por «clic fuera» compara `evento.target === evento.currentTarget`; el relleno cuenta como el propio `<dialog>` (comprobado con `elementFromPoint` en los tres márgenes). Quien haga clic en el borde blanco de la tarjeta, sin querer, pierde el detalle | Quitar el relleno del `<dialog>` y ponerlo en un contenedor interior que ocupe todo, o cerrar solo si el clic cae fuera del rectángulo del `<dialog>` |
| 3 | Menor | «Obras recibidas de las fuentes» es la **suma de lo que devolvió cada fuente** (una misma obra en ORCID y OpenAlex cuenta dos veces) y se muestra junto a «Publicaciones encontradas» del aviso, que es otra cifra. En 9 trabajos reales difieren | Aclarar la etiqueta («suma de lo que devolvió cada fuente, con repetidas») o mostrar una sola cifra |
| 4 | Observación | La prueba de navegador original cierra el modal con Escape antes de capturar, así que ninguna captura suya lo muestra abierto; y la tabla «Resultado por profesor» solo se cubre con la prueba de la función (lo dice la descripción). Hay 4 trabajos reales de varios profesores donde saldría | Añadir un caso de varios profesores al simulador y capturar con el modal abierto |
| 5 | Observación | `Job.datos` guarda toda la `procedencia` (21 000 caracteres el máximo hoy); en una búsqueda de 120 profesores crecerá. No es de este PR, pero el detalle depende de ello | Vigilar el tamaño; si crece, guardar solo los identificadores |
| 6 | Observación | El simulador de `useRouter` del arnés solo implementa `replace`: el cierre con el enrutador real de Next (`router.replace` con `scroll: false`) no se probó | Revisarlo en la vista previa de Vercel |
| 7 | Observación | La descripción no menciona `npm run build` (el CI sí lo corre y pasa), y la pantalla completa con sesión real y una búsqueda real de varios profesores no se revisó | Verlo en la vista previa de Vercel |

## 7. Lo que no se probó

- El modal con el enrutador real y con sesión real (solo con el simulador).
- La tabla «Resultado por profesor» en pantalla.
- La captura de celular de la parte inferior del modal.
- `npm run build` en local.

## 8. Dictamen

**Aprobable con comentarios.** El diseño es bueno y el modal es una buena referencia para el #341. Antes de integrar conviene corregir el **hallazgo 1** (trabajos antiguos con datos falsos: 9 reales dirían que no guardaron publicaciones y otros 9 «0 obras») y el **hallazgo 2** (el relleno cierra el modal). El resto es opcional. Falta la aprobación de otra persona del equipo (D-006).
