# Prueba de los PR #172, #173 y #174: escaneo manual de Coordinación, exclusiones por rechazo e historial (issues #170, #168 y #169)

Registro de la revisión de los tres PR de `irybyron`, encadenados: el [PR #172](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/172) (rama `feat/M6-RF-020-escaneo-manual-coordinacion`, base `main`), el [PR #173](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/173) (`fix/M6-RF-021-excluir-autorias-rechazadas`, base la rama del #172) y el [PR #174](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/174) (`feat/M6-RF-020-historial-busquedas`, base la rama del #173). El #173 y el #174 se integraron dentro de la rama del #172, que llegó a `main` con los tres. Los comentarios están publicados en cada PR. Cierran #170, #168 y #169.

## 1. Alcance revisado

| PR | Qué hace |
|---|---|
| #172 (#170) | Solo `COORDINADOR` inicia, reintenta o continúa búsquedas (`requireRol`); retira el cron de `vercel.json` y el endpoint responde 410; serializa el inicio con un bloqueo asesor de Postgres; fechas de inicio y última actualización en `America/Mexico_City`. D-121 |
| #173 (#168) | Una autoría `RECHAZADA` se devuelve al motor como exclusión explícita, también ante `P2002`; el resumen la cuenta aparte. D-122 |
| #174 (#169) | `/produccion/historial` y `/produccion/continuidad`: listados paginados con SQL parametrizado, trabajos antiguos sin inventar fuentes ni fechas, finalización real al terminar. D-123 |

No cambia esquema ni migraciones. `vercel.json` queda fuera del módulo de Producción.

## 2. Chequeos (copia aislada con `main` integrado)

| Chequeo | #172 | #173 | #174 | Conjunto integrado |
|---|---|---|---|---|
| `npm test` | 658 | 663 | 674 | 674 (60 archivos) |
| `npm run lint` | sin errores | sin errores | sin errores | sin errores |
| `npm run typecheck` | sin errores | sin errores | sin errores | sin errores |
| `npm run build` | el CI del PR pasó; no se corrió en la copia | igual | igual | igual |
| Prueba de navegador del PR | `escaneo-manual.navegador.mjs`: correcta en claro, oscuro y celular | no cambia pantallas | `historial.navegador.mjs`: correcta en claro, oscuro y celular | las dos, correctas |

Se miraron las capturas de celular del escaneo manual y del historial en claro y de la continuidad en celular.

## 3. Lectura real de la base (solo lectura)

- **Trabajos:** 19 (1 manual completado, 15 manuales y 3 diarios fallidos), ninguno pendiente; nada bloquearía un inicio nuevo.
- **Bloqueo asesor:** `pg_advisory_xact_lock(170, 20)` con `$queryRaw` falla («Failed to deserialize column of type 'void'»); con `$executeRaw` o con `::text` funciona y el bloqueo se libera al terminar (0 bloqueos abiertos después).
- **Autorías:** 99 (55 pendientes, 38 validadas, 6 rechazadas). De los 19 trabajos, 18 cumplen el esquema nuevo; el primero ya no lo cumplía (sin `version: 1`) antes del cambio.
- **Historial:** 19 búsquedas; `manual` 16; `%` y `_` dan 0; `FALLIDO` 18 y `COMPLETADO` 1; las 7 columnas en ambos sentidos, sin errores.
- **Continuidad:** 147 filas (49 profesores activos × 3 fuentes), 49 por fuente; las 4 columnas en ambos sentidos.
- **Detalle del historial:** `registro=2147483647` consulta bien; `2147483648` y `9007199254740991` lanzaban «Value out of range for the type: integer».
- Sin escrituras.

## 4. Hallazgos (publicados en los PR) y dictamen

| # | PR | Tipo | Hallazgo |
|---|---|---|---|
| 1 | #172 | A corregir | El bloqueo asesor usaba `$queryRaw` y fallaba contra la base real: cada «Buscar novedades» habría respondido que no se pudo iniciar. Las pruebas lo simulaban. I1 lo cambió a `$executeRaw` (commit `0867550`) |
| 2 | #172 | A corregir | La fila D-121 tenía una línea en blanco antes y quedaba fuera de su tabla. I1 la pegó a D-120 |
| 3 | #172 | Decisión | Quitar el cron de `vercel.json` (fuera de Producción) elimina el escaneo diario al desplegar. Falta la confirmación escrita de I1 en el #170 y retirar `CRON_SECRET` de Vercel |
| 4 | #172 | Decisión | D-121 quedó «vigente» por decisión de la propia autora; conviene que I1 la confirme |
| 5 | #173 | Menor | `autoriasRechazadasOmitidas` es opcional en el tipo pero `resumenVacio()` lo devuelve obligatorio; dos contadores cambian de significado; una obra con otro DOI o título volvería como candidata |
| 6 | #174 | A corregir | `?registro=2147483648` tumbaba la página (el identificador aceptaba hasta `MAX_SAFE_INTEGER` y `Job.id` es un `Int` de 32 bits). I1 limitó el máximo a 2 147 483 647 (commit `168d1da`) |
| 7 | #174 | Menor | La regla del periodo de continuidad y las etiquetas de fuente están escritas dos veces (SQL y TypeScript); «Profesor #107» no se reconoce; el historial duplica el formulario «Ordenar por»; el selector «Sentido» corta su texto en celular |
| 8 | #172 a #174 | Menor | El ayudante de pruebas de Chrome tiene tres copias |
| 9 | #172 | Proceso | Al integrarse #173 y #174 en la rama, la descripción solo cerraba el #170; I1 agregó `Closes #168` y `Closes #169` |

Las ramas encadenadas se actualizaron con las correcciones mediante fusiones normales (`7e0560c` en la del #173 y `437fd34` en la del #174), resolviendo los conflictos de `docs/DECISIONES.md` (D-122 duplicado y orden de D-121 a D-123).

**Bien:** `requireRol(["COORDINADOR"])` antes de leer o crear trabajos y formulario solo para Coordinación; la continuación conserva identificador, alcance y fecha; el endpoint viejo responde 410 sin leer ni crear trabajos; una autoría rechazada se omite por profesor y obra sin reiniciar su estado; los trabajos antiguos siguen siendo válidos; SQL con parámetros y orden de una lista permitida.

**Dictamen: #172 solicitar cambios, #173 y #174 aprobables con comentarios.** Las correcciones obligatorias las aplicó I1 en las ramas. Los tres se integraron.

## 5. No se probó

La pantalla con una sesión real de Coordinación, `npm run build` en la copia, el procesamiento con consultas reales, un trabajo antiguo (sin `version`) en la pantalla, un escaneo completo con una autoría rechazada y una búsqueda con fuentes guardadas.
