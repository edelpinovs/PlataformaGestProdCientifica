# Revisión del PR #423: catálogos de áreas y subáreas (#264)

Revisión del [PR #423](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/423) de `edelpinovs` (I1), rama `feat/M1-264-catalogo-areas` → `main`. Agrega dos catálogos a Catálogos (M1): **Áreas** y **Subáreas** (cada subárea pertenece a un área), con alta en modal, edición y eliminación por fila, listado paginado con búsqueda y orden, y borrado con constancia en la bitácora. Por acuerdo del chat no se enlazan todavía a otra entidad ni lleva carga inicial; el PR usa `Refs #264`, no `Closes`.

| Campo | Valor |
|---|---|
| PR | #423 · issue #264 (`Refs`; el issue sigue abierto) |
| Autor | @edelpinovs (I1), con Claude Code |
| Commit revisado | `062db2a` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1); es el mismo agente que escribió el cambio, así que esta revisión **no es independiente** |
| Entorno | Local (Windows 10, Node 24): `npm test` en la rama del PR; `prisma validate` y comparación de la migración en una carpeta aparte (`git worktree`). Sin base real, sin sesión y sin pantallas |
| Resultado | **Aprobable con comentarios.** Cumple lo acordado y la migración es aditiva; falta la revisión visual, la aprobación de otra persona y aplicar la migración tras integrar |

Esta revisión no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `migrations/20261127040000_areas_subareas` | Modelos `Area` (nombre único) y `Subarea` (nombre, `areaId`, único por área y nombre), llave foránea `RESTRICT` y RLS |
| `src/modules/catalogos/areas.ts`, `subareas.ts` | Esquemas Zod y reglas puras: duplicados sin distinguir mayúsculas ni acentos, área inexistente, motivo de no eliminar |
| `src/modules/catalogos/areas-listado.ts`, `subareas-listado.ts` | Búsqueda, orden por lista permitida y filtro por área (D-009) |
| `src/app/catalogos/areas/`, `subareas/` | Página, alta en `ModalAlta`, y tres Server Actions por catálogo (`registrar`, `editar`, `eliminar`) |
| `src/app/catalogos/page.tsx` | Dos entradas nuevas con su total |
| Pruebas | Reglas, listados, acciones de cada catálogo y la prueba de borrados con bitácora |

Veinte archivos, +1042 / −2. Toca `prisma/schema.prisma`, acordado por I1 en el chat; no toca `src/lib/` ni `src/components/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` en la rama (mismo commit) | Correcto: 150 archivos, **1846 pruebas** |
| `npm run lint`, `npm run typecheck`, `npx prisma validate` | Correctos |
| Migración escrita a mano contra la que genera Prisma (`migrate diff --from-empty`) | **Mismas tablas, índices y llave foránea**; solo se agrega el RLS que exige el equipo |
| Fusión con `main` | Sin conflictos |
| CI de GitHub (`verificar`, incluye `build`) | **Pendiente al cerrar esta revisión**; Vercel en verde. Confirmar que termine en verde antes de integrar |
| Pantallas en navegador y migración contra la base | **No los probé** |

## 3. Lo que se leyó y está bien

- **Permisos (RNF-005):** las tres páginas nuevas y las seis acciones empiezan con `requireModulo("catalogos")`; una prueba por catálogo comprueba que, sin permiso, no se lee ni se escribe nada.
- **Validación y mensajes:** Zod con mensajes propios en español; un área ausente, `NaN` o negativa responde «Elige el área a la que pertenece.»; un envío sin campos responde «El nombre es obligatorio.». Ningún texto de Zod ni de Prisma llega a la pantalla.
- **Unicidad:** se comprueba en la regla pura y se respalda con `@unique` y `@@unique`; `P2002` y `P2003` se capturan con mensajes propios, y al editar el registro no choca consigo mismo.
- **Borrados:** el área lleva la condición dentro del `DELETE` (`subareas: { none: {} }`) y captura `P2003`; si alguien agrega una subárea justo antes, el mensaje explica cuántas hay. Ambos borrados escriben la bitácora en la misma transacción, con id y nombre del catálogo (sin datos personales), y no dejan registro si no se borró nada.
- **Migración:** solo agrega tablas (compatible con `main`, D-275) y la descripción del PR dice con claridad «aplicada: NO». Se escribió a mano porque el script compara contra la base compartida, que ya tiene la tabla del PR #414.
- **Listados (D-009):** diez por página, búsqueda que cubre lo que se muestra (nombre y área), orden por lista permitida con desempate por `id`, filtro por área validado contra las áreas existentes.
- **Forma:** `FilaEditable` y `ModalAlta` de las piezas compartidas, colores por nombre y textos en español; la prueba de pauta visual pasa.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **El nombre rechaza números y símbolos** (`nombreCatalogo`: solo letras, espacios, puntos, comas y guiones). Si el listado del cliente trae nombres como «Ingeniería 4.0», «Física/Matemáticas» o con paréntesis, no se podrán capturar. Conviene confirmar el formato con el cliente antes de la carga y, si hace falta, usar otra regla de nombre solo para estos catálogos |
| 2 | Media | **La migración falta por aplicar.** Hasta aplicarla, `/catalogos`, `/catalogos/areas` y `/catalogos/subareas` fallan en cualquier copia que use el código nuevo y la base sin las tablas. Es compatible con `main`: se aplica **después de integrar** (`git pull`, `npm run db:migrar`) y se avisa en el chat `git pull` y `npx prisma generate`; la descripción del PR debe quedar en «aplicada: SÍ» al hacerlo |
| 3 | Menor | **Sin revisión visual** en tema claro, oscuro y celular (el issue la exige antes de cerrar), ni `npm run build` local |
| 4 | Menor | **Una subárea siempre se puede eliminar** porque nada la usa todavía. Cuando se decida el enlace (hoy `CuerpoAcademico.areaProdep` es texto libre), `eliminarSubarea` y el borrado en cascada del área deberán revisar su uso |
| 5 | Menor | **Sin carga inicial ni enlace:** el issue sigue abierto a propósito. Falta el listado del cliente y decidir qué pasa con los valores de `areaProdep` ya guardados |
| 6 | Menor | **No es una revisión independiente:** el mismo agente escribió y revisó el cambio; otra persona debe aprobarlo (D-006) |

## 5. Dictamen

**Aprobable con comentarios.** Quien lo apruebe debe ver las dos pantallas en claro, oscuro y celular (alta, edición, eliminar un área con subáreas, filtro por área), esperar el CI en verde y, al integrar, aplicar la migración y avisar al equipo. El hallazgo 1 conviene resolverlo antes de que llegue el listado del cliente.
