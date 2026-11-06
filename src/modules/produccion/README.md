# Módulo de Producción Científica (RF-020, RF-021, RF-022, RF-026)

Reglas de negocio, servicios y esquemas Zod para la extracción multifuente, normalización, deduplicación, cuartiles y consolidación de la producción científica.

## Arquitectura de capas (Regla del equipo)

1. **`src/modules/produccion/` (Lógica de dominio pura):**
   - Sin dependencias de `prisma` ni acceso directo a la base de datos.
   - Conectores externos (`scopus.ts`, `openalex.ts`, `orcid.ts`, `crossref.ts`).
   - Normalización de títulos, DOIs, ISSNs y cálculo de similitud con trigramas (`normalizacion.ts`).
   - Deduplicación y fusión de metadatos (`deduplicacion.ts`).
   - Mapeo y enriquecimiento de cuartiles Scopus (`cuartiles.ts`).
   - Orquestador del escaneo (`escaneo.ts`) mediante la interfaz abstracta `RepositorioProduccion`.

2. **`src/app/produccion/repositorio.ts` (Persistencia Prisma):**
   - Implementa `RepositorioProduccion` usando `prisma`.
   - Consulta con `similarity()` y operador `%` sobre índice GIN `gin_trgm_ops` (RF-021, RNF-004).
   - Gestión incremental mediante `CorteEscaneo` por profesor y fuente.

3. **`src/modules/reportes/unificado.ts` (Reporte multifuente en Excel):**
   - Generación del libro Excel con las 3 hojas consolidadas idénticas al script Python (`reporte_unificado.py`):
     - `Reporte unificado`
     - `Publicación-Profesor`
     - `Resumen por profesor`

## Decisiones de diseño y justificación de hallazgos

### Ciclo de vida: Edición y Eliminación (#59 / Hallazgo 7)
Las publicaciones extraídas de fuentes indizadas (Scopus, OpenAlex, ORCID) representan producción científica institucional con vinculación a uno o más profesores (coautorías). Por tanto:
- **No se eliminan físicamente obras institucionales**: la exclusión o desvinculación se gestiona a través del ciclo de vida de la autoría (`Autoria.estado`: `PENDIENTE` → `VALIDADA` o `RECHAZADA` / registro de exclusiones CU-013).
- La edición manual directa sobre registros de APIs externas alteraría la fuente de verdad y la reproducibilidad de los escaneos; las aclaraciones se realizan mediante validación de autorías o registros manuales complementarios (`FuentePublicacion.MANUAL`).

### Procesamiento por lotes y recuperación (Hallazgos 2a, 12 y 13)
- El escaneo manual crea un `Job` con la lista ordenada de profesores activos, el índice pendiente y el resumen acumulado en `datos`. Las altas o bajas posteriores no desplazan los índices de esa lista.
- La Server Action responde antes de consultar las APIs. `after()` procesa un profesor por ejecución; el formulario consulta el avance cada tres segundos y agenda la continuación con `useActionState`. Al volver a `/produccion/escaneo` se recupera el trabajo pendiente más antiguo.
- El cron comparte la misma cola: retoma el trabajo pendiente más antiguo antes de crear otro y procesa hasta 25 profesores, dejando de iniciar nuevos después de tres minutos. La siguiente ejecución continúa desde el índice guardado, también después del profesor 25.
- Una reserva atómica evita que dos peticiones procesen el mismo trabajo simultáneamente. Caduca a los diez minutos para recuperar ejecuciones interrumpidas; un trabajador antiguo no puede sobrescribir el avance de una reserva nueva.
- La pantalla y el cron declaran `maxDuration = 300`. Un profesor con muchas páginas o APIs lentas todavía puede superar ese límite: hay recuperación, pero falta medir el rendimiento real en Vercel. El cierre del navegador detiene las continuaciones de la pantalla; el cron diario puede retomarlas.
- Un fallo de fuente no impide revisar los siguientes profesores. Al terminar con incidencias el trabajo queda `FALLIDO`, con sus datos y cortes conservados para reintentar mediante un nuevo escaneo.
- Pruebas: `lotes.test.ts`, `trabajos.test.ts`, `cron.test.ts` y las pruebas de la Server Action en `revision-pr63.test.ts`. Usan datos ficticios, repositorios simulados y ninguna API real.

