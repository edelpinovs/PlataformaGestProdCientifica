# Revisión del PR #375: importar los Perfiles PRODEP reales (#358)

Revisión del [PR #375](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/375) de `edelpinovs` (I1), rama `feat/M3-RF-009-importar-prodep-reales` → `main`. Lleva `Refs #358` (no `Closes`: el issue termina cuando una persona aplica en la base compartida). Es la fase F6 de [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](../PLAN_IMPORTACION_DATOS_REALES_2027.md).

| Campo | Valor |
|---|---|
| PR | #375 · issue #358 |
| Autor | @edelpinovs (el código lo escribió Claude Code a petición suya) |
| Commit revisado | `bfaab65` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 11, Node 24). `simular` contra la base compartida (solo lectura). **Sin ensayo en base local** (aplazado) |
| Resultado | **Aprobable con comentarios, no aplicar todavía.** La lógica reutiliza las reglas de la pantalla de PRODEP y tiene dientes; con D-285, D-290 y D-291 **no crearía ningún Perfil** |
| Estado | **Abierto** |

Esta revisión la hace el mismo agente que escribió el código: **no sustituye la aprobación de otra persona del equipo (D-006).**

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/lib/importar-prodep.ts` (nuevo) | Lógica pura: plan, omitidos con motivo, informes, bitácora y reversión |
| `scripts/lib/importar-prodep.test.ts` (nuevo) | 28 pruebas con datos ficticios |
| `scripts/importar-prodep.ts` (nuevo) | CLI `simular`, `aplicar --confirmo` y `revertir <bitácora> --confirmo` |
| `package.json` | `importar:prodep:simular`, `:aplicar` y `:revertir` |
| `docs/IMPORTACION_DATOS_REALES.md` | Sección F6, sin nombres |

Sin esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 133 archivos, **1622 pruebas** (28 nuevas) |
| `npm run lint` y `npx prisma validate` | Correctos |
| `npm run typecheck` | Falla solo localmente por el `.ts` del paquete de datos; excluyendo `datos-reales/`, `tsc --noEmit` pasa limpio |
| `simular` en la base compartida | 128 Perfiles · **0 a crear** · 13 sin fechas · 25 sin código · 2 fuera de la base · 80 de 3 años sin tipo · 8 con fecha de fin distinta |

## 3. Pruebas con dientes

| Error introducido | Pruebas que fallaron |
|---|---|
| Quitar la comprobación de traslape | 3 |
| Quitar la exigencia de tiempo completo | 3 |
| Asignar tipo a los de 3 años sin que nadie lo decida | 2 |
| Ignorar el error de fecha de fin (ajustar la fecha) | 4 |

La primera versión de la cuarta mutación no tenía efecto (el historial falso no formaba una cadena contigua); se rehízo y quedó detectada. Cada vez se restauró el archivo desde una copia y se comprobó que quedara idéntico.

## 4. Lo que se leyó y está bien

- Usa las funciones del repo (`validarContratacionProdep`, `crearEsquemaReconocimientoProdep`, `hayTraslapeProdep`), no copias: si cambian las reglas, el script las sigue.
- No ajusta fechas: si el fin del Excel no es el que calcula el repo, el Perfil se omite y el informe dice qué trae el Excel y qué calcula el repo.
- «Ya existe» se comprueba antes que las demás reglas, para que un segundo `simular` dé 0 aunque cambien la contratación o el historial.
- `aplicar` va en una sola transacción; `revertir` borra solo lo que conserva sus valores, sigue aprobado y sin convocatoria (D-107), y valida la bitácora con Zod.
- La terminal solo imprime conteos y `host:puerto/base`; los nombres van a `datos-reales/plan-prodep.md` (git lo ignora).

## 5. Comentarios

1. **Alta (decisión, no código): no se crearía nada.** De los 115 Perfiles con fechas: 62 de 3 años cumplen la regla de fecha del repo pero no tienen tipo de solicitud (D-285); 45 de 3 años terminan en el día del aniversario, un día después que el repo (D-290); los 8 de 6 años no tienen en la base el primer reconocimiento y la renovación previos (D-291, D-232). Con un tipo supuesto de `RENOVACION` se crearían 42 (estimación en solo lectura, no aprobada).
2. **Media:** `aplicar` y `revertir` nunca se han ejecutado contra una base real, y `revertir` borra filas.
3. **Baja:** la precedencia de motivos subestima «sin tipo» y «fecha distinta»: al resolver código y altas faltantes, más Perfiles caerán ahí. Conviene decirlo al cliente.
4. **Baja:** los 10 PRODEP que hay en la base son de demostración (D-289); no afectan a personas reales.
5. **Info:** la regla de tiempo completo está probada, pero hoy ningún Perfil real llega a ella (los de asignatura caen antes por falta de código).

## 6. No se probó

`aplicar` y `revertir` contra una base, el ensayo completo del plan y el listado PRODEP y el indicador «PRODEP activo» en pantalla.

## 7. Qué pasa con los datos al integrar

**Integrar no cambia ningún dato.** Hoy `aplicar` no crearía nada. Pendiente para cerrar: respuesta del cliente (tipo e historial), aprobación de otra persona y que #358 se cierre después de `aplicar`.
