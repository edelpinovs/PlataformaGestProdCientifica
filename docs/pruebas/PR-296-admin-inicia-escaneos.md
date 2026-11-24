# Revisión del PR #296: el administrador también inicia escaneos (RF-020, #265)

Registro de la revisión del [PR #296](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/296) de `irybyron` (rama `feat/M6-RF-020-admin-escaneo-265`). Cierra #265.

## 1. Alcance revisado

Regla pura `permisos.ts` (`ROLES_ESCANEO`, `puedeEscanear`); `iniciarEscaneoAction` con `requireRol([...ROLES_ESCANEO])`; formulario de `/produccion/escaneo` y enlace del historial para Administración y Coordinación; README del módulo; D-256 (reemplaza a D-121); pruebas por rol en la acción y la página.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local.
- `npm test`: **no se pudo ejecutar en la copia local de quien revisó**; falla en los 117 archivos, también en `main`, por un problema del entorno local con vitest. Las 1,292 pruebas constan solo por el CI (`verificar`, en verde) y lo declarado en el PR.
- Vercel en verde. **Conflicto con `main`** en `docs/DECISIONES.md`.
- La pantalla no se vio en el navegador (la autora tampoco: lo declara pendiente).

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | D-256 ya existe en `main` con otro tema (rango de fechas del escaneo, #266): numeración repetida y conflicto en `docs/DECISIONES.md`. Renombrar a la siguiente libre, corregir «reemplazada por» en D-121 y actualizar con `main` | Bloqueante de proceso |
| 2 | `src/app/administracion/escaneo/page.tsx:164` sigue diciendo «Por ahora solo Coordinación puede iniciar…»; contradice el cambio y el issue pide revisar todas las pantallas del escaneo | A corregir |
| 3 | El enlace del historial (`puedeEscanear`) no tiene prueba propia | Menor |
| 4 | D-256 queda «vigente» con #243 y #242 por acordar: confirmar que lo acordó la Coordinación y no solo la reunión | Menor |
| 5 | Revisión visual en claro, oscuro y celular pendiente (pide el *Terminado cuando* del #265); `build` local sin correr | Menor |

**Bien:** solo se toca el módulo de Producción, un único punto de verdad para los roles, el servidor rechaza a DOCENTE antes de acceder a datos, pruebas por rol en acción y página, README al día.

## 4. Dictamen

**Solicitar cambios (ligeros)** en la primera revisión (2026-11-24): resolver el hallazgo 1 y corregir el 2; el resto es menor.

## 5. Actualización (2026-11-24)

A petición de I1, quien revisó aplicó los hallazgos 1 y 2 en la rama del PR (commit `c7a7c7d`, comentario [en el PR](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/296#issuecomment-7141642094)):

| # | Hallazgo | Estado |
|---|---|---|
| 1 | D-256 repetida y conflicto en `docs/DECISIONES.md` | **Resuelto**: la decisión pasa a D-257, D-121 queda «reemplazada por D-257» y se hizo merge con `main`; el PR queda sin conflicto |
| 2 | Aviso «solo Coordinación» en `src/app/administracion/escaneo/page.tsx` | **Resuelto**: dice que Administración y Coordinación pueden iniciar, reintentar o continuar desde «Escaneo» |
| 3 | Prueba del enlace del historial | Abierto (a cargo de la autora) |
| 4 | Acuerdo de D-257 con la Coordinación (#243 y #242 por acordar) | Abierto |
| 5 | Revisión visual en claro, oscuro y celular; `build` local | Abierto |

Chequeos tras el cambio: `typecheck` y `lint` pasan en copia local; el CI (`verificar`) y Vercel pasan con `c7a7c7d`. `npm test` sigue sin poder ejecutarse en la copia local de quien revisó (entorno), así que las pruebas constan solo por el CI.

**Dictamen actualizado: aprobable con comentarios**, pendiente de la aprobación de otra persona y de los puntos 3 a 5.
