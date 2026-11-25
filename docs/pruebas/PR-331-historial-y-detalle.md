# Revisión del PR #331: historial de búsquedas y su detalle más claros (#330)

Revisión del [PR #331](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/331) de `irybyron` (I6, responsable del módulo Producción), rama `feat/M6-RF-020-vista-historial` → `main`. Lleva `Closes #330` («Producción: historial de búsquedas y su detalle más claros»). Es un cambio de presentación: no cambia qué se guarda ni cómo se busca.

| Campo | Valor |
|---|---|
| PR | #331 · issue #330 |
| Autor | @irybyron |
| Commit revisado | `b8472d5` (con `main` ya contenido en la rama) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`). Cuatro pruebas de navegador ejecutadas y capturas del detalle revisadas en claro, oscuro y celular. Consultas a la base compartida **solo de lectura**. Sin `next dev` y sin sesión real |
| Resultado | **Aprobable con comentarios.** Cumple el «Terminado cuando» del issue y las fechas, el orden y la búsqueda siguen bien con datos reales. Un detalle pierde información (varios motivos de una misma fuente) |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/produccion/historial/page.tsx` | Detalle en rejilla (inicio, profesores, fuentes, periodo, término y avance con etiqueta de estado); estado con etiqueta de color en la tabla; fila abierta resaltada (`aria-current`) con «Abierta arriba»; texto de ejemplo del buscador; subtítulo «Horas del centro de México…»; enlaces como botones de contorno |
| `src/app/produccion/resultado-escaneo.tsx` | Una línea por fuente con `EtiquetaEstado` y, si falló, su motivo; «Consultar publicaciones» como botón de contorno |
| `src/modules/produccion/resultado-escaneo.ts` | `presentarResultadoEscaneo` devuelve `fuentes` (una línea por fuente con su motivo); lo que no se atribuye a una fuente sigue en `incidencias` |
| `src/modules/produccion/historial.ts` | `textoAvance` («1 de 1 profesor revisado»), `TIPO_ESTADO_HISTORIAL` y fechas `DD/MM/YYYY HH24:MI` en el SQL de Historial y Continuidad |
| `src/modules/produccion/fechas-escaneo.ts` | `fechaEscaneo` devuelve `31/12/2025 22:00` |
| `src/app/produccion/escaneo/page.tsx` | Usa el formato nuevo y «(hora del centro de México)» |
| Pruebas | `resultado-escaneo.test.ts`, `historial.test.ts`, `fechas-escaneo.test.ts` y las pruebas de navegador `historial` y `escaneo-manual` |

Once archivos, +172 / −51 líneas. Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 124 archivos, **1464 pruebas** (coincide con la descripción) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos, incluida la prueba de la pauta visual |
| Mezcla con `main` | `main` ya está contenido en la rama; GitHub la marca `MERGEABLE` y `BLOCKED` (falta la aprobación) |
| Pruebas de navegador `historial`, `fuentes`, `escaneo-manual` y `selector-profesor` | **Correctas en claro, oscuro y celular**, ejecutadas en esta revisión |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **No cambia qué se guarda ni cómo se busca.** Solo cambia el texto de salida: el orden sigue usando las columnas de fecha reales (`creadoEn`, `actualizadoEn`), no el texto; ordenar por «Inicio» no se rompe con el nuevo formato.
- **Una sola línea por fuente,** con etiqueta de color y el motivo en español («falta configurar la clave de acceso en el servidor»). Scopus ya no aparece dos veces. Los errores técnicos guardados nunca llegan a la pantalla.
- **Concordancia:** «1 de 1 profesor revisado» y «3 de 30 profesores revisados», con prueba.
- **Accesibilidad:** el detalle es una lista de definiciones (`<dl>`), la fila abierta lleva `aria-current` y el estado se dice con texto además de color.
- **Sigue la pauta visual:** colores por nombre (`EtiquetaEstado`, `bg-marca-tenue`, `bg-superficie-alt`), `claseBotonContorno` y `rounded-full` en las etiquetas. Sin colores de la paleta de Tailwind ni hexadecimales.
- **Una sola forma de escribir las fechas:** la misma `dd/mm/aaaa` de los periodos, en Historial, Continuidad y Escanear.
- **Sin pérdida de funciones:** el ordenamiento, los filtros, la paginación y el formulario de «Ordenar por» en tablet se conservan.

## 4. Pruebas de revisión (solo lectura; sin imprimir nombres)

Script temporal con las consultas reales y `SELECT` contra la base compartida (se borró después):

| Caso | Resultado |
|---|---|
| Historial: fechas de las primeras 29 filas | **29 de 29** con formato `dd/mm/aaaa hh:mm` (`inicio` y `actualizacion`) |
| Orden por «Inicio» descendente | Coincide con el orden de `creadoEn` |
| `fechaEscaneo` (TypeScript) contra el texto del SQL | Coinciden en todas las filas |
| Historial: los siete órdenes con la búsqueda «09/11» | Responden en los siete (2 filas) |
| Continuidad: 860 puntos | 860 filas; los 32 con corte traen el formato nuevo |
| `presentarResultadoEscaneo` sobre los 29 trabajos reales | Ninguno lanza excepción; 10 traen líneas por fuente y ninguno repite una fuente |
| Trabajos con **varios motivos distintos** para una misma fuente | **1 de 29** (hallazgo 1) |

## 5. Revisión visual

Capturas del detalle de una búsqueda ficticia con incidencia de Scopus, generadas por la prueba `historial.navegador.mjs` (quedan en la carpeta temporal y no se suben). Revisé las tres:

| Tema | Resultado |
|---|---|
| Claro, escritorio | Rejilla de seis datos, aviso de resultado, una línea por fuente con su etiqueta y el motivo de Scopus; botón de contorno y nota al pie. Se lee bien |
| Oscuro | Mismo orden; buen contraste en etiquetas, aviso y botones |
| Celular (390 px) | Todo apilado y legible, sin desbordamiento |

La captura termina antes de la tabla: la fila resaltada, las etiquetas de estado y «Abierta arriba» solo se comprobaron por la prueba (`aria-current`) y por el código.

## 6. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Menor | **Se pierde información cuando una misma fuente falla por varios motivos.** Antes la pantalla listaba cada motivo distinto («Scopus: HTTP 429», «Scopus: falta un identificador»…). Ahora solo se muestra el **primero** (`if (linea && !linea.detalle)`); los demás se descartan. Con datos reales ocurre en 1 de 29 trabajos | Unir los motivos distintos de la fuente («…; …») o añadir «y N motivos más» |
| 2 | Menor | El mismo estado se pinta con colores distintos: en el encabezado y la tabla, «Con incidencias» va en **ámbar** (`FALLIDO` es «aviso»), pero en la línea de cada fuente «con incidencias» va en **rojo** | Usar un mismo color para la misma palabra, o cambiar la palabra de la tabla («Parcial») |
| 3 | Observación | El texto de la búsqueda cambió de `2026-11-09` a `09/11/2026`: una búsqueda guardada o un enlace con `q=2026-11` ya no coincide con las fechas. Buscar por `09/11` o por el año sí funciona (comprobado) | Sin acción; el texto de ejemplo del buscador ya anuncia «fecha» |
| 4 | Observación | Las fechas de Producción ahora son `dd/mm/aaaa hh:mm`, mientras la bitácora de Administración usa otro formato (`dateStyle: "medium"`) | Decidir si el equipo quiere un solo formato; no bloquea |
| 5 | Observación | La tabla (etiquetas de estado, fila resaltada y «Abierta arriba») no se vio en ninguna captura; la descripción también lo dice | Verla en la vista previa de Vercel antes de integrar |
| 6 | Observación | La descripción no menciona `npm run build` (el CI sí lo corre y pasa) | Anotarlo |

## 7. Lo que no se probó

- La tabla del historial con la fila resaltada en pantalla y la página con sesión real.
- Un trabajo real con una incidencia por fuente en el navegador (solo con datos ficticios en la prueba).
- `npm run build` en local.

## 8. Dictamen

**Aprobable con comentarios.** Un cambio de presentación limpio, que cumple el «Terminado cuando» del issue y se comprobó con datos reales. Antes de integrar: ver la tabla en la vista previa de Vercel (hallazgo 5). Conviene corregir la pérdida de motivos (hallazgo 1) y la inconsistencia de colores (hallazgo 2). Falta la aprobación de otra persona del equipo (D-006).
