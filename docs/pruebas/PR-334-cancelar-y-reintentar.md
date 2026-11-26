# Revisión del PR #334: cancelar búsquedas y reintentar solo lo que falló (parte de #279)

Revisión del [PR #334](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/334) de `irybyron` (I6, responsable del módulo Producción), rama `feat/M6-RF-020-cancelar-reintentar-279` → `main`. Usa `Parte de #279` (no lleva `Closes`): es la parte de Producción de los puntos 2, 3 y 4 que I1 pidió acordar; la parte de Administración sigue en el #279. Agrega el estado `CANCELADO` al enum `EstadoJob` con una migración.

| Campo | Valor |
|---|---|
| PR | #334 · issue #279 (parcial) |
| Autor | @irybyron |
| Commit revisado | `4036c6e`, además con `main` mezclado en local (incluye el #333) para probar lo que quedará después de integrar |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consultas a la base compartida **solo de lectura**. No se aplicó la migración. Sin sesión real |
| Resultado | **Aprobable con comentarios.** Las acciones están protegidas, validadas y probadas, y la cancelación no pisa lo guardado. Antes de integrar hay que aplicar la migración en el orden correcto (hallazgo 1) y conviene corregir el reintento, que consulta de más (hallazgo 2) |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `prisma/migrations/20261125150000_estado_job_cancelado` | `CANCELADO` en `EstadoJob` (`ALTER TYPE … ADD VALUE`, aditiva) |
| `src/app/produccion/trabajos.ts` | `cancelarTrabajoEscaneo` (un `updateMany` de `PENDIENTE` o `EN_PROCESO` a `CANCELADO`); `crearTrabajoEscaneo` acepta un profesor o una lista, siempre solo activos (#259) |
| `src/modules/produccion/lotes.ts` | `seleccionReintento` (función pura) y `TIEMPO_RESERVA_MS` (se mueve para que Administración la importe sin arrastrar `prisma`) |
| `src/app/produccion/actions.ts` | `cancelarEscaneoAction` y `reintentarEscaneoAction`: `requireRol(ROLES_ESCANEO)`, id validado con Zod, mensajes en español |
| `src/app/produccion/control-busqueda.tsx` (nuevo) | Botones «Cancelar búsqueda» (con confirmación en pantalla) y «Reintentar lo que falló» |
| `src/app/produccion/historial/page.tsx`, `formulario-escaneo.tsx` | El control aparece en el detalle del historial y en Escanear con una búsqueda pendiente; «Cancelada» con su fecha |
| `src/modules/produccion/historial.ts`, `resultado-escaneo.ts` | El estado «Cancelado» y su mensaje |
| `src/modules/administracion/escaneo.ts`, `src/app/administracion/escaneo/page.tsx` | Solo compatibilidad para que compile (una línea cada uno) |
| Pruebas | `lotes.test.ts`, `trabajos.test.ts`, `control-escaneo.test.ts` (nuevo, 14), `resultado-escaneo.test.ts` y las pruebas de navegador |

Veinte archivos, +360 / −30 líneas. Toca `prisma/schema.prisma` y dos líneas de Administración, y el PR lo declara en su descripción.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (con `main` mezclado en local, que ya trae el #333) | Correcto: 125 archivos, **1491 pruebas** (el PR dice 1488 antes de mezclar los 3 del #333) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto, con el cliente de Prisma regenerado |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | Sin conflictos (`MERGEABLE`) aun con el #333, que también toca `prisma/schema.prisma` (otro enum) |
| Pruebas de navegador `historial`, `fuentes`, `escaneo-manual` y `selector-profesor` | **Correctas en claro, oscuro y celular**, ejecutadas en esta revisión |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **Permisos y validación:** las dos acciones empiezan con `requireRol([...ROLES_ESCANEO])` antes de leer o cambiar datos (hay prueba) y validan el id con `idRegistroHistorial`, así que un id manipulado da un mensaje en español sin tocar la base.
- **La cancelación es atómica y no pisa lo guardado:** un único `updateMany` de `PENDIENTE` o `EN_PROCESO` a `CANCELADO`; `procesarSiguienteProfesor` solo toma esos dos estados y el cierre del profesor en curso exige `EN_PROCESO`, así que no la sobrescribe ni sigue con el siguiente (hay prueba).
- **El reintento respeta las reglas existentes:** crea una búsqueda nueva (no reabre la anterior), conserva el periodo y `enriquecerAutores`, respeta «una búsqueda a la vez» (avisa si ya hay una en curso), solo incluye profesores activos (#259) y no crea un reintento inútil cuando lo único que falló fue la clave de acceso.
- **Mensajes sin texto técnico:** un error inesperado se reemplaza por un texto propio (hay prueba con «secreto de la base»).
- **Confirmación sin `window.confirm`,** con botones en la misma pantalla; los botones usan las piezas de `@/components/ui` y la pauta visual.
- **La migración es aditiva** (`ADD VALUE`): no cambia ni borra nada existente.
- **Reutilización acordada:** la lista de profesores en `crearTrabajoEscaneo` sirve al futuro escaneo por departamento, y `TIEMPO_RESERVA_MS` queda compartida como se acordó en el #279.

## 4. Pruebas de revisión

Consultas de solo lectura a la base compartida y una prueba temporal de la función pura (se borraron después):

| Qué comprueba | Resultado |
|---|---|
| `EstadoJob` en la base hoy | `PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO`: **no incluye `CANCELADO`** |
| Migración `20261125150000_estado_job_cancelado` en la base | **No aplicada** (0 filas), como dice el PR |
| Trabajos existentes | 29: 1 completado y 28 fallidos (25 manuales y 3 diarios); ninguno está pendiente |
| `seleccionReintento`: el profesor 3 falló solo OpenAlex y el 5 solo ORCID | Devuelve **profesores 3 y 5 con fuentes ORCID y OpenAlex**, es decir, 4 consultas en lugar de las 2 que fallaron (hallazgo 2) |
| `seleccionReintento` con solo falta de clave | «Las consultas fallaron porque falta la clave de acceso de una fuente. Configúrala antes de reintentar.» |

## 5. Revisión visual

Capturas del detalle de una búsqueda ficticia con incidencia de Scopus, de la prueba `historial.navegador.mjs` (datos ficticios; quedan en la carpeta temporal y no se suben). Revisé la captura clara:

| Vista | Resultado |
|---|---|
| Claro, escritorio | Debajo de «Consultar publicaciones» aparece «Reintentar lo que falló» con su nota «Crea una búsqueda nueva solo con los profesores y fuentes que fallaron o quedaron sin revisar, con el mismo periodo». Se lee bien |
| Oscuro y celular | Las pruebas pasan; no abrí esas capturas |
| Cancelar en Escanear | **No se ve en ninguna captura** ni la prueba de navegador pulsa «Cancelar búsqueda»: el simulador solo define la acción |

## 6. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (orden de integración) | **La migración no está aplicada.** Sin ella, «Cancelar» falla en producción con «No se pudo cancelar la búsqueda» (el resto sigue funcionando). Aplicarla requiere `npm run db:migrar`. Se acaba de vivir lo contrario con el #333: aplicar una migración **antes** de integrar rompió el sitio publicado. Aquí el orden es menos peligroso porque el valor `CANCELADO` solo lo escribe el código nuevo, así que aplicar justo antes de integrar no afecta al sitio actual | Aplicar `npm run db:migrar` **inmediatamente antes** de integrar (no días antes), avisar al equipo (`git pull` y `npx prisma generate`) e integrar en el mismo momento. Comprobar después que «Cancelar» funciona |
| 2 | Menor (cuotas) | **El reintento consulta de más.** `seleccionReintento` junta todos los profesores que fallaron y todas las fuentes que fallaron y pide el producto cartesiano. Si el profesor 3 falló solo en OpenAlex y el 5 solo en ORCID, se consultan las cuatro combinaciones. La descripción dice «solo esas fuentes» por profesor. Con Scopus y Google Scholar eso gasta cuota para nada | Guardar la lista por profesor (o crear un trabajo por fuente) y consultar solo cada combinación fallida; o aclarar que el reintento usa la unión y aceptarlo |
| 3 | Menor | El botón «Reintentar lo que falló» se muestra en toda búsqueda `FALLIDO`, aunque la selección sea vacía (por ejemplo, cuando solo falló la clave). Al pulsarlo da el aviso, pero la captura ficticia lo enseña justo en ese caso | Calcular `seleccionReintento` en la página y ocultar el botón (o explicar por qué no) cuando no hay nada que reintentar |
| 4 | Observación | En una cancelación, el profesor que ya estaba en curso termina, pero su cierre no se registra (el cierre exige `EN_PROCESO`): las publicaciones que guardó se conservan, pero el resumen del trabajo cancelado puede **subestimar** lo encontrado y no cuenta ese profesor en el avance | Aceptable y está en la descripción («lo ya guardado se conserva»); anotarlo en el mensaje del historial |
| 5 | Observación | «Cancelado» es una etiqueta neutra en el historial de Producción pero `aviso` (ámbar) en Administración; y en el resumen del panel de Administración (`completados` y `conIncidencias`) los cancelados no entran en ninguna cuenta | Decidir el color y si los cancelados se cuentan; es del módulo de I1 |
| 6 | Observación | El formulario de Escanear sondea cada 3 s, así que la pantalla tarda hasta 3 s en reflejar la cancelación; mientras tanto el control muestra el mensaje de éxito | Sin acción |
| 7 | Observación | Las pruebas de las acciones usan dobles, no la base: lo real (migración, `updateMany`) solo se comprobará al aplicar la migración | Probar a mano tras aplicarla: crear una búsqueda pequeña y cancelarla |
| 8 | Observación | La descripción no menciona `npm run build` (el CI sí lo corre y pasa) | Anotarlo |

## 7. Lo que no se probó

- El flujo real de cancelar y reintentar contra la base y las fuentes (la migración no está aplicada).
- «Cancelar búsqueda» y su confirmación en el navegador, y las capturas oscura y de celular del detalle.
- `npm run build` en local.

## 8. Dictamen

**Aprobable con comentarios.** El diseño es sólido: acciones protegidas, cancelación atómica y reintento que no crea trabajo inútil. Antes de integrar: seguir el orden del hallazgo 1 (migrar y luego integrar, sin dejar pasar tiempo) y decidir qué hacer con el reintento que consulta de más (hallazgo 2). Falta la aprobación de otra persona del equipo (D-006).
