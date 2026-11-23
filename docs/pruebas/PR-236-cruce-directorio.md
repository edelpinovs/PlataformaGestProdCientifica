# Revisión del PR #236: cruce con el directorio y resultado de participantes (RF-018, #23)

Registro de la revisión del [PR #236](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/236) de `Grillo-de-Alambre` (rama `feat/M5-RF-018-cruce-directorio`). Cierra #23.

## 1. Alcance revisado

Cruce por CVU, Código CUValles y nombre (`cruce.ts`); guardado en `RenglonResultado` al leer la carga; resultado preliminar mientras la carga está en revisión y oficial al confirmar (`recalcular.ts`, `participantes.ts`); pantalla `/convocatorias/participantes` con alta en modal y Eliminar; migración `20261123063310_cruce_directorio`; D-239 y D-240.

## 2. Chequeos

- `npm run typecheck` y `npm run lint`: pasan en copia local (tras `npm ci` y `prisma generate`).
- `npm test`: **no se pudo ejecutar en la copia local de quien revisó**; falla en los 100 archivos, también en `main`, con `Cannot read properties of undefined (reading 'config')` (problema del entorno local con vitest). Las 1,096 pruebas constan solo por el CI (`verificar`, en verde) y por lo declarado en el PR.
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
