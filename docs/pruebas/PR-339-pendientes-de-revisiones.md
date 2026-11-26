# Revisión del PR #339: puntos abiertos de las revisiones de #319, #324, #327 y #331 (#338)

Revisión del [PR #339](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/339) de `irybyron` (I6, responsable del módulo Producción), rama `fix/M6-RF-020-pendientes-revisiones` → `main`. Lleva `Closes #338` («Producción: atender los puntos abiertos de las revisiones de #319, #324, #327 y #331»). Corrige los hallazgos de código de [PR-319](PR-319-rango-escaneo.md), [PR-324](PR-324-vista-escaneo-en-pasos.md), [PR-327](PR-327-filtros-publicaciones.md) y [PR-331](PR-331-historial-y-detalle.md), y agrega la decisión D-276.

| Campo | Valor |
|---|---|
| PR | #339 · issue #338 · decisión D-276 |
| Autor | @irybyron |
| Commit revisado | `37a312e`; además, **con `main` mezclado en local** (el #334 y las decisiones D-275 y D-276 ya están en `main`) para probar el estado posterior a integrar |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consultas a la base compartida **solo de lectura**. Sin sesión real |
| Resultado | **Aprobable con comentarios.** Atiende los doce hallazgos con prueba o comprobación. Hoy **tiene conflictos con `main`** (tres archivos) y D-276 se registra como «vigente» sin la confirmación de I1 |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/resultado-escaneo.ts` y `src/app/produccion/resultado-escaneo.tsx` | Los motivos distintos de una misma fuente se unen con « · »; el estado de la fuente pasa de «con incidencias» a **«falló»** (rojo) |
| `src/modules/produccion/historial.ts` | `fechaGuardadaSql`: el periodo del alcance se recorta como texto, sin `::date` |
| `src/app/produccion/filtros-publicaciones.tsx` | Año, Desde y Hasta en un solo grupo (`role="group"`); «Año» recupera «de publicación» para lectores de pantalla; texto de ejemplo del buscador |
| `src/app/produccion/formulario-escaneo.tsx` | Nota sobre Scopus, resumen con `aria-live="polite"` y profesor como «Apellidos, Nombres · Código»; `max` = hoy en Desde y Hasta |
| `src/modules/produccion/rango-escaneo.ts` | D-276: sin fechas futuras; error en «Desde» si es futura; el tope dice «10 años calendario» |
| `src/modules/produccion/resumen-busqueda.ts` | El resumen ya no dice «solo novedades» |
| Pruebas y documentos | `historial`, `lotes`, `rango-escaneo`, `resultado-escaneo` y `resumen-busqueda`; `selector-profesor.navegador.mjs`; README del módulo y `docs/DECISIONES.md` (D-276) |

Quince archivos, +84 / −31 líneas. Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`. Importa `SelectorFiltro` de `@/components/listado-cliente` (pieza compartida existente, sin modificarla).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` en el PR tal cual | CI en verde (1473 pruebas según la descripción) |
| `npm test` **con `main` mezclado** (conflictos resueltos en local) | Correcto: 125 archivos, **1497 pruebas** |
| `npm run lint` y `npm run typecheck` (con `main` mezclado) | Correctos |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos sobre el commit del PR |
| Mezcla con `main` | **Conflicto (`DIRTY`)**: ver el hallazgo 1 |
| Pruebas de navegador `historial`, `fuentes`, `escaneo-manual` y `selector-profesor` (con `main` mezclado) | **Correctas en claro, oscuro y celular**, ejecutadas en esta revisión |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Cierre de los hallazgos de las revisiones anteriores

| Hallazgo | Resultado |
|---|---|
| #331-1: se perdían motivos de una misma fuente | Corregido; prueba nueva con tres motivos y un repetido |
| #331-2: «con incidencias» en dos colores | Corregido de otra forma: la fuente dice **«falló»** (rojo) y la búsqueda sigue diciendo «Con incidencias» (ámbar); ya no es la misma palabra con dos colores |
| #327-1: texto de ejemplo del buscador | Corregido: «Título, autor, DOI, revista o profesor» |
| #327-2: Año, Desde y Hasta no iban juntos | Corregido: forman un grupo; la captura clara muestra los tres en la misma fila |
| #327-3: nombre accesible de «Año» | Corregido: «Año» + «de publicación» solo para lectores de pantalla |
| #324-1: texto inexacto para Scopus | Corregido: «la primera vez trae todo el historial, salvo Scopus, que empieza en el año en curso»; el resumen ya no dice «solo novedades» |
| #324-2: `aria-live` | Corregido |
| #324-3: profesor sin código en el resumen | Corregido: «Ejemplo Sur, Bruno · DEMO-002» (visto en la captura) |
| #319-1: fechas futuras (D-276) | Implementado: ni «Desde» ni «Hasta» después de hoy; ver los hallazgos 2 y 3 |
| #319-2: el SQL del historial fallaba con una fecha imposible | Corregido y **comprobado contra la base** (sección 4) |
| #319-3: mensaje con «Desde» futura | Corregido: sale en «Desde» y dice «La fecha inicial no puede ser posterior a hoy.» |
| #319-6: «10 años calendario» | Corregido en el mensaje y en la nota |

## 4. Pruebas de revisión (solo lectura; sin imprimir datos de personas)

Script temporal con la validación real y `SELECT` contra la base compartida (se borró después). «Hoy» en Ciudad de México era 2026-11-25:

| Caso | Resultado |
|---|---|
| «Desde» futuro sin «Hasta» (2027-03-01) | Error en `desde`: «La fecha inicial no puede ser posterior a hoy.» |
| «Hasta» futuro (2027-06-01) | Error en `hasta`: «La fecha final no puede ser posterior a hoy (25/11/2026).» |
| «Desde» = hoy sin «Hasta» | Acepta: rango de hoy a hoy |
| Rango normal 2024-03-15 a 2025-06-30 | Acepta |
| Diez años y medio (2010-01-01 a 2025-12-31) | «El rango puede abarcar como máximo 10 años calendario.» |
| Historial real con el SQL nuevo | Responde: 29 filas; los alcances salen como «del 19/06/2024 al 27/11/2026», «año 2020», «novedades»… |
| JSON con `{"desde":"2024-02-30",…}` | Antes: error de la base `22008` y la pantalla no cargaba. Ahora: muestra «del 30/02/2024 al 30/06/2025» sin error |
| El SQL del historial | Ya no contiene `::date` |

Dato útil: ya existe un trabajo real con «Hasta» futuro (**27/11/2026**), creado cuando D-271 lo permitía. Sigue mostrándose bien; la nueva regla solo se aplica al crear (hallazgo 4).

## 5. Revisión visual

Capturas de las pruebas de navegador del PR con `main` mezclado (datos ficticios; quedan en la carpeta temporal y no se suben). Revisé las claras de Publicaciones y de Escanear:

| Pantalla | Resultado |
|---|---|
| Publicaciones, claro | Buscador, Tipo, Fuente y Estado en la primera fila; **Año, Desde y Hasta juntos** en la segunda; Profesor, botones y filtros activos debajo |
| Escanear, claro | Nota nueva sobre Scopus y «sin fechas futuras»; el resumen dice «para Ejemplo Sur, Bruno · DEMO-002» y el botón «Cancelar búsqueda» del #334 aparece bien |
| Oscuro y celular | Las pruebas pasan; no abrí esas capturas |

## 6. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (antes de integrar) | **El PR tiene conflictos con `main` (`DIRTY`)** desde que se integró el #334. Son **tres** archivos, no dos como dice la descripción: `docs/DECISIONES.md` (la decisión D-275 del #336 y D-276 se agregan en el mismo lugar), `src/app/produccion/selector-profesor.navegador.mjs` y `src/modules/produccion/resultado-escaneo.test.ts`. Los resolví en local y con el resultado todo pasa (1497 pruebas, lint, typecheck y las cuatro pruebas de navegador) | Actualizar la rama con `main` conservando: en DECISIONES, D-275 y luego D-276; en la prueba, las dos pruebas nuevas; en el script de navegador, la línea del #334 con el texto «10 años calendario» |
| 2 | Importante (proceso) | **D-276 se registra como «vigente»** por «Decisión de @irybyron (I6) en sesión». Es el tercer caso (D-271 en el #319 y D-272 en el #322): una regla de negocio que el issue dejaba por acordar la fija la autora. D-276 además «completa» a D-271, que sigue «vigente; en revisión». La regla de la bitácora es que lo propuesto va como `pendiente` | Dejar D-276 como `pendiente` hasta que I1 (o el cliente) la confirme, junto con D-271 y D-272 |
| 3 | Menor | `max={hoy}` en los campos de fecha se calcula en el cliente en cada render (`hoyMexico()`). Si la página queda abierta después de medianoche el límite del calendario queda atrasado un día, y en el primer render puede no coincidir con el del servidor. El servidor siempre valida, así que no hay riesgo de datos | Aceptable; si molesta, calcularlo en la página (servidor) y pasarlo como propiedad |
| 4 | Observación | La regla solo se aplica al **crear**: un trabajo guardado con «Hasta» futuro (hay uno) se muestra y, al continuar o reintentar, conserva esa fecha | Correcto y sin riesgo; mencionarlo en D-276 |
| 5 | Menor | El resumen dice «sin periodo fijo, desde la última búsqueda de cada fuente» incluso en la primera búsqueda de una fuente, que trae todo el historial (o el año en curso en Scopus). La nota de abajo lo aclara | Opcional: «desde la última búsqueda de cada fuente, o todo el historial si es la primera» |
| 6 | Observación | `aria-live="polite"` en el resumen lo anuncia en cada cambio de fuente, profesor o fecha, lo cual puede ser reiterativo | Sin acción por ahora; revisar con una persona usuaria de lector de pantalla |
| 7 | Observación | La fecha imposible guardada se muestra tal cual («30/02/2024») sin avisar que no es válida | Aceptable: el esquema impide guardarla; solo evita que se caiga la pantalla |
| 8 | Observación | La página completa de Escanear y de Publicaciones con sesión real no se revisó; la descripción tampoco menciona `npm run build` | Verlas en la vista previa de Vercel antes de integrar |

## 7. Lo que no se probó

- Las pantallas completas con sesión real (Escanear, Publicaciones, Historial).
- Las capturas oscura y de celular (solo se comprobó que las pruebas pasan).
- Un lector de pantalla real con el resumen.
- `npm run build` en local.

## 8. Dictamen

**Aprobable con comentarios.** Un PR ordenado que cierra los doce hallazgos con prueba o con comprobación contra datos reales. Antes de integrar: **actualizarlo con `main`** (hallazgo 1) y decidir el estado de **D-276** con I1 (hallazgo 2). El resto son mejoras menores. Falta la aprobación de otra persona del equipo (D-006).
