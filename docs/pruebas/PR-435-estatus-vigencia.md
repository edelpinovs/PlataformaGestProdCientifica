# Revisión del PR #435: estatus de vigencia en SNII y PRODEP y filtro de próximos a vencer (#248)

Revisión del [PR #435](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/435) de `Grillo-de-Alambre`, asignado al issue. El módulo de Reconocimientos es de `Ared11` (I3), y el issue pide que lo revise I3. Cierra [#248](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/248) (D-243).

| Campo | Valor |
|---|---|
| PR | #435 (`Closes #248`) |
| Autor | @Grillo-de-Alambre |
| Rama | `feat/M3-248-estatus-vigencia` → `main`. **Sale de la rama del #433**, así que su diff incluye también ese commit |
| Commit revisado | `08d4b53` (el propio del PR; `6425f7d` es el del #433, revisado en [PR-433](PR-433-listado-snii.md)) |
| Fecha de la revisión | 2026-11-27 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con `main` mezclado. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios, después del #433.** La regla no se duplica y el filtro coincide con la columna. Falta que la búsqueda cubra la columna nueva (hallazgo 1) y medir el ancho intermedio (hallazgo 2) |

## 1. Alcance (solo el commit `08d4b53`)

| Archivo | Cambio |
|---|---|
| `src/modules/reconocimientos/estatus.ts` (nuevo) | `estatusReconocimiento` reutiliza `calcularSemaforo` y `cuentaParaSemaforo` de Reportes. «No aprobado» no tiene vigencia (D-104). `condicionEstatus` traduce el estatus a un rango de `fin` para filtrar en la base |
| `src/modules/reconocimientos/estatus.test.ts` (nuevo) | 4 pruebas, entre ellas la que compara el filtro con `calcularSemaforo` en las fechas límite |
| `snii-listado.ts`, `prodep.ts` y sus pruebas | Columna y filtro `estatus`. El filtro va en `AND` para no pisar el de resultado. Ordenar por estatus es ordenar por `fin` |
| `snii/page.tsx`, `prodep/page.tsx` | Calculan `hoy` una sola vez (`inicioDelDiaUtc`) para el filtro y las filas. Agregan el filtro «Estatus» |
| `snii/fila.tsx`, `prodep/fila.tsx` | Celda «Estatus» con `EtiquetaEstado`, o «Sin vigencia». Fechas, resultado y estatus con `sm:whitespace-nowrap`. En PRODEP, `colSpan` calculado con las columnas en lugar del 6 fijo |
| `src/app/reconocimientos/fila.test.tsx` | Prueba del estatus en la fila |

Sin cambios de esquema, migración ni dependencias. Importa de `src/modules/reportes/` sin modificarlo, como pide el issue («reutilizar la lógica … sin duplicarla»).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 154 archivos, 1886 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 3. Lo que se revisó y está bien

- **No duplica la regla.** El estatus sale de `calcularSemaforo` y `cuentaParaSemaforo`, las mismas del reporte de vigencias, con las etiquetas de `ETIQUETA_SEMAFORO`. Si cambia `MESES_AVISO`, cambian el reporte, la columna y el filtro a la vez.
- **El filtro y la columna no discrepan.** `condicionEstatus` repite los límites de `calcularSemaforo`: vencido si `fin < hoy`, por vencer si `hoy ≤ fin ≤ hoy + 12 meses`, vigente después. La prueba lo compara en ayer, hoy, mañana y los mismos días un año después. Como los dos usan el mismo `setMonth`, también coinciden en fin de mes y en años bisiestos.
- **La misma fecha en toda la página.** `hoy` se calcula una vez y se pasa al filtro y a cada fila.
- **Filtrar en la base.** El estatus se vuelve un rango de fechas, así que el conteo y la paginación siguen haciéndose en la consulta y no en memoria.
- **El filtro se valida** contra `ESTATUS` con la pieza compartida; un valor inexistente muestra el aviso en español.
- **El `colSpan` de PRODEP** ya no es un 6 fijo, que habría quedado corto con la columna nueva.

## 4. Hallazgos

### Hallazgo 1 (medio): la búsqueda no encuentra la columna «Estatus»

La regla de listados pide que el cuadro de búsqueda encuentre «cualquier campo que muestra la interfaz». La búsqueda ya cubre las etiquetas de nivel, participación y resultado, pero no las del estatus: escribir «por vencer», «vencido» o «sin vigencia» no encuentra nada, aunque esas palabras se ven en la tabla.

**Qué hacer:** en `filtroSnii` y `filtroProdep`, si el texto coincide con una etiqueta de `ETIQUETAS_ESTATUS`, agregar `condicionEstatus(estatus, hoy)` a los criterios del `OR`. Si coincide con «sin vigencia», agregar `{ resultado: "NO_APROBADO" }`. Agregar una prueba.

### Hallazgo 2 (medio): ancho intermedio sin medir

Las tablas ganan una columna y cinco celdas dejan de partirse en escritorio (`sm:whitespace-nowrap`). Desde 640 px la tabla deja de apilarse, así que entre 640 y unos 1024 px, con el menú lateral abierto, siete columnas sin salto de línea más las acciones pueden pasar del ancho del panel y causar desplazamiento horizontal. El PR dice que se probó en escritorio y en 375 px, pero no en un ancho intermedio. Es el mismo punto abierto del #427.

**Qué hacer:** revisar en la vista previa a 768 px y a 1024 px. Si desborda, dejar el `whitespace-nowrap` solo en las fechas, o apilar hasta `md`.

### Detalles menores

- **Depende del #433.** Hay que integrar primero el #433 y después actualizar esta rama. También hereda el hallazgo 1 del #433: Editar y Eliminar vuelven a la página 1 sin la búsqueda.
- **Ordenar por estatus mezcla «Sin vigencia».** Ordena por `fin`, así que los «No aprobado» quedan entre vigentes y vencidos según su fecha. Se puede aceptar, pero conviene decirlo o mandarlos al final.
- **El día es el de UTC.** `inicioDelDiaUtc` cambia de día a las 18:00 en la Ciudad de México, así que entre las 18:00 y la medianoche un registro que vence hoy ya sale como vencido. Lo hereda del reporte de vigencias; si se corrige, que sea en un solo lugar.
- **Los 12 meses siguen pendientes.** `semaforo.ts` dice que `MESES_AVISO` es una «propuesta pendiente de confirmar con la Coordinación». Ahora también define «Por vencer» en los listados.
- **El nombre.** «Estatus» en estos listados es lo que pidió el cliente. D-250 (cambiar «semáforo» por «estatus» en todo el sistema) sigue pendiente y este PR no lo resuelve, como dice su descripción.

## 5. Lo que no se probó

- **El navegador.** No abrí las pantallas en tema claro, tema oscuro ni celular. El autor dice que lo revisó con la base compartida, con los nombres difuminados en las capturas y sin subirlas. Falta el ancho intermedio (hallazgo 2).
- **La base real.** No comprobé los conteos por estatus.
- **Límite de esta revisión:** el revisor (I1) es otra persona que el autor. La revisión la hizo un agente, así que la aprobación en GitHub queda a cargo de I1 (D-006). El issue pide además la revisión de I3 (`Ared11`).
