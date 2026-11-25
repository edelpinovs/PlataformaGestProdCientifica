# Revisión del PR #333: estatus laboral en tres valores y goce de sueldo (#254, #255)

Revisión del [PR #333](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/333) de `dpfuentes92` (I2), que cierra [#254](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/254) y [#255](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/255).

| Campo | Valor |
|---|---|
| PR | #333 (`Closes #254`, `Closes #255`) |
| Autor | @dpfuentes92 (I2) |
| Rama | `feat/M2-estatus-goce-sueldo` → `main` |
| Commit revisado | `d388b43` (ya contiene `main` en `ee85f36`) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con el cliente de Prisma regenerado. Base compartida consultada solo con `prisma migrate status` (lectura). Sin `next dev` |
| Resultado | **Aprobable con comentarios, e integrarlo pronto.** El código funciona y las pruebas pasan. El problema es que la migración ya se aplicó en la base compartida y `main` todavía no la tiene (hallazgo 1). Hay además cambios fuera del módulo sin acuerdo registrado (hallazgo 2) y una regla de Calidad que ya nunca se activa (hallazgo 3) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `migrations/20261125141037_estatus_goce_sueldo` | `EstatusLaboral` queda en `ACTIVO`, `LICENCIA` y `ESTANCIA_POSDOCTORAL`. Los registros existentes se convierten así: `BAJA_TEMPORAL` y `TRASLADADO` pasan a `LICENCIA`, y `BAJA_POSDOCTORAL` a `ESTANCIA_POSDOCTORAL`. Columna nueva `goceDeSueldo` (falso por omisión) |
| `src/modules/profesores/profesores.ts` | `ESTATUS_CON_GOCE`, `admiteGoceDeSueldo` y `cuentaEnPlantilla`. Filtro de Prisma `FILTRO_CUENTA_EN_PLANILLA`. `registrarProfesor` lee la casilla y la apaga en Activo |
| `src/app/profesores/` | Casilla «Con goce de sueldo» en el alta (`campos-profesor.tsx` pasa a ser de cliente) y en Editar. El listado muestra «Con goce de sueldo» bajo el estatus |
| `src/components/fila-editable.tsx` | Campo nuevo `tipo: "casilla"`, que se habilita según el valor de otro campo (`habilitadaPor`). Si la fila tiene una casilla, sus selectores pasan a ser controlados |
| `src/lib/inicio.ts` | El total de profesores del inicio cuenta solo a quien está en la plantilla: activos, y en licencia o estancia con goce de sueldo |
| `src/modules/administracion/calidad.ts` | `ESTATUS_DE_BAJA` queda vacío |
| Datos de demostración y pruebas | Se actualizan a los tres valores |
| `docs/DECISIONES.md` | D-273 y D-274 |

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 124 archivos, 1467 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `prisma migrate status` contra la base compartida | «Database schema is up to date» con las migraciones del PR: la migración **ya está aplicada**, y `main` no la tiene |

## 3. Lo que se leyó y está bien

- **La migración conserva a las personas.** Convierte los valores con `USING (CASE …)` dentro de una transacción y no borra filas. Sigue el flujo de `db:nueva-migracion`.
- **El servidor manda sobre la casilla.** Una casilla deshabilitada no se envía, y Zod la apaga en Activo aunque llegue manipulada con `si`. Hay prueba de las dos cosas, y también de que se rechazan los estatus que ya no existen.
- **`cuentaEnPlantilla` está probada en sus cinco combinaciones.**
- **Las etiquetas en español no se pierden.** La búsqueda por etiqueta («estancia») y la exportación muestran «Estancia posdoctoral», con prueba.
- **Los filtros siguen igual.** «Activos» e «Inactivos» del listado (D-233) y la regla de D-272 (a quien no está activo no se le escanea) siguen comparando con `ACTIVO`, así que no hubo que tocarlos.

## 4. Hallazgos

### Hallazgo 1 (alto): la base compartida va por delante de `main`

La migración se aplicó antes de integrar el PR. `main`, producción, las vistas previas de los otros PR y la copia local de cada integrante usan el cliente de Prisma anterior, que no conoce `ESTANCIA_POSDOCTORAL`.

- **Leer** un profesor con `ESTANCIA_POSDOCTORAL` hace fallar la página. Es lo que reportó @irybyron en el PR: `/produccion/publicaciones` daba «This page couldn't load». Las filas que antes eran `BAJA_TEMPORAL` o `TRASLADADO` sí se leen, porque `LICENCIA` ya existía.
- **Guardar** un profesor con un estatus que ya no existe falla en la base.
- **Afecta a los demás.** Quien cree una migración nueva encontrará en la base una migración que no está en su carpeta.
- **No lo comprobé en producción**, que pide sesión. Me baso en el reporte de @irybyron y en `migrate status`.

**Qué hacer:**

- Integrar el PR en cuanto lo apruebe otra persona.
- Avisar al equipo que hagan `git pull` y `npx prisma generate`.
- Registrar como `pendiente` la propuesta de @irybyron: aplicar las migraciones al integrar el PR, no antes. Es el mismo riesgo que se anotó en el #309.

### Hallazgo 2 (medio): cambios compartidos sin acuerdo registrado y D-246 sin cerrar

El PR toca `prisma/schema.prisma`, `src/lib/inicio.ts` y `src/components/fila-editable.tsx`. AGENTS.md pide acordar esos cambios antes en el chat del equipo, y los issues pedían avisar a I1. D-273 y D-274 dicen «Acuerdo de I2», es decir, solo del autor.

Además, D-246 (la misma duda de #254) sigue como `pendiente`. El comentario nuevo de `calidad.ts` también dice «D-246 está pendiente».

**Qué hacer:**

- Que D-273 diga «resuelve D-246» y que D-246 se actualice.
- Registrar en D-273 y D-274 quién más lo acordó. Esta revisión sirve como el aviso a I1, pero falta la aprobación del cambio a la pieza compartida `FilaEditable`.

### Hallazgo 3 (medio): la regla «Integrante de baja o trasladado» de Calidad ya no se activa nunca

Con `ESTATUS_DE_BAJA` vacío:

- la regla `INTEGRANTE_DE_BAJA` sigue en `REGLAS_CALIDAD`, así que aparece en el filtro de Calidad de datos, pero nunca da un hallazgo;
- `etiquetaEstatus` queda como código muerto, porque traduce valores que ya no existen.

**Qué hacer:** retirar la regla y su etiqueta, o redefinirla. Por ejemplo, «integrante en licencia sin goce», si el equipo lo pide. Es del módulo de I1: puede ir en este PR o en uno aparte.

### Hallazgo 4 (medio): falta la prueba del conteo y el alcance de «se contabilizan»

- **Falta una prueba que pide #255** («Los conteos acordados lo incluyen, con prueba»). Nada comprueba que `cargarInicio` use `FILTRO_CUENTA_EN_PLANILLA`. Tampoco que ese filtro de Prisma diga lo mismo que `cuentaEnPlantilla`, aunque son dos copias de la regla.
- **D-274 dice que la matriz de acreditación «aún no existe», pero ya existe** (`/reportes/matriz`, RF-029). Lista a todos los profesores, sin la regla de plantilla.
- **El inicio de Administración (#301) cuenta otra cosa.** Su tarjeta «Profesores activos» cuenta solo `ACTIVO`. Quedan tres cifras distintas de «profesores»: inicio, Administración y matriz.

**Qué hacer:**

- Agregar la prueba del conteo del inicio.
- Corregir D-274 y decidir si la matriz y la tarjeta de Administración aplican `cuentaEnPlantilla`. La tarjeta es de I1: puede ajustarse aparte.

### Hallazgo 5 (por confirmar): ¿quien tiene goce de sueldo se escanea?

Con D-272, quien está en licencia o estancia **con goce** cuenta en la plantilla, pero no se le buscan publicaciones. Tampoco aparece en participantes de convocatorias ni se puede agregar a un cuerpo académico, porque todo eso exige `ACTIVO`. Puede ser lo correcto, pero conviene confirmarlo con el cliente junto con D-274.

### Detalles menores

- **Nombres de la regla.** `FILTRO_CUENTA_EN_PLANILLA` y `cuentaEnPlantilla` dicen «planilla» y «plantilla». Convendría un solo nombre.
- **Buscar y exportar.** «Con goce de sueldo» se ve en el listado, pero no se puede buscar ni filtrar (D-009) ni sale en la exportación a Excel y PDF.
- **Formulario del alta.** `CamposProfesor` guarda el estatus y la casilla en estado de React. No verifiqué si, tras un alta correcta en `/profesores/nuevo`, el formulario vuelve a quedar vacío o conserva la selección anterior.
- **La conversión no se puede deshacer.** Quien estaba «trasladado» queda como «licencia», sin rastro de su valor anterior. Según D-270, los 122 profesores reales se cargaron como `ACTIVO`, así que solo afecta a datos de demostración o capturados a mano.
- **Plan de pruebas.** La lista del PR está sin marcar.

## 5. Lo que no se probó

- **Las pantallas en el navegador** (alta, Editar, listado e inicio) en tema claro, tema oscuro y celular. La casilla, que se habilita y deshabilita según el estatus, se revisó solo leyendo el código.
- **Producción.** El fallo lo reportó @irybyron y no lo reproduje.
- **El conteo del inicio con datos de la base.** No se consultó cuántos profesores quedaron en cada estatus.
- **Límite de esta revisión:** no sustituye la aprobación de otra persona del equipo que pide D-006.
