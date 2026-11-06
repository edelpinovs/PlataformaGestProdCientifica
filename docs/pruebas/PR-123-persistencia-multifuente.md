# Prueba del PR #123: Persistencia multifuente sin duplicados (RF-021, issue #122)

Registro de la revisión del [PR #123](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/123) de `irybyron` (rama `test/M6-RF-021-persistencia-multifuente`, commit `404e003`). Cierra #122. Es independiente de los PR #119 y #121. El comentario está publicado en el PR.

## 1. Alcance revisado

Una prueba nueva en `src/app/produccion/integracion.test.ts` (ORCID + OpenAlex con el mismo DOI, repetición del escaneo, segundo profesor, confirmar y rechazar, reescaneos) y documentación. No cambia código de la aplicación ni la interfaz.

## 2. Chequeos automáticos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 519 pruebas pasan (40 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. ¿La prueba detecta fallos de verdad? (mutaciones)

Se rompió a propósito `repositorio.ts` y se corrió `integracion.test.ts` (7 pruebas):

| Mutación | Resultado |
|---|---|
| Ignorar la coincidencia por DOI en `persistirOActualizar` | Falla **solo** la prueba nueva (6 siguen pasando) |
| Quitar la comprobación de autoría existente en `vincularAutoria` | Falla **solo** la prueba nueva (6 siguen pasando) |

Se restauró el archivo y la copia quedó limpia.

## 4. Hallazgos (publicados en el PR)

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | Línea en blanco antes de la fila del #123 en la tabla de `SEGUIMIENTO.md`: la fila queda fuera de la tabla |
| 2 | Menor | `ISSUE-122-persistencia-multifuente.md` empieza con un BOM |
| 3 | Menor | No sustituye una prueba de persistencia real contra la base (la autora ya lo declara) |

## 5. Dictamen y lo que no se probó

**Aprobable con comentarios**, sin defectos de código. No se probó: persistencia contra una base real ni `npm run build` en la copia.
