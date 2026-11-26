# Revisión del PR #316: regla de continuidad única e historial con nombre del profesor (#189)

Revisión del [PR #316](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/316) de `irybyron` (responsable del módulo Producción), rama `feat/M6-RF-020-pendientes-189` → `main`. Lleva `Closes #189` («Producción: menores pendientes de los PR #172 a #174»).

| Campo | Valor |
|---|---|
| PR | #316 · issue #189 |
| Autor | @irybyron |
| Commit revisado | `fd6c6e8` (mezcla de `main` sobre el commit de trabajo `31cc0a3`) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma generado. SQL probado contra la base compartida **solo con `SELECT`**. Sin `next dev` y sin navegador |
| Resultado | **Aprobable con comentarios.** Los puntos 2 y 3 están bien hechos y verificados contra datos reales; los tres puntos descartados del issue merecen un issue propio antes de cerrarlo |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/continuidad.ts` (nuevo) | Regla del año de la próxima consulta (`anioDesdeContinuidad`: sin corte, historial completo salvo Scopus; con corte, un año de solapamiento, sin pasar del año en curso ni bajar de 1900), su texto y sus equivalentes en SQL; `etiquetaSql` y `literalSql` |
| `src/modules/produccion/escaneo.ts` | El motor llama a `anioDesdeContinuidad` en lugar de la fórmula escrita en línea |
| `src/modules/produccion/historial.ts` | Etiquetas de estado, tipo y fuente del SQL a partir de `ESTADOS_HISTORIAL`, `TIPOS_HISTORIAL` y `NOMBRES_FUENTE`; `nombreProfesor` y `nombreProfesorSql`; el alcance con un solo profesor muestra su nombre |
| `src/app/produccion/historial/page.tsx` | «Siguiente profesor pendiente» con el nombre |
| `src/app/produccion/continuidad/page.tsx` | El filtro de fuente usa `NOMBRES_FUENTE` |
| `src/app/produccion/historial.navegador.mjs` | El simulador de pruebas en navegador agrega `Prisma.raw` |
| Pruebas | `continuidad.test.ts` (nuevo) e `historial.test.ts` |

Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`. Los cambios quedan dentro del módulo de la autora.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 122 archivos, **1424 pruebas** |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | Sin conflictos (`MERGEABLE`) |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **La regla vive en un solo sitio.** Motor, texto de la pantalla y SQL de búsqueda y orden salen de las mismas constantes (`SOLAPAMIENTO_ANIOS`, `ANIO_MINIMO_CONTINUIDAD`, `FUENTES_SIN_HISTORIAL_INICIAL`). Añadir otra fuente sin historial inicial es un cambio de una línea.
- **Las etiquetas del SQL salen de los mapas del código.** `etiquetaSql` genera un `CASE` por etiqueta; `literalSql` duplica las comillas, y solo recibe constantes del código, nunca datos de personas.
- **El historial muestra el nombre sin romperse** si el profesor ya no existe: conserva «Profesor #n». El identificador se convierte a entero solo si cumple `^\d{1,9}$`, así que un valor raro del JSON no hace fallar la consulta.
- **Nada llega sin protección:** las páginas siguen empezando con `requireModulo("produccion")`; no hay Server Actions nuevas.
- **Pruebas con datos ficticios** (`Ficticia, Persona · DEMO-107`).
- **Cambio de comportamiento menor y razonable:** el motor ya no usaba el año en curso como tope del año de partida; ahora un corte en el futuro no consulta años que aún no existen. Para cortes normales el resultado es idéntico.

## 4. Pruebas de revisión (solo `SELECT`, sin imprimir nombres)

Script temporal que ejecuta `sqlContinuidad` y `sqlHistorial` contra la base compartida (se borró después):

| Qué comprueba | Resultado |
|---|---|
| Puntos de continuación: periodo calculado en SQL contra `periodoProximaConsulta` de TypeScript, en todas las filas | **860 de 860 coinciden**, 0 diferencias |
| Continuidad: búsqueda «2026» con cada orden (`profesor`, `fuente`, `corte`, `periodo`) | Responde en los cuatro |
| Historial: total y filas de la primera página | 26 registros; ninguno muestra «Profesor #» |
| Historial: textos de estado y tipo | «Completado», «Con incidencias», «Manual», «Programado (histórico)» |
| Historial: búsqueda «profesor» con cada una de las siete columnas de orden | Responde en las siete |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (antes de cerrar el issue) | `Closes #189` cierra el issue aunque **tres de sus cinco puntos se descartan** (un solo ayudante de pruebas de Chrome, el orden en tablet y el texto de «Sentido»). El motivo es que tocan `src/components/`; pero el propio issue ya preveía eso («se avisa al equipo») y lo trata como parte del trabajo, no como razón para no hacerlo. Al cerrarse, los tres se pierden | Mantener `Closes #189` solo si el equipo acepta el descarte; si no, abrir un issue aparte para los puntos 1, 4 y 5 (con aviso al equipo) antes de integrar, o cambiar a `Refs #189` |
| 2 | Menor | `continuidad.ts` mezcla la regla del motor con constructores de SQL de Prisma, así que `escaneo.ts` (descrito como «lógica de dominio pura») ahora importa `@/generated/prisma/client` de forma indirecta | Separar los equivalentes SQL en otro archivo (por ejemplo `continuidad-sql.ts`) y dejar `continuidad.ts` sin dependencias. No bloquea |
| 3 | Menor | Las pruebas de SQL comprueban fragmentos del texto (`toContain`), no que la consulta se ejecute. Lo que sí garantiza que funciona es la prueba de la sección 4, que no queda en el repositorio | Aceptable por ahora; si se agregan pruebas contra base, incluir esta comparación SQL contra TypeScript |
| 4 | Observación | La casilla «Revisar `/produccion/historial` con sesión real» sigue sin marcar. Las capturas de Chrome usan el simulador con datos ficticios (`historial.navegador.mjs`) | Revisarlo con una sesión real, en claro, oscuro y celular, antes de integrar |
| 5 | Observación | El issue pide como «Terminado cuando» el resultado de `npm run build`; la descripción no lo menciona (el CI sí lo corre y pasa) | Anotarlo en la descripción |
| 6 | Observación | La expresión del año se repite tres veces dentro del SQL del periodo | Irrelevante con 860 filas; revisar si crece |
| 7 | Observación | El historial ahora busca también por el nombre del profesor (va en el alcance) | Es lo esperado: lo ven solo quienes tienen acceso a Producción |

## 6. Lo que no se probó

- La pantalla en el navegador con sesión real (claro, oscuro y celular).
- Un historial con un registro cuyo profesor fue eliminado (el SQL lo cubre con `COALESCE`, pero no hay un caso así en la base).
- `npm run build` en local.

## 7. Dictamen

**Aprobable con comentarios.** El código es correcto y está verificado con datos reales. Antes de integrar: decidir qué pasa con los puntos 1, 4 y 5 del issue (hallazgo 1) y revisar la pantalla con sesión real (hallazgo 4). Falta la aprobación de otra persona del equipo (D-006).
