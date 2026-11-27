# Revisión del PR: bitácora de dictámenes y borrados de Validación (#381, RF-024, #277)

Implementación del issue [#381](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/381) por `yanetzijimeno8297` (I7, responsable de Validación), rama `feat/M7-381-auditoria-validacion` → `main`. Lleva `Closes #381`. Es un sub-issue de la bitácora de auditoría (#277): usa la pieza compartida `registrarAuditoria` (PR #374) para que *confirmarAutoria*, *rechazarHomonimo* y *eliminarPublicacionManual* dejen constancia en la misma transacción que el cambio en la base de datos (`prisma.$transaction`).

| Campo | Valor |
|---|---|
| PR | issue #381 (`Closes`) |
| Autor | @yanetzijimeno8297 (I7) |
| Rama | `feat/M7-381-auditoria-validacion` |
| Fecha | 2026-11-26 |
| Entorno | Local (Windows 10, Node 24). Pruebas unitarias y de integración ejecutadas con Vitest. Verificación de lint, typecheck y build. Sin migración requerida |
| Resultado | **Aprobable.** Cumple la lista de *Terminado cuando* del #381; registra auditoría en transacción atómica y sin datos personales (D-294) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/validacion/actions.ts` | `confirmarAutoria`, `rechazarHomonimo` y `eliminarPublicacionManual` registran auditoría dentro de `prisma.$transaction` |
| `src/app/validacion/actions.test.ts` | 8 pruebas nuevas de auditoría: registro en transacción, reversión ante falla, exclusión de datos personales y omisión cuando no hay permisos |

No toca `prisma/schema.prisma` ni requiere nuevas migraciones (reutiliza `registrarAuditoria`, `eventoAuditoria`, `resumenDictamen` y `resumenEliminacion` que ya existen en `main`).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 142 archivos, **1763 pruebas** pasadas |
| `npm run lint` | Correcto: 0 errores, 0 advertencias |
| `npm run typecheck` | Correcto: `next typegen && tsc --noEmit` completado sin errores |
| `npm run build` | Correcto: compilación exitosa y generación de las 45 rutas del proyecto (incluida `/validacion`) |
| Pantallas en navegador | Probadas con pruebas de componentes y Server Actions; revisión visual en producción delegada para vista previa |

## 3. Lo que se implementó y está bien

- **Misma transacción:** el cambio de estado de autoría (`autoria.update`) o el borrado de publicación (`publicacion.delete`) se ejecuta conjuntamente con `registrarAuditoria(...)` dentro de `prisma.$transaction`. Si la auditoría falla, la mutación se revierte y el error sube.
- **Acciones y entidades registradas:**
  - `confirmarAutoria`: `validacion.dictaminada`, entidad `Publicacion`, resumen `Dictaminó la publicación <id>: confirmada.`
  - `rechazarHomonimo`: `validacion.dictaminada`, entidad `Publicacion`, resumen `Dictaminó la publicación <id>: rechazada.`
  - `eliminarPublicacionManual`: `registro.eliminado`, módulo `"validacion"`, entidad `Publicacion`, resumen `Eliminó la publicación manual <id>.`
- **Sin datos personales (D-294):** los resúmenes contienen únicamente identificadores numéricos y estados/tipos. Nunca contienen nombres, correos ni datos de profesores o autores.
- **Tolerancia y compatibilidad:** en entornos de prueba con dobles parciales que no implementan `$transaction` o `auditoria`, se mantiene compatibilidad sin degradar la funcionalidad principal.
- **Permisos y validaciones previas:** si la operación es rechazada por permisos (`sin-permiso`), validación de datos (`datos-invalidos`) o regla de negocio (`transicion-invalida`), no se escribe en la bitácora ni se invoca la transacción.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **La transacción y reversión se probaron con dobles.** Similar a Catálogos (#402) y Convocatorias (#393), que una falla de la bitácora revierta la mutación depende de la semántica transaccional de Prisma. Queda cubierto por dobles y pruebas de rollback en Vitest. |
| 2 | Informativo | No requiere migración ni modificaciones en otros módulos. |

## 5. Dictamen

**Aprobable.** Cumple con los requerimientos del issue #381 y las políticas de auditoría del proyecto. Listo para revisión por `@edelpinovs`.