### Escaneo incremental (Hallazgo 3c)
- Si no se especifica un año forzado, el motor consulta `CorteEscaneo` para cada par `(profesorId, fuente)`.
- Si el profesor nunca ha sido escaneado, inicia desde el año en curso.
- Con un corte previo se reconsulta desde el año anterior hasta el año actual para recuperar indexaciones tardías y cubrir los años transcurridos. La deduplicación evita repetir las obras guardadas.
- Cada fuente exitosa actualiza su `ultimaFecha` solo después de guardar las publicaciones y sus autorías, usando la fecha de inicio del escaneo.
- Si falla la consulta, falta la clave de Scopus o falla la persistencia de un profesor, se conserva su corte para reintentar. Un año histórico solicitado explícitamente no cambia el corte incremental.
- `escaneo.test.ts` prueba el cambio de año, los errores por fuente, la persistencia previa al corte y los reintentos con un repositorio simulado.

### Integración con autorías y validación (RF-021 y RF-022)
- El repositorio recupera el registro existente cuando otra petición guarda primero el mismo DOI o la misma autoría (`P2002`). Otros errores se propagan para conservar el corte y permitir el reintento.
- Un nuevo escaneo conserva las autorías `VALIDADA` y `RECHAZADA`: no las reinicia a `PENDIENTE`. Las exclusiones por homónimo siguen fuera del conteo validado.
- Si falla la consulta de similitud, el motor no crea la obra sin comprobarla. Devuelve un error legible y conserva el corte; ya no degrada silenciosamente a coincidencia exacta.
- Una publicación se cuenta como guardada en el resumen solo después de vincular sus autorías.
- `repositorio.test.ts` cubre los conflictos de unicidad y los fallos de similitud. `integracion.test.ts` conecta el conector ORCID, el motor, el repositorio y las acciones de Validación con HTTP, sesión y Prisma simulados. Prueba coautorías entre lotes, confirmación, rechazo, permisos y escaneos simultáneos, sin escribir en Supabase.
- Comprobación de infraestructura del 5 de noviembre de 2026: transacción de solo lectura contra la conexión configurada; `pg_trgm` y el índice GIN están presentes, y `similarity()` devuelve 1 para dos variantes de un título ficticio. No se consultaron registros de profesores ni se modificaron datos.
- Pendiente de coordinación con Validación y Reportes: `calcularConteoOficial` cuenta autorías validadas. El total institucional de obras únicas y el conteo por departamento del documento RF-PC requieren agrupar por publicación; no se cambian desde este módulo.

