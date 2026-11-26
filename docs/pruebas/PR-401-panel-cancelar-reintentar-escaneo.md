# Revisión del PR #401: el panel cancela y reintenta escaneos con la lógica de Producción

Revisión del [PR #401](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/401), parte 2 de [#279](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/279). La parte de Producción (cancelar, reintentar y el estado `CANCELADO`) ya estaba integrada en el PR #334 de `irybyron`.

| Campo | Valor |
|---|---|
| PR | #401 (`Refs #279`; el issue sigue abierto) |
| Autor | @edelpinovs (I1), con Claude Code |
| Rama | `feat/M8-279-control-escaneo` → `main` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | La misma persona que lo escribió. **No es una revisión independiente**: falta que la haga otro integrante (I6 es la persona indicada, porque el PR usa código suyo) |
| Entorno | Local (Windows 10, Node 24), sobre `main` con el cliente de Prisma regenerado. Sin `next dev`, sin sesión y sin cambios de base de datos |
| Resultado | **Pendiente de revisión de otra persona y de la comprobación en pantalla.** El código y las pruebas automáticas están correctos; lo que se ve en el navegador no se probó |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/administracion/escaneo/page.tsx` | Cada fila de «Últimos escaneos» muestra `<ControlBusqueda>` de Producción con lo que decide `controlesEscaneo` |
| `src/modules/administracion/escaneo.ts` | `TIEMPO_SIN_AVANCE_MS` pasa a ser `TIEMPO_RESERVA_MS` (de `src/modules/produccion/lotes.ts`); función pura nueva `controlesEscaneo(estado)` |
| `src/modules/administracion/escaneo.test.ts` | Pruebas de que las dos constantes son la misma y de qué botones salen por cada estado |

Sin cambios de esquema, migración ni dependencias. No se edita nada de `src/app/produccion/`.

## 2. Qué se reutiliza de Producción y qué no se duplica

| Pieza | Dónde vive | Cómo la usa el panel |
|---|---|---|
| `cancelarEscaneoAction` y `reintentarEscaneoAction` | `src/app/produccion/actions.ts` | Las llama `<ControlBusqueda>`; cada una empieza con `requireRol([...ROLES_ESCANEO])` (administración y coordinación) y valida el id con Zod |
| `<ControlBusqueda>` | `src/app/produccion/control-busqueda.tsx` | Se importa tal cual, con confirmación antes de cancelar |
| `TIEMPO_RESERVA_MS` | `src/modules/produccion/lotes.ts` | Se importa; ya no hay dos copias |

Escaneo por departamento: **no existe todavía en Producción** (su formulario solo escanea a todos o a un profesor). Se agrega allí y no en el panel; `crearTrabajoEscaneo` ya acepta una lista de profesores.

## 3. Verificaciones automáticas

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores |
| Pruebas de `src/modules/administracion` y `src/app/administracion` | Pasan, incluidas las 4 nuevas de `controlesEscaneo` y la de la constante |
| `src/components/pauta-visual.test.ts` | Falló en la primera versión del PR: un comentario de `page.tsx` llevaba `#279` y la prueba lo toma por un color hexadecimal. Corregido en esta revisión (`issue 279`). El PR tal como se abrió habría roto el CI |
| `npm test` completo (`--pool=vmThreads`) | 1739 de 1740. Falla `src/modules/produccion/conectores/http.test.ts` («un JSON inválido no se reintenta», tiempo agotado a los 5 s), que también falla en `main` sin estos cambios y no es de este PR |

## 4. Hallazgos de la revisión

| # | Hallazgo | Estado |
|---|---|---|
| 1 | El comentario con `#279` rompía la prueba de pauta visual | Corregido |
| 2 | La regla de qué botón mostrar estaba escrita dentro de la página y sin prueba | Corregido: pasó a `controlesEscaneo`, con prueba |
| 3 | «Reintentar» lleva a `/produccion/escaneo` al crear el reintento (así lo hace la acción de Producción). Quien lo use desde el panel sale de Administración | Aceptado: es el comportamiento de Producción y no se duplica; conviene que I6 lo confirme |
| 4 | En un escaneo completado, el contenedor vacío de los controles dejaba un espacio extra por el `gap` de la fila | Corregido: el contenedor solo se dibuja si hay un botón que mostrar |

## 5. Lo que NO se comprobó

- **La pantalla.** No se vio `/administracion/escaneo` en tema claro, oscuro ni celular, ni cómo queda la fila con el botón y su confirmación (`basis-full` debajo del texto).
- **Cancelar y reintentar con un escaneo real**, y que `admin` y `coordinación` los puedan usar.
- **Que un rol sin acceso no los vea**: la página ya exige `requireModulo("administracion")` y cada acción vuelve a exigir `ROLES_ESCANEO`, pero no se probó en vivo.
- **Estado del sistema con Storage y fuentes externas** (sigue abierto en #279).

## 6. Pendiente para integrar

- Revisión de otra persona, con I6 en copia.
- Ver la pantalla en claro, oscuro y celular, y probar un cancelar y un reintentar con cuentas de prueba.
