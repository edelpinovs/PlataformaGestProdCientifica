# Prueba del PR #175: fuentes de búsqueda seleccionables (issue #167)

Registro de la revisión del [PR #175](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/175) de `irybyron` (rama `feat/M6-RF-020-fuentes-seleccionables`). Cierra #167. El comentario está publicado en el PR. **Integrado** en `main` el 2026-11-10 (merge `b038808`).

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261109232640_agrega_fuente_crossref/` | Agrega `CROSSREF` al enum `FuentePublicacion` |
| `src/modules/produccion/fuentes.ts` | Selección de fuentes validada con Zod (de una a cinco) |
| `src/modules/produccion/conectores/crossref-busqueda.ts`, `google-scholar.ts` | Conectores nuevos: Crossref y Google Scholar por SerpAPI |
| `src/modules/produccion/escaneo.ts`, `lotes.ts` | Consulta solo las fuentes elegidas; estado por profesor y fuente; procedencia |
| `src/app/produccion/formulario-escaneo.tsx`, `actions.ts` | Casillas de fuentes, «Seleccionar todas»; la reanudación respeta las fuentes guardadas |
| `.env.example` | `SERPAPI_API_KEY` y `CROSSREF_MAILTO` (valores vacíos) |

Cambia el esquema. I1 aplicó la migración con `npm run db:migrar` el 2026-11-09, **antes** de integrar. Producción y desarrollo comparten el mismo proyecto de Supabase (ver la sección 3), así que esa fue la única base donde aplicarla.

## 2. Chequeos (copia aislada con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 753 pasan (64 archivos) antes del cambio de I1; 754 después |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |
| `node src/app/produccion/fuentes.navegador.mjs` | correcto en claro, oscuro y celular |

En la rama, una prueba de Validación (`listados.test.ts`) fallaba porque el PR agrega la fuente Crossref y la expectativa de orden del #160 no la incluía; I1 la actualizó (commit `5d16621`).

## 3. Lectura real de la base y consultas externas (solo lectura)

- **Profesores activos:** 49; 23 sin ORCID, 26 con ORCID, 15 con Scholar ID.
- **Enum `FuentePublicacion` en la base:** ORCID, SCOPUS, OPENALEX, GOOGLE_SCHOLAR, MANUAL. **No tiene `CROSSREF`:** la migración es necesaria antes de desplegar.
- **Migraciones aplicadas:** la última es `20261109165553_renglones_resultado` (del #147, aún sin integrar); no choca con el orden de esta.
- **Migración revisada:** solo `ALTER TYPE "FuentePublicacion" ADD VALUE 'CROSSREF'`; el `DROP` de `RenglonResultado` que añadió el generador ya se había retirado.
- **Crossref, consulta genérica por nombre** (nombre inventado, sin datos reales; `rows=0`): `total-results` = **956 636**.
- Sin escrituras en esta lectura.

**Después de aplicar la migración (I1, 2026-11-09):** `prisma migrate status` mostraba solo `20261109232640_agrega_fuente_crossref` pendiente; tras `npm run db:migrar`, el enum es ORCID, SCOPUS, OPENALEX, GOOGLE_SCHOLAR, MANUAL y **CROSSREF**, y la última migración registrada es `agrega_fuente_crossref`.

**No existe un proyecto de Supabase de producción separado.** La organización tiene un solo proyecto y el sitio de producción publica su dirección (`NEXT_PUBLIC_SUPABASE_URL`), que es la del proyecto de desarrollo. El #42 tiene todas las casillas marcadas sin que se cumplan; queda como pendiente del grupo (D-219).

## 4. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | Crossref por nombre (sin ORCID) paginaba hasta 1000 páginas de 100 por profesor sin filtro de año en el primer escaneo: pasaría los 300 s de Vercel y abusaría de una API pública; además, coincidencias por nombre traen homónimos a Validación. **Decisión de I1 (opción A): Crossref solo por ORCID**; sin él, `FALTA_IDENTIFICADOR` sin ninguna petición. Aplicado por I1 (commit `b3bf5ec`) con pruebas y README |
| 2 | Operación | Aplicar la migración **antes** de desplegar: sin ella, buscar «cross» en Validación lanza un error de enum inválido. **Resuelto:** I1 la aplicó el 2026-11-09 y verificó el enum |
| 3 | Decisión | D-210 (alcance de Crossref) sigue pendiente y el uso de SerpAPI no consta como decisión; los Scholar ID van a un tercero. **Resuelto:** I1 confirmó D-210 y se registraron D-125 (Crossref solo por ORCID) y D-126 (Google Scholar con SerpAPI, cuenta gratuita de demostración, clave solo en Vercel); I1 creó la cuenta y definió `SERPAPI_API_KEY` en Vercel |
| 4 | Sugerido | El formulario marca las cinco fuentes por omisión: un clic consulta Scholar para 15 profesores (el plan gratuito da unas 100 consultas al mes). Sigue abierto en el [#188](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/188) |
| 5 | Sugerido | El enriquecimiento de autores con Crossref ahora exige elegir Crossref como fuente; quien no la elija pierde coautorías. Sigue abierto en el #188 |

**Bien:** la migración mínima y revisada, la selección validada con Zod y guardada por trabajo, las fuentes no elegidas no se consultan ni adelantan cortes, una fuente fallida conserva su corte, los conectores no siguen enlaces del proveedor con la clave y los errores son códigos.

**Dictamen: solicitar cambios** (punto 1 aplicado por I1). Resueltos los puntos de operación y de decisión (2 y 3), aprobado por I1 e **integrado**.

## 5. No se probó

Consultas reales a Crossref (con ORCID) y a SerpAPI con la clave ya definida, `npm run build` en la copia y el rendimiento de un escaneo completo.
