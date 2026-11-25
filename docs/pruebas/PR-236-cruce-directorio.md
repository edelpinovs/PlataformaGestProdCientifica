# Revisión del PR #236: cruce con el directorio y resultado de participantes (RF-018, #23)

Registro de la revisión del [PR #236](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/236) de `Grillo-de-Alambre` (rama `feat/M5-RF-018-cruce-directorio`). Cierra #23.

## 1. Alcance revisado

Cruce por CVU, Código CUValles y nombre (`cruce.ts`); guardado en `RenglonResultado` al leer la carga; resultado preliminar mientras la carga está en revisión y oficial al confirmar (`recalcular.ts`, `participantes.ts`); pantalla `/convocatorias/participantes` con alta en modal y Eliminar; migración `20261123063310_cruce_directorio`; D-239 y D-240.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local (tras `npm ci` y `prisma generate`).
- `npm test` (verificado en local el 2026-11-24, sobre `13aa55b`, último commit de la rama): **100 archivos y 1,096 pruebas pasan**, y `npm run typecheck` sin errores. La primera revisión no pudo ejecutarlo por un problema de entorno (la ruta de trabajo con la letra de unidad en minúscula rompía vitest; se corrige ejecutando desde PowerShell con `C:\PROJECTS\…`). Además pasa el CI (`verificar`, en verde).
- Vercel en verde. Sin conflictos con `main`.
- La pantalla no se vio en el navegador; la etiqueta «(preliminar)» tampoco la vio la autora.

## 3. Hallazgos

| # | Hallazgo | Tipo |
|---|---|---|
| 1 | D-239 sigue pendiente con la Coordinación (plan §8 punto 1, #5): de ella dependen quién es participante y el resultado preliminar | Abierto |
| 2 | `calcularParticipaciones` pisa un `EN_RECONSIDERACION` guardado (lo pasa a Aprobado o lo limpia); hoy nada lo escribe | A corregir |
| 3 | `claveNombre` ordena las palabras: «Ana María López» y «María Ana López» chocan (quedan dudosos; no se asigna mal). Documentarlo para RF-019 | Menor |
| 4 | `recalcularConvocatoria` no tiene llamador hasta RF-019; solo pruebas unitarias | Menor |
| 5 | «(preliminar)» sin ver en el navegador | Menor |

**Bien:** `requireModulo` en página y acciones, mensajes de Zod propios, profesor revalidado en el servidor, `P2002` capturado, condición de «confirmada» dentro del `DELETE`, migración solo aditiva sin `DROP`, sin *Editar* justificado (#59), reporte RF-028 sin cambio.

## 4. Dictamen

**Aprobable con comentarios.**
