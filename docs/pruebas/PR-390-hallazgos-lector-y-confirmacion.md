# Revisión del PR #390: atiende los hallazgos de las revisiones del #368, #369 y #370 (RF-017, RF-019)

Revisión del [PR #390](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/390) de `Grillo-de-Alambre` (I5, responsable de Convocatorias), rama `fix/M5-RF-019-hallazgos-revision` → `main`. `Refs #355` y `Refs #24`. Atiende en M5 lo que dejaron abierto las revisiones de los PR ya integrados #368, #369 y #370: tres ajustes del lector de listados, el bloqueo de *Confirmar* para un SNII sin vigencia mientras D-292 no esté confirmada, y el contenedor HTML de dos avisos. Sin migración.

| Campo | Valor |
|---|---|
| PR | #390 · issues #355 y #24 (`Refs`) |
| Autor | @Grillo-de-Alambre |
| Commit revisado | `dd843e4` (la fusión con el `main` actual no tiene conflictos) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. No se tocó la base. Sin pantallas en el navegador ni los `.xlsx` reales |
| Resultado | **Aprobable con comentarios.** Atiende bien los hallazgos señalados, sin salirse del módulo; los comentarios son menores |

Esta revisión la hace un agente que trabaja para I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/convocatorias/lectura.ts` y `.test.ts` | La vigencia cuenta como dato de persona si el archivo trae columnas de CVU, código o nivel (hallazgo 6 del #368); las filas de totales no son personas (1); el `RESULTADO` solo reemplaza al nivel anterior, no a un `NIVEL OTORGADO` explícito (2) |
| `src/modules/convocatorias/confirmacion.ts` y `.test.ts` | `VIGENCIA_SNII_CONFIRMADA = false`: un SNII sin vigencia en el archivo se omite con motivo (D-292) en lugar de inventar la vigencia (hallazgo 1 del #369) |
| `src/app/convocatorias/revision/[id]/page.tsx`, `actions.test.ts` | El texto del panel de confirmación cambia según la bandera |
| `src/app/convocatorias/fila.tsx`, `revision/[id]/fila-revision.tsx` | `<Aviso>` dentro de `<div>` en lugar de `<span>` (hallazgo 3 del #370) |
| `src/modules/convocatorias/README.md` | Documenta las tres reglas del lector y la bandera |

Nueve archivos, +104 / −26. Todo dentro de M5; no toca `src/lib/`, `src/components/` ni `prisma/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 139 archivos, **1720 pruebas** (coincide con la descripción) |
| `npm run lint` y `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`, incluye `build`) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Sin conflictos |
| Sonda del lector (archivo temporal, ya eliminado) | «TOTAL SNII» y «Totales» no se leen como personas; un `NIVEL OTORGADO` «I» con `Resultado` «Aprobado» se queda en nivel I; un Perfil con solo nombre y fechas se lee y una línea suelta de dirección se descarta |
| Con los `.xlsx` reales (el Perfil Deseable debería leer 128 renglones) | **No se pudo:** `datos-reales/` no está en esta máquina; la autora tampoco lo tiene |
| Pantalla en el navegador | **No la vi** |

## 3. Lo que se leyó y está bien

- **Bloqueo de la acción irreversible:** el SNII sin vigencia ya no se escribe en M3 con una regla sin confirmar. Se omite, aparece en la tabla de omitidos con el motivo (D-292) y se puede registrar a mano. El SNII con vigencia en el archivo, PRODEP, el estado y los participantes siguen igual. Emérito sigue omitido con su propio motivo.
- **Un solo interruptor, fácil de activar:** la constante `VIGENCIA_SNII_CONFIRMADA` tiene el motivo documentado y el parámetro opcional de `planearConfirmacion` permite probar las dos ramas; las pruebas de la regla siguen cubriendo el valor activado.
- **Texto honesto en el panel:** dice qué pasa con el SNII sin vigencia según la bandera.
- **Lector sin efectos colaterales:** un listado sin columnas de persona sigue sin filtrarse; solo cuenta la vigencia cuando ya hay CVU, código o nivel. Las pruebas nuevas del lector fallaban antes del cambio.
- **HTML válido:** `<Aviso>` ya no queda dentro de un `<span>`.
- **Alcance disciplinado:** deja fuera, y lo dice, el índice único parcial (cambia el esquema) y el rendimiento con 11 523 renglones.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **El balance no refleja el bloqueo.** La previsualización cuenta como aprobado a quien *Confirmar* va a omitir por falta de vigencia, así que el balance y lo que realmente se crea en M3 pueden diferir. El panel ya lo explica con el texto nuevo; conviene decirlo también junto al balance o contar aparte «sin vigencia, a registrar a mano» |
| 2 | Menor | **Mismo caso con la carga oficial del SNII:** el listado nacional no trae vigencia, así que mientras D-292 siga pendiente *Confirmar* omitirá a todos sus aprobados. Es el comportamiento buscado, pero conviene que la Coordinación confirme D-292 antes de la carga real o que el equipo sepa que habrá que registrarlos a mano |
| 3 | Menor | **La bandera es una constante de código:** activarla requiere un PR. Está bien por ser una regla de negocio; solo conviene anotar en D-292 (o en el issue #24) que al confirmarla se cambia `VIGENCIA_SNII_CONFIRMADA` |
| 4 | Menor | **`esTotal` descarta cualquier apellido o nombre que empiece con «total»** (`^total\b`). No hay apellidos así en la práctica, pero el descarte es silencioso; un aviso por renglón descartado lo haría visible |
| 5 | Informativo | Sin probar con los `.xlsx` reales (el Perfil Deseable debería leer 128 renglones) ni en pantalla. Quien tenga `datos-reales/pgpc-2027/` puede repetir la prueba de solo lectura del registro del #368 |

## 5. Dictamen

**Aprobable con comentarios.** Sin hallazgos que bloqueen. Falta la aprobación de otra persona (D-006). Antes de integrar, quien tenga los archivos reales conviene que compruebe las 128 filas del Perfil Deseable. No requiere aplicar migración.
