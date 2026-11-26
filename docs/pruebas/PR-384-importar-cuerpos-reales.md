# Revisión del PR #384: importar los Cuerpos Académicos reales (#359)

Revisión del [PR #384](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/384) de `edelpinovs` (I1), rama `feat/M4-RF-012-importar-cuerpos-reales` → `main`. Lleva `Refs #359` (no `Closes`: el issue termina cuando una persona aplica en la base compartida). Es la fase F7 de [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](../PLAN_IMPORTACION_DATOS_REALES_2027.md).

| Campo | Valor |
|---|---|
| PR | #384 · issue #359 |
| Autor | @edelpinovs (el código lo escribió Claude Code a petición suya) |
| Commit revisado | `bbd342a` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 11, Node 24). `simular` contra la base compartida (solo lectura). **Sin ensayo en base local** (aplazado) |
| Resultado | **Aprobable con comentarios, no aplicar todavía.** La lógica reutiliza las reglas de la pantalla de Cuerpos Académicos y tiene dientes; mientras no haya PRODEP de personas reales (F6) **no crearía ningún CA** |
| Estado | **Abierto** |

Esta revisión la hace el mismo agente que escribió el código: **no sustituye la aprobación de otra persona del equipo (D-006).**

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/lib/importar-cuerpos.ts` (nuevo) | Lógica pura: plan, omitidos con motivo, informes, bitácora y reversión |
| `scripts/lib/importar-cuerpos.test.ts` (nuevo) | 28 pruebas con datos ficticios |
| `scripts/importar-cuerpos.ts` (nuevo) | CLI `simular`, `aplicar --confirmo` y `revertir <bitácora> --confirmo` |
| `package.json` | `importar:cuerpos:simular`, `:aplicar` y `:revertir` |
| `docs/IMPORTACION_DATOS_REALES.md` | Sección F7, sin nombres |

Sin esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 139 archivos, **1716 pruebas** (28 nuevas), también después de integrar `main` |
| `npm run lint` y `npx prisma validate` | Correctos |
| `npm run typecheck` | Falla solo localmente por el `.ts` del paquete de datos; excluyendo `datos-reales/` (y con el cliente de Prisma y los tipos de Next regenerados), `tsc --noEmit` pasa limpio |
| `simular` en la base compartida | 17 CA · **0 a crear** · 82 integrantes: 55 sin PRODEP activo, 22 sin código UdeG, 2 altas solicitadas en 2026, 2 fuera de la base, 1 sin tiempo completo · 32 LGAC |

## 3. Pruebas con dientes

| Error introducido | Pruebas que fallaron |
|---|---|
| Cargar también a quien trae un estado distinto de ACTIVO (D-252) | 1 |
| Asignar al líder aunque no haya quedado como integrante (D-111) | 2 |
| Ignorar que la clave ya existe en la base | 2 |
| Dar por cumplido D-109 (PRODEP del primer integrante) | 4 |
| Crear el CA aunque ningún integrante pase | 2 |
| `revertir` sin la condición de LGAC con profesores asignados | 1 |

Cada vez se restauró el archivo desde una copia y se comprobó que quedara idéntico.

## 4. Lo que se leyó y está bien

- Usa las funciones del repo (`cuerpoAcademico`, `revisarCuerpo`, `revisarAltaIntegrante`, `filtroLiderIntegrante`, `tieneProdepActivo`), no copias.
- Quien espera por no tener PRODEP cuando aún no había nadie con PRODEP entra si después llega alguien que sí lo tiene (D-109 solo pide que el primero lo tenga).
- El líder se guarda con la condición de que siga siendo integrante dentro de la misma escritura; si no, toda la transacción se deshace.
- `revertir` borra solo el CA que conserva su clave, integrantes, líder y LGAC, sin profesores asignados; si algo cambia durante la reversión, se deshace todo.
- La terminal solo imprime conteos (sin claves de CA ni nombres) y `host:puerto/base`; los nombres van a `datos-reales/plan-cuerpos.md` (git lo ignora).

## 5. Comentarios

1. **Alta (decisión, no código): no se crearía nada.** Ningún CA pasa D-109 porque no hay PRODEP de personas reales (F6 tampoco crea ninguno, D-285, D-295, D-296). Los 55 integrantes restantes fallan solo por esa regla. Con PRODEP supuesto para todos, la estimación en solo lectura (no aprobada) daría 17 CA (3 consolidados, 7 en consolidación y 7 en formación), 55 integrantes, 15 con líder y las 32 LGAC. Salida: resolver F6 o una decisión nueva sobre D-109.
2. **Media:** un CA solo se crea si al menos un integrante pasa las reglas (`CREAR_CA_SIN_INTEGRANTES_POR_OMISION`). Un CA vacío no se completaría después porque un CA existente no se vuelve a tocar. Cambiarlo exige una decisión nueva.
3. **Media:** `aplicar` y `revertir` nunca se han ejecutado contra una base real, y `revertir` borra filas.
4. **Baja:** al dar de alta a quienes faltan (22 sin código UdeG, 2 fuera de la base), más integrantes llegarán a D-109.
5. **Baja:** 2 de los 17 líderes del Excel no quedarían como integrantes (15 con líder): se informan.
6. **Info:** el área PRODEP se toma de `area_prodep_original` (texto libre en el repo); una variante, «Ciencias Sociales y Administración», se carga tal cual.

## 6. No se probó

`aplicar` y `revertir` contra una base, el ensayo completo del plan y la pantalla de Cuerpos Académicos (detalle, líder e integrantes).

## 7. Qué pasa con los datos al integrar

**Integrar no cambia ningún dato.** Hoy `aplicar` no crearía nada. Pendiente para cerrar: resolver F6 o D-109, aprobación de otra persona y que #359 se cierre después de `aplicar`.
