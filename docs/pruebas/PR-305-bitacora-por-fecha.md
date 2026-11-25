# Revisión del PR #305: filtro por periodo y búsqueda por fecha en la bitácora (#277, parcial)

Registro de la revisión del [PR #305](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/305) de `edelpinovs` (rama `feat/M1-277-bitacora-fecha`). Usa `Refs #277`: el issue sigue abierto. El comentario está publicado en el PR.

**Esta revisión no es independiente:** el código lo escribió el mismo agente de IA que lo revisa, a petición de I1. Sirve como segunda lectura, **no sustituye la aprobación de otra persona del equipo**.

## 1. Alcance revisado

Búsqueda libre que cubre «Fecha» (`2026`, `2026-11`, `2026-11-24`, hora de Ciudad de México); filtro «Periodo» (Hoy, Últimos 7 días, Últimos 30 días, Este mes) en `fechas.ts` y `auditoria-listado.ts`; la exportación conserva el periodo y lo anota (`exportar.ts`); pantalla `/administracion/auditoria`. Sin esquema, migración, dependencias ni cambios en `src/lib/` o `src/components/`.

## 2. Chequeos

Sobre `71f6a18` (último commit de la rama), ejecutados desde PowerShell con `C:\PROJECTS\…`:

- `npm test`: 117 archivos y 1,349 pruebas pasan.
- `npm run lint`, `npm run typecheck` y `npm run build`: sin errores.
- CI (`verificar`) y Vercel en verde; sin conflictos con `main`.
- La pantalla no se vio en el navegador (claro, oscuro y celular).

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | La búsqueda por fecha solo entiende formatos numéricos (`2026-11-24`); la columna muestra «24 nov 2026, 14:05», así que buscar «nov» no encuentra por fecha. La cobertura de D-009 es parcial (igual que «Alta» en Usuarios) | Menor |
| 2 | El periodo es relativo al momento de la descarga: una exportación pedida horas después de ver la pantalla puede traer filas distintas. Anotarlo en el README o la nota de la pantalla | Menor |
| 3 | Sin prueba de que `enlaceExportacion` conserva `periodo` (lo hace por la definición del listado, pero no está cubierto) ni de que periodo y búsqueda se combinan (la condición de fecha del periodo y la del texto van en claves distintas) | Menor |
| 4 | Un tercer filtro en la barra puede apretar el celular; sin ver | Pendiente |
| 5 | Un rango libre «desde–hasta» sigue pendiente: exige ampliar `src/lib/listados/consulta.ts` (acordar antes) | Pendiente del #277 |

**Bien:** zona horaria de México correcta, también cerca de medianoche, cambio de mes y de año; valores finitos validados en el servidor con aviso en español; sin pieza compartida tocada; la bitácora sigue sin Editar ni Eliminar; pruebas de los bordes.

## 4. Dictamen

**Aprobable con comentarios.** Ningún hallazgo bloquea; falta la aprobación de otra persona y la revisión visual.
