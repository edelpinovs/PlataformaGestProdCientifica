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

### Procesamiento por lotes y timeout en Vercel (Hallazgo 2a)
- `OpcionesEscaneo` acepta `limiteProfesores` y `offsetProfesores`.
- El endpoint del cron diario (`/api/cron/escaneo`) procesa lotes configurables (por defecto 25 profesores) para no exceder el límite de ejecución de las Serverless Functions de Vercel.

### Escaneo incremental (Hallazgo 3c)
- Si no se especifica un año forzado, el motor consulta `CorteEscaneo` para cada par `(profesorId, fuente)`.
- Si el profesor nunca ha sido escaneado, inicia desde el año en curso.
- Con un corte previo se reconsulta desde el año anterior hasta el año actual para recuperar indexaciones tardías y cubrir los años transcurridos. La deduplicación evita repetir las obras guardadas.
- Cada fuente exitosa actualiza su `ultimaFecha` solo después de guardar las publicaciones y sus autorías, usando la fecha de inicio del escaneo.
- Si falla la consulta, falta la clave de Scopus o falla la persistencia de un profesor, se conserva su corte para reintentar. Un año histórico solicitado explícitamente no cambia el corte incremental.
- `escaneo.test.ts` prueba el cambio de año, los errores por fuente, la persistencia previa al corte y los reintentos con un repositorio simulado.
