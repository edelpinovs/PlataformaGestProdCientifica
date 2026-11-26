# Revisión del PR #405: Catálogos, pantalla de inicio con totales, iconos y orden por jerarquía (#403)

Revisión del [PR #405](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/405) de `edelpinovs` (I1), rama `feat/catalogos-inicio-con-totales` → `main`. Lleva `Closes #403`. Cambia solo `src/app/catalogos/page.tsx`: cada tarjeta del inicio de Catálogos muestra icono, nombre, descripción, total de registros y un enlace «Ver listado →», en orden de jerarquía (divisiones, departamentos, grados) y sin el código RF.

| Campo | Valor |
|---|---|
| PR | #405 · issue #403 (`Closes`) |
| Autor | @edelpinovs (I1) |
| Commit revisado | `552a03b` (sin conflictos con el `main` actual; la rama parte de un `main` anterior) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Sin sesión real ni pantallas en el navegador |
| Resultado | **Aprobable.** Cumple el alcance del #403; falta la revisión visual (claro, oscuro y celular) y la aprobación de otra persona, porque el autor es I1 |

Esta revisión la hace un agente que trabaja para I1 sobre código de I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

Un archivo, +62 / −14 líneas. No toca `src/components/`, `src/lib/` ni `prisma/schema.prisma`. Reutiliza `Marco`, `Icono` y `EtiquetaEstado` de `@/components/ui`; los trazados de los iconos están definidos en la propia página, como pedía el issue.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: **1740 pruebas** (la rama parte de un `main` anterior; incluye la prueba de pauta visual) |
| `npm run lint`, `npm run typecheck` | Correctos. La descripción habla de un error de `typecheck` en `datos-reales/`; en una copia limpia sin esa carpeta no aparece |
| CI de GitHub (`verificar`, incluye `build`) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Sin conflictos |
| Pantalla en tema claro, oscuro y celular | **No la vi.** La descripción tampoco la vio |

## 3. Lo que se leyó y está bien

- **Permisos:** `requireModulo("catalogos")` sigue al inicio de la página.
- **Totales reales:** tres `count()` en paralelo en el servidor; un catálogo vacío muestra «Sin registros» y el singular/plural («1 registro», «2 registros») está cubierto.
- **Pauta visual:** solo colores con nombre, `rounded-2xl` en la tarjeta y `rounded-xl` en el icono, iconos con `aria-hidden` (lo trae `Icono`), cuadrícula `sm:grid-cols-2 lg:grid-cols-3`.
- **Una sola tarjeta enlazada:** el nombre accesible del enlace incluye el total y el nombre del catálogo.
- **Quita el RF-xxx** de la vista y deja fuera Programas educativos, como acota el issue.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **Sin revisión visual.** El issue pide declarar tema claro, oscuro y celular; quien revise debe verlos en la vista previa de Vercel, sobre todo cómo se apilan la etiqueta de total y el icono en pantalla estrecha |
| 2 | Menor | **Orden de lectura del enlace:** en el DOM el total aparece antes del nombre, así que un lector de pantalla dice «3 registros Divisiones académicas…». Es legible, pero el nombre primero sería más natural |
| 3 | Menor | **Sin prueba de los totales.** Es una página de servidor sin lógica propia y la regla del equipo exige prueba solo para reglas de negocio; basta con la revisión visual |
| 4 | Menor | **Nombre de rama y commit fuera de convención** (`feat/catalogos-…` y `feat: …`, sin módulo ni RF). No afecta el resultado |
| 5 | Menor | **Si falla un `count`, falla toda la página.** Es lo habitual en el resto de pantallas del proyecto; solo se menciona |

## 5. Dictamen

**Aprobable.** Se puede integrar cuando otra persona lo apruebe y alguien vea la pantalla en claro, oscuro y celular en la vista previa. No requiere migración ni avisos al equipo.