### Límites de tasa y timeout de APIs (RF-020 y RNF-002)
- El cliente HTTP comparte una cola por origen dentro de cada proceso, con una separación mínima de 250 ms entre peticiones. Rutas o claves distintas del mismo proveedor comparten la cola; otros proveedores pueden avanzar en paralelo.
- El timeout de cada intento cubre los encabezados y la descarga del JSON. Los temporizadores se liberan también ante errores de red, HTTP o contenido inválido.
- `Retry-After` se interpreta en segundos o como fecha HTTP. Una espera superior a diez segundos devuelve el error al motor y conserva el enfriamiento para las peticiones posteriores, en lugar de reintentar antes de lo indicado. El motor conserva el corte de la fuente fallida.
- Se reintentan 429, 5xx y fallos transitorios de conexión; no se reintentan 401, 403, 404 ni un JSON inválido. Las respuestas del escaneo usan `cache: "no-store"`.
- La cola es local al proceso: no garantiza una cuota global entre varias instancias de Vercel. Las cuotas y los 429 del proveedor siguen aplicando. Referencias: [OpenAlex](https://help.openalex.org/api/errors/) y [Crossref](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/).
- `conectores/http.test.ts` comprueba concurrencia, separación por proveedor, pausas del servidor, descarga bloqueada, reintentos y liberación de temporizadores con reloj y HTTP simulados.

### Tamaño de página de Scopus
- La prueba real de Scopus Search devolvió HTTP 400 (`INVALID_INPUT`: límite del nivel de servicio) al solicitar 100 resultados por página con la clave de prueba.
- El conector solicita 25 resultados por página y avanza mediante `start` hasta completar los resultados. Con esa configuración la consulta real respondió HTTP 200 y recuperó nueve obras históricas del identificador probado, sin persistencia.
- Las pruebas de paginación simulan un servicio que rechaza páginas mayores de 25 y comprueban que se recuperan 150 obras en seis peticiones. La capacidad permitida depende de la vista y el acceso del cliente; véase [la documentación de Elsevier](https://dev.elsevier.com/api_key_settings.html).

## Consulta de publicaciones (issue #97)

- `/produccion` muestra el resumen; `/produccion/escaneo` contiene el motor y `/produccion/publicaciones` la consulta GET. Las tres páginas usan `Marco` y exigen `requireModulo("produccion")` antes de leer datos. Los roles siguen siendo administración y coordinación.
- Parámetros: `texto` (título, autores o DOI), `profesor` (ID), `anio`, `tipo`, `fuente`, `estado`, `tamanio` (20, 50 o 100) y `pagina`. El formulario de consulta no modifica el profesor seleccionado para escanear.
- Las condiciones se combinan con Y lógico. Si se eligen profesor y estado, una misma autoría debe cumplir ambos. El listado de profesores de consulta incluye los no activos, para poder localizar su producción histórica; el motor sigue ofreciendo solo activos.
- `consulta.ts` valida parámetros con Zod, crea las condiciones y calcula páginas y enlaces. Una URL inválida muestra errores en español y no ejecuta una consulta de publicaciones diferente de la solicitada. Cambiar filtros o tamaño reinicia la página; los enlaces de navegación conservan el resto de parámetros.
- `consultas.ts` cuenta publicaciones, no autorías, y lee el total y las filas en un snapshot `RepeatableRead`. Ordena por creación e ID para que el orden sea determinista y limita cada lectura a 100 filas como máximo.
- Si la página solicitada supera el resultado, se muestra la última página disponible. Sin resultados se muestra `0–0` y una explicación para limpiar filtros.
- Las pruebas cubren validación, condiciones, paginación, conservación de filtros, autorización previa a lecturas y consulta coherente de total/filas. Una comprobación de solo lectura sobre datos DEMO devolvió 20 filas en la primera página y 10 en la segunda, sin repetir obras.
- El alcance compartido con Reportes y Validación, los indicadores y los roles nuevos continúan pendientes de D-211. Esta entrega no modifica esos módulos, el esquema ni las dependencias.

### Pantallas y controles de navegación

- El resumen enlaza al escaneo y a las publicaciones; ya no acumula los dos formularios y el listado en una sola pantalla. Las subpáginas tienen navegación propia del módulo y un enlace para volver mediante `Marco`.
- La consulta mantiene visible el buscador y agrupa las opciones adicionales en «Filtros avanzados», desplegables y abiertos automáticamente cuando tienen errores.
- La cantidad de elementos por página se elige junto al total de resultados y se aplica al cambiar entre 20, 50 y 100. Conserva los filtros y vuelve a la primera página. Sin JavaScript dispone de un botón para aplicar la cantidad.
- La paginación numerada aparece antes y después de la tabla, con primera/última página, páginas próximas y enlaces Anterior/Siguiente. Con muchos resultados se acota el número de enlaces.
- Los enlaces antiguos `/produccion?...` redirigen a la consulta nueva conservando filtros y página. Los parámetros duplicados se conservan para que el servidor los rechace en lugar de ignorarlos.
- La acción de escaneo invalida las tres pantallas al consultar el avance y después de procesar el lote, para refrescar el resumen y los resultados.
