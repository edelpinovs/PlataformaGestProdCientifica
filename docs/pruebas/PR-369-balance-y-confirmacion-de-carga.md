# Revisión del PR #369: previsualiza el balance de una carga y la confirma en M3 (#24, RF-019)

Revisión del [PR #369](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/369) de `Grillo-de-Alambre` (I5, responsable del módulo Convocatorias), rama `feat/M5-RF-019-previsualizacion` → `main`. Lleva `Closes #24`. Es la parte final de RF-019 (CU-010): el **balance** de una carga en revisión (Promociones, Renovaciones, Nuevos ingresos, No aprobados), la **asignación a mano** de los renglones dudosos o sin coincidencia, y la **confirmación** de la carga, que crea en M3 los reconocimientos aprobados y guarda el resultado oficial de los participantes. Incluye una migración (`CriterioCruce` gana el valor `MANUAL`), cuatro decisiones nuevas (D-290 a D-293), arreglos que salieron de la revisión del #236 y una corrección del lector del PDF oficial del SNII.

| Campo | Valor |
|---|---|
| PR | #369 · issue #24 |
| Autor | @Grillo-de-Alambre |
| Commit revisado | `ad6e4ce` (la rama trae un `main` anterior; GitHub la marcaba `UNKNOWN`; con `main` actual hay un conflicto, ver hallazgo 6) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consultas a la base compartida **solo de lectura**. Sin sesión real ni pantallas en el navegador |
| Resultado | **Aprobable con comentarios.** La lógica está bien separada, probada y protegida; el riesgo está en que *Confirmar* escribe en la base compartida de forma irreversible con una vigencia del SNII que aún no confirma la Coordinación, y que nada de lo que escribe se ha probado contra la base |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/convocatorias/balance.ts` y `.test.ts` (nuevos) | Clasificación del balance con `clasificarDictamen` de RF-028 (mismo número que el reporte anual); un profesor repetido cuenta una vez |
| `src/modules/convocatorias/confirmacion.ts`, `cargar-confirmacion.ts` y `.test.ts` (nuevos) | `planearConfirmacion`: qué reconocimientos se crean y qué se omite, reutilizando las reglas de M3 (D-225, traslapes, vigencia PRODEP, tiempo completo) y `vigenciaSnii` (D-292) |
| `src/modules/convocatorias/revision-listado.ts` y `.test.ts` (nuevos) | Detalle paginado, con búsqueda, orden y filtros, armado en memoria |
| `src/app/convocatorias/revision/[id]/` | Página, `asignarProfesor`, `quitarAsignacion`, `confirmarCarga` (con segunda confirmación) y sus pruebas |
| `src/app/convocatorias/page.tsx`, `fila.tsx` | Enlace *Ver balance* y mensaje de carga confirmada |
| `src/modules/convocatorias/participantes.ts`, `cruce.ts` | El recálculo respeta *En reconsideración*; el criterio `MANUAL`; nota sobre el choque de nombres (revisión del #236) |
| `src/modules/convocatorias/lectura.ts` y `.test.ts` | Separa el apellido de una letra que llega pegado al CVU en el PDF oficial |
| `prisma/schema.prisma` y `migrations/20261126142529_criterio_manual` | `ALTER TYPE "CriterioCruce" ADD VALUE 'MANUAL'` |
| `docs/DECISIONES.md`, `README.md` del módulo | D-290 (valor `MANUAL`), D-291 (balance), D-292 (vigencia SNII), D-293 (reglas de la confirmación), todas `pendiente` |

Veintitrés archivos, +1463 / −5 líneas. Toca `prisma/schema.prisma` (se acuerda antes) y avisa de ello en la descripción; no toca `src/lib/` ni `src/components/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 135 archivos, **1619 pruebas** (coincide con la descripción) |
| `npm run lint`, `npm run typecheck` y `npx prisma validate` | Correctos |
| CI de GitHub (`verificar`, incluye `build`) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Un conflicto, solo en `src/modules/convocatorias/README.md` (el resto se mezcla solo); `DECISIONES.md` no choca: D-290 sigue a D-289 |
| Pantallas en el navegador | **No las vi.** La autora las probó el 2026-11-23 y el 2026-11-26 con cargas ficticias |

## 3. Lo que se leyó y está bien

- **Permisos:** la página y las tres Server Actions empiezan con `requireModulo("convocatorias")`.
- **Entradas validadas:** los identificadores pasan por una función que acepta solo enteros positivos de 32 bits; los mensajes están en español y hay 404 para un `id` inválido.
- **Las condiciones van dentro del `UPDATE`:** *Asignar*, *Quitar* y *Confirmar* usan `updateMany` con el estado y el criterio en el `where`, así que un doble clic o una carrera entre dos personas no aplica el cambio dos veces. *Asignar* revalida en el servidor que el profesor esté activo y que no esté ya en otro renglón de la carga.
- **Confirmar es atómico:** carga, reconocimientos de SNII y PRODEP y recálculo de participantes van en una sola transacción de 30 s; si algo falla no cambia nada. Se rechaza una segunda carga confirmada de la misma convocatoria y la confirmación con dudosos sin resolver.
- **Lo dudoso no se adivina:** lo que una regla rechaza (traslape, Candidato con renovación, Emérito, no tiempo completo, fin de vigencia distinto) se omite y se muestra **antes** de confirmar con su motivo; tiene segunda confirmación que avisa que no se puede deshacer.
- **Reutiliza reglas de M3** en vez de reescribirlas (`hayTraslape`, `calcularVigenciaProdep`, `hayTraslapeProdep`, `validarContratacionProdep`) y `clasificarDictamen`, para que el balance coincida con el reporte anual.
- **La migración es compatible con `main` (D-275):** solo agrega un valor de enum que ninguna fila usa.
- **Decisiones honestas:** D-290 a D-293 quedan `pendiente`, con su origen, y la descripción dice qué cambia si alguna se resuelve distinto.

## 4. Pruebas de revisión (solo lectura)

Consulta a la base compartida, sin imprimir datos de personas:

| Qué se comprueba | Resultado |
|---|---|
| Valores de `CriterioCruce` en la base | `CVU, CODIGO, NOMBRE, AMBIGUO, SIN_COINCIDENCIA`: **`MANUAL` no está aplicado**, como dice la descripción |
| Última migración aplicada | `20261125150000_estado_job_cancelado`: la base no va por delante de `main` |
| Cargas de resultados y renglones en la base | **Ninguno**: la prueba de la autora quedó limpia; no hay cargas que afectar |
| Consecuencia | Hasta aplicar la migración, *Asignar* (que escribe `MANUAL`) falla; la página y el balance leen sin tocar ese valor |

## 5. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Alta | **Confirmar escribe en la base compartida, sin deshacer, con una vigencia que aún no está confirmada.** Cuando el listado del SNII no trae vigencia (lo habitual), `vigenciaSnii` la inventa con la opción (a) de D-224: del 1 de enero del año siguiente al 31 de diciembre, 4 o 5 años. D-292 dice que falta que la Coordinación lo confirme. Si resulta distinta, hay que corregir a mano cada reconocimiento creado, porque la pantalla no tiene forma de deshacer la confirmación. Conviene no activar *Confirmar* (o dejarlo bloqueado) hasta cerrar D-224/D-292, o añadir antes una forma de revertir una carga confirmada |
| 2 | Media | **Lo que escribe *Confirmar*, *Asignar* y *Quitar* no se probó contra la base** (la descripción lo reconoce). La confirmación es la operación de mayor alcance del módulo. Antes de usarla con datos reales conviene ensayarla con una convocatoria de demostración (`npm run db:demo`) y comprobar en M3 los reconocimientos creados, los participantes y el balance |
| 3 | Media | **Antes de aplicar la migración, *Asignar* lanza una excepción** de Prisma («invalid input value for enum») en lugar de un mensaje en español, y la persona ve la pantalla de error de Next. La regla del equipo pide errores legibles. Es transitorio (hasta `npm run db:migrar`), pero conviene capturarlo o aplicar la migración en cuanto se integre (D-275 lo permite) y avisar en el chat |
| 4 | Media | **D-290 a D-293 quedan `pendiente`** y el código ya las aplica. Hace falta que I1 las confirme antes de integrar, sobre todo D-292 (vigencia del SNII) y D-293 (reglas de la confirmación), porque cambian lo que se escribe en M3. D-290 además cambia el esquema compartido |
| 5 | Menor | **«Una sola carga confirmada por convocatoria» solo se comprueba en la aplicación.** `CargaResultados` no tiene un índice único parcial; la lectura de «otra confirmada» y la de traslapes ocurren dentro de la transacción pero sin serializarse, así que dos coordinadores confirmando cargas distintas de la misma convocatoria al mismo tiempo podrían pasar ambos. Es poco probable, pero la regla se puede respaldar con un índice único parcial (`estado = 'CONFIRMADA'`), como pide `AGENTS.md` para la unicidad |
| 6 | Menor | **Conflicto con `main` en `src/modules/convocatorias/README.md`**, y puede chocar también con el #368 en `lectura.ts` y `lectura.test.ts`. La autora ya lo avisa; hay que actualizar la rama antes de integrar y resolverlo con quien integre segundo |
| 7 | Menor | **El PR es grande y mezcla temas** (RF-019 completo, los puntos de la revisión del #236 y una corrección del lector del PDF del SNII): 23 archivos y +1463 líneas, con una migración y una acción irreversible. Dificulta que otra persona lo revise con cuidado; la corrección del lector y los arreglos del #236 podían ir aparte |
| 8 | Menor | La página carga **todos** los renglones de la carga y los clasifica en memoria en cada visita. La autora lo justifica en D-291 y filtra a los renglones con profesor o dudosos al confirmar; con el listado nacional del SNII (11 523 renglones) conviene medirlo en la vista previa de Vercel |
| 9 | Fuera del PR | El hallazgo que la autora reporta sobre `<BarraListado>` (un `<ul>` dentro del `<p>` de `<Aviso>`, con error de hidratación y aviso vacío para lectores de pantalla) afecta a todos los listados y es pieza compartida: conviene abrir un issue aparte |

## 6. Dictamen

**Aprobable con comentarios.** No debería integrarse todavía: antes hace falta que otra persona lo apruebe, que I1 confirme D-290 a D-293 y que se resuelva qué pasa con la vigencia del SNII (hallazgo 1). Al integrar: actualizar la rama (hallazgo 6), aplicar `npm run db:migrar` justo después y avisar en el chat (`git pull` y `npx prisma generate`). Recomiendo ensayar la confirmación con datos de demostración antes de usarla con la carga real.
