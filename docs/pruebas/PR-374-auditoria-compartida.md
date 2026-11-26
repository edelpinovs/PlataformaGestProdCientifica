# Revisión del PR #374: función compartida de bitácora y acciones de otros módulos (#277, RF-241)

Revisión del [PR #374](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/374) de `edelpinovs` (I1), rama `feat/M8-277-auditoria-compartida` → `main`. Es el primer PR de #277 (`Refs #277`, no lo cierra): deja la pieza compartida `registrarAuditoria` para que cada módulo registre sus acciones en su propio PR. No lleva migración ni cambia `schema.prisma`.

| Campo | Valor |
|---|---|
| PR | #374 · issue #277 (`Refs`) |
| Autor | @edelpinovs (I1) |
| Commit revisado | `f4aec25` (sobre el `main` actual, sin conflictos) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. No se tocó la base compartida. Sin pantallas en el navegador |
| Resultado | **Aprobable con comentarios.** Cambio pequeño, probado y sin cambio de comportamiento; los comentarios son menores. Como lo escribe I1, necesita la aprobación de otra persona (D-006) |

Esta revisión la hace un agente que trabaja para I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/lib/auditoria.ts` y `.test.ts` (nuevos) | `registrarAuditoria(cliente, evento)`: devuelve la operación pendiente de `auditoria.create` para pasarla a `$transaction([...])` o esperarla dentro de una transacción interactiva |
| `src/modules/administracion/auditoria.ts` y `.test.ts` | Tres acciones nuevas (`validacion.dictaminada`, `carga.confirmada`, `registro.eliminado`); módulo opcional en `eventoAuditoria`; tres resúmenes con solo identificadores y conteos; el filtro «Módulo» sale de `MODULOS` |
| `src/app/administracion/usuarios/actions.ts`, `exportar/route.ts` | Usan la función compartida; mismo comportamiento |
| `docs/DECISIONES.md` | D-294 (`pendiente` hasta el visto bueno de los dueños) |

Siete archivos, +102 / −12. Toca `src/lib/` (pieza compartida): lo avisa en la descripción, y el autor es quien coordina el acuerdo.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 137 archivos, **1660 pruebas, todas en verde**. La descripción reporta 1 falla (`http.test.ts`, tiempo agotado) con `--pool=vmThreads`; con la configuración normal no se reprodujo, es una prueba inestable ajena al PR |
| `npm run lint`, `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`, incluye `build`) y vista previa de Vercel | Correctos |
| Sonda de tipos (archivo temporal, ya eliminado) | `registrarAuditoria(tx, …)` dentro de `prisma.$transaction(async (tx) => …)` y `$transaction([registrarAuditoria(prisma, …)])` compilan: el tipo genérico `R` sirve para las dos formas |
| Pantalla en el navegador | **No la vi.** El PR tampoco |

## 3. Lo que se leyó y está bien

- **Misma garantía que antes:** el cambio y su constancia siguen yendo juntos en `$transaction`; la exportación sigue sin entregar el archivo si no se pudo registrar (responde 500 con su mensaje propio).
- **Pieza mínima y tipada:** no depende de Prisma directamente (solo de la forma `{ auditoria: { create } }`), así que es fácil de probar y la usan igual el cliente y la transacción.
- **Sin datos personales en los resúmenes nuevos:** solo identificadores y conteos; D-294 lo dice y lo prueban los textos.
- **Sin migración ni cambio de esquema:** no hay riesgo con la base compartida (D-275).
- **Las acciones existentes no cambian:** las pruebas de `auditoria.test.ts` de `administracion` siguen igual salvo la excepción de `registro.eliminado`, que es la que no lleva módulo fijo.
- **Los módulos de las acciones nuevas existen** en `registry.ts` (`validacion`, `convocatorias`).

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **`modulo` en `eventoAuditoria` es un `string` libre.** Quien registre un borrado puede escribir `"profesore"` y nadie lo detecta: el registro queda con un módulo que no está en el filtro. Conviene tiparlo como el `slug` de un módulo (o validarlo contra `MODULOS`) y probarlo |
| 2 | Menor | **El módulo `"sistema"` (valor por omisión) no existe en `MODULOS_AUDITORIA`**: la pantalla de la bitácora lo mostraría con la clave cruda («sistema») y no se puede filtrar. Hoy ningún borrado cae ahí porque nadie lo usa todavía, pero cuando los dueños empiecen a registrar conviene exigir el módulo en `registro.eliminado` (en vez de un valor por omisión silencioso) o agregar «Sistema» al filtro |
| 3 | Menor | **El filtro «Módulo» pasa de 1 opción a 9** (todos los módulos), aunque solo `administracion`, `validacion` y `convocatorias` tendrán eventos por ahora. No es un error; solo habrá opciones que devuelven «sin resultados» hasta que cada dueño registre algo. No lo vi en pantalla |
| 4 | Informativo | **Falta el visto bueno de los dueños de los módulos** (D-294 `pendiente`) y la aprobación de otra persona, por ser un cambio en `src/lib/` de I1. Hasta entonces los demás módulos no deberían usarla |
| 5 | Informativo | La descripción habla de una falla de `http.test.ts` que también se da en `main`; en esta revisión pasó. Si vuelve a salir conviene abrir un issue aparte para esa prueba |

## 5. Dictamen

**Aprobable con comentarios.** Sin hallazgos que bloqueen. Antes de integrar: que otra persona lo apruebe. Los hallazgos 1 y 2 conviene resolverlos en este PR o anotarlos en #277 para el siguiente, porque evitan registros sin módulo cuando los demás empiecen a usar `registro.eliminado`. No requiere aplicar migración. Al integrar, D-294 sigue `pendiente` hasta que los dueños den su visto bueno.
