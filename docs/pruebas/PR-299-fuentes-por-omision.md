# Revisión del PR #299: fuentes por omisión y completar autores por DOI (RF-020, #188)

Registro de la revisión del [PR #299](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/299) de `irybyron` (rama `feat/M6-RF-020-fuentes-omision-188`). Cierra #188. El comentario está publicado en el PR.

## 1. Alcance revisado

`FUENTES_POR_OMISION` (ORCID, OpenAlex y Scopus marcadas; Crossref y Google Scholar opcionales); casilla «Completar autores por DOI con Crossref», marcada por omisión e independiente de Crossref como fuente; `opcionEnriquecerEsquema` y `debeEnriquecerAutores` (`fuentes.ts`); `Job.datos.enriquecerAutores` (JSON, sin migración); `ejecutarEscaneo`, `crearTrabajoEscaneo`, la acción y la página de escaneo; README; D-258.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local.
- `npm test`: **no se pudo ejecutar en la copia local de quien revisó**; falla en los 114 archivos, también en `main`, por un problema del entorno local con vitest. Las 1,312 pruebas constan solo por el CI (`verificar`, en verde) y lo declarado en el PR.
- Vercel en verde; sin conflictos con `main`; sin migración.
- La pantalla no se vio en el navegador. La autora probó en Chrome con un script (claro, oscuro y celular) y declara pendiente la pantalla real con sesión.

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | Con la casilla marcada por omisión, cada escaneo consulta Crossref por DOI aunque no se elija como fuente; en «todos los profesores» el tiempo por profesor puede crecer frente a `maxDuration`. Medirlo en Vercel y anotarlo en el README | Menor |
| 2 | Sin prueba de que `crearTrabajoEscaneo` guarda `enriquecerAutores` y de que continuar un trabajo usa el valor guardado y no el del navegador (el PR lo afirma; solo se cubre la acción con valores de la solicitud) | Menor |
| 3 | «Seleccionar todas» sigue marcando las cinco fuentes, Scholar incluida; es explícito, pero conviene que la nota de cuota esté cerca del botón | Menor |
| 4 | Con Crossref elegido y la casilla desmarcada ya no se completan autores (antes sí): es intencional y está probado, pero cambia el comportamiento; dejarlo anotado en D-258 | Menor |
| 5 | Revisión de la pantalla real con sesión, claro, oscuro y celular, pendiente (lo declara la autora) | Menor |

**Bien:** cumple el *Terminado cuando* del #188; la casilla se valida con Zod con mensaje en español y se guarda en el servidor; compatibilidad con trabajos anteriores (`debeEnriquecerAutores`) con prueba; el motor conserva la regla anterior si no se indica la opción; pruebas del formulario, la acción, el motor y el esquema; sin migración ni cambios fuera del módulo; README y D-258 al día.

## 4. Dictamen

**Aprobable con comentarios.** Ningún hallazgo bloquea; falta la aprobación de otra persona.
