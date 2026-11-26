# Revisión del PR #392: las acciones Editar y Eliminar de SNII y PRODEP usan icono (#389, D-233)

Revisión del [PR #392](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/392) de `Grillo-de-Alambre`, rama `feat/M3-389-acciones-icono` → `main`. `Closes #389`. Cambia los textos «Editar» y «Eliminar» de las filas de *Reconocimientos registrados* (SNII y PRODEP) por lápiz y papelera con `aria-label` y `title`, como pide la pauta (D-233) y como ya hace `<FilaEditable>`. Sin migración.

| Campo | Valor |
|---|---|
| PR | #392 · issue #389 (`Closes`) |
| Autor | @Grillo-de-Alambre |
| Commit revisado | `3610a79` (la fusión con el `main` actual no tiene conflictos) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. No se tocó la base. **Sin pantallas en el navegador**: la autora declara haberlas visto en claro, oscuro y celular, con datos reales difuminados |
| Resultado | **Aprobable.** Cambio pequeño, acotado y con prueba; solo hay observaciones menores |

Esta revisión la hace un agente que trabaja para I1; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/reconocimientos/snii/fila.tsx` | `claseAccionIcono` + `<Icono d={ICONOS.editar|eliminar} />`, conserva `aria-label` y agrega `title` |
| `src/app/reconocimientos/prodep/fila.tsx` | Lo mismo |
| `src/app/reconocimientos/fila.test.tsx` (nuevo) | Cada fila tiene lápiz y papelera con `aria-label` y `title`, sin el texto anterior; *Editar* no aparece en un registro de convocatoria |

Tres archivos, +67 / −8, todos de M3 (Reconocimientos). No toca `src/components/` ni `src/lib/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 140 archivos, **1720 pruebas** (coincide con la descripción) |
| `npm run lint` y `npm run typecheck` | Correctos |
| CI de GitHub (`verificar`, incluye `build`; incluye la prueba de pauta visual) y vista previa de Vercel | Correctos |
| Fusión con el `main` actual | Sin conflictos |
| Revisión visual | **No la hice.** Se apoya en lo que declara la autora |

## 3. Lo que se leyó y está bien

- **Igual que la pieza de referencia:** mismos `claseAccionIcono`, `Icono` y `ICONOS` que usa `<FilaEditable>`, con `aria-label` que nombra la acción y la persona, y `title` con el nombre de la acción. El `Icono` es decorativo (`aria-hidden`), así que el nombre accesible sigue siendo el `aria-label`.
- **Comportamiento intacto:** *Editar* sigue oculto en registros que vienen de una convocatoria; los botones de la confirmación de borrado conservan su texto; las Server Actions y formularios no cambian.
- **Prueba útil:** cubre SNII y PRODEP, el texto ausente, el `aria-label`, el `title`, que haya exactamente dos iconos y el registro de convocatoria. Usa datos ficticios y dobles de las acciones.
- **Declara con honestidad** cómo se vio (datos reales difuminados, tema oscuro solo en la pestaña para no cambiar el tema guardado) y no incluye capturas con datos personales.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **Tamaño del objetivo táctil:** `claseAccionIcono` da 36 × 36 px (`h-9 w-9`), por debajo de los 44 px que recomienda la guía táctil, igual que en `<FilaEditable>`. No es un problema de este PR, sino de la pieza compartida; si se quiere cumplir 44 px, se decide para todos los listados a la vez |
| 2 | Menor | **Otras filas con acciones de texto siguen sin icono** (por ejemplo las de Cuerpos académicos, Participantes de convocatoria y la bandeja de Validación, que usan `claseAccionFila`). El issue #389 se limita a SNII y PRODEP, así que no es un defecto del PR; conviene abrir uno aparte si la pauta lo exige también ahí o justificar por qué quedan con texto |
| 3 | Informativo | **La revisión visual no se repitió.** Conviene que quien apruebe mire la vista previa de Vercel en claro, oscuro y celular (375 px), porque la prueba automática no mide contraste ni desplazamiento |

## 5. Dictamen

**Aprobable.** Sin hallazgos que bloqueen ni cambios pedidos. Falta la aprobación de otra persona (D-006); quien apruebe puede mirar la vista previa para confirmar lo visual. No requiere migración.
