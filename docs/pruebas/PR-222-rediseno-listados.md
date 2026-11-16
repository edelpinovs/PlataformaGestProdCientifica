# Revisión del PR #222: rediseño de los listados con las piezas compartidas (D-233)

Registro de la revisión del [PR #222](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/222) de `edelpinovs` (rama `feat/transversal-listados-rediseno`, referencia al issue #180). El comentario está publicado en el PR.

## 1. Alcance revisado

Cambio de piezas compartidas: `BarraListado` (búsqueda con icono, filtros en línea, grupo segmentado), `PaginacionListado` (números de página con «…» y `paginasVisibles`), `FilaEditable` (acciones con icono), `ui.tsx` (`Avatar`, iconos, encabezados) y `consulta.ts`. En Profesores: columnas Grado y Departamento ordenables, filtro Activos/Inactivos en lugar del de estatus y encabezado con contador. Documentación: D-233 y la sección «Aspecto del listado» de la pauta visual. Trece archivos en la primera versión (`081f1e9`); se revisó también `57daf29` (colores de las opciones para el tema oscuro) y `960fd63` (que «Limpiar» reinicie los campos), subidos por su autor durante la revisión.

## 2. Chequeos

En copia local: `npm test` (924 pruebas en `081f1e9`; 929 con las correcciones), `npm run lint`, `npm run typecheck` y `npm run build` pasan. Las pruebas de componentes cubren paginación numerada, grupo segmentado, «Limpiar», iniciales y los manejadores del selector. Si se quita la exclusión de teclado de `SelectorFiltro`, falla la prueba correspondiente.

No se vio la pantalla en el navegador (claro, oscuro, celular), ni se recorrieron los filtros con teclado real o con lector de pantalla.

## 3. Hallazgos

| # | Hallazgo | Estado |
|---|---|---|
| 1 | `SelectorFiltro` enviaba el formulario en cada `change`: con teclado, las flechas sobre la lista cerrada recargaban la página al primer movimiento (WCAG 3.2.2, nivel A); «Buscar» solo existía en `<noscript>` | Corregido en `a098cc7`: con ratón o toque aplica al elegir; con teclado se aplica con «Buscar», siempre visible; pauta y D-233 actualizadas |
| 2 | Sin prueba del envío automático | Corregido: pruebas de los manejadores en `listado.test.tsx` |
| 3 | El filtro de estatus pasa a Activos/Inactivos: ya no se filtra por LICENCIA o BAJA y un enlace viejo con `?estatus=` se ignora en silencio | Seguimiento (registrado en D-233; confirmar que es lo deseado) |
| 4 | `correo` sigue en las columnas ordenables y en el «Ordenar por» del celular, pero en escritorio no tiene encabezado | Menor |
| 5 | Acciones de fila con iconos de 36 px, sin texto; `title` no se ve en pantallas táctiles | Menor (cumple el mínimo de 24 px de WCAG 2.2) |
| 6 | Falta la revisión visual y con teclado del rediseño, que afecta a otros listados | Abierto |

## 4. Dictamen

**Solicitar cambios, ligeros**, y con la corrección del punto 1 ya aplicada en la rama: **aprobable con comentarios**. El PR es de la cuenta del dueño del repositorio, por lo que esta revisión no es independiente: lo aprueba otro integrante, como pide `AGENTS.md`.
