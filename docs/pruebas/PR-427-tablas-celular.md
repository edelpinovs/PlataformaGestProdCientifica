# Revisión del PR #427: tablas del panel en celular (#425)

Revisión del [PR #427](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/427) de `edelpinovs` (I1), rama `fix/M8-425-tablas-celular` → `main`. Lleva `Closes #425`. La bitácora, Usuarios y Calidad dejan de desplazarse en horizontal en una vista de 390 px: en celular se ocultan las columnas secundarias y sus datos se apilan bajo la primera celda (el patrón de Profesores); desde `md` (768 px) se ve la tabla completa. Además corrige un desbordamiento de 34 px de la matriz «Qué puede hacer cada rol».

| Campo | Valor |
|---|---|
| PR | #427 · issue #425 (`Closes`) |
| Autor | @edelpinovs (I1), con Claude Code |
| Commit revisado | `a98785f` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1); es el mismo agente que escribió el cambio, así que esta revisión **no es independiente** |
| Entorno | Local (Windows 10, Node 24): lectura del diff y `npm test` en la rama; medición en navegador hecha al escribir el cambio (servidor local, sesión de administrador, marco de 390 px, tema claro) |
| Resultado | **Aprobable con comentarios.** Resuelve lo que pedía el #425 sin tocar datos, permisos ni esquema; falta ver el tema oscuro y un ancho intermedio, y la aprobación de otra persona |

Esta revisión no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/administracion/auditoria/page.tsx` | Fecha encabeza la fila; persona, módulo, acción y detalle se apilan en celular y son celdas desde `md` |
| `src/app/administracion/usuarios/fila-usuario.tsx`, `page.tsx` | Rol, profesor, estado y alta se apilan bajo el correo; la matriz de roles pasa a `relative overflow-x-auto` |
| `src/app/administracion/calidad/page.tsx` | Problema y detalle se apilan bajo el registro |
| `src/app/administracion/usuarios/fila-usuario.test.tsx` | Prueba nueva de la fila de Usuarios |

Cinco archivos, +90 / −23. Solo presentación: no toca `src/lib/`, `src/components/`, permisos, acciones, esquema ni migraciones.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` en la rama (mismo código) | Correcto: 151 archivos, **1860 pruebas** |
| `npm run lint`, `npm run typecheck` | Correctos |
| Fusión con `main` | Sin conflictos |
| CI de GitHub (`verificar`, incluye `build`) | **Pendiente al cerrar esta revisión**; Vercel en verde. Confirmar que termine en verde antes de integrar |
| Medición en navegador (390 px, tema claro) | Bitácora, Usuarios y Calidad: la página mide 375 de 375 px útiles. Los registros se leen apilados |

## 3. Lo que se leyó y está bien

- **Sin cambio de comportamiento:** las consultas, el orden, la paginación, los permisos y las acciones de fila no se tocan; la edición y el cambio de estado de Usuarios siguen con `colSpan` de 6 columnas.
- **El orden en celular se conserva:** los encabezados ocultos se reemplazan con el selector «Ordenar por» que ya ofrece `BarraListado`.
- **Mismo patrón que Profesores** (`hidden … table-cell` y un bloque `md:hidden` bajo la primera celda), con lo que se mantiene la forma de la pauta («columnas que se apilan, sin desplazamiento horizontal»).
- **La causa del desbordamiento de la matriz es correcta:** los textos «Sí/No» para lector de pantalla son `sr-only` (posición absoluta) y, sin un ancestro posicionado, se escapaban del contenedor desplazable; `relative` lo resuelve (comprobado: de 409 a 375 px).
- **Prueba nueva útil:** la fila de Usuarios muestra rol, profesor, estado y alta en el bloque apilado y oculta el resto de celdas hasta `md`.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **Tema oscuro y teléfono real sin probar.** La comprobación fue en tema claro y en un marco de 390 px del navegador de escritorio |
| 2 | Menor | **Ancho intermedio (640 a 767 px)** usa la versión apilada con la barra lateral ya en columna; no se midió ahí. El corte en `md` es una decisión nueva (Profesores corta en `sm`) |
| 3 | Menor | **Los datos apilados no tienen etiquetas.** En celular se lee «Administración · Reactivó el acceso…» sin decir cuál es la persona, el módulo o la acción, y los encabezados ocultos desaparecen para lectores de pantalla. Profesores hace lo mismo; si se quiere, anteponer una etiqueta visible o con `sr-only` a cada dato apilado |
| 4 | Menor | **Pruebas parciales:** solo Usuarios tiene prueba; las páginas de la bitácora y de Calidad son componentes de servidor sin prueba de render. La prueba de Usuarios se apoya en el texto de las clases (`md:hidden`, `md:table-cell`), así que un cambio de clases la rompe sin que haya un error real |
| 5 | Menor | **El mismo riesgo de `sr-only` puede existir en otros contenedores desplazables** (por ejemplo, `Acciones` de Departamentos y de Cuerpos académicos): no se midieron. Si alguno desborda en celular, la corrección es la misma clase `relative` |
| 6 | Menor | **No es una revisión independiente:** el mismo agente escribió y revisó el cambio; otra persona debe aprobarlo (D-006) |

## 5. Dictamen

**Aprobable con comentarios.** Quien lo apruebe debe esperar el CI en verde, abrir la bitácora, Usuarios y Calidad en un teléfono o con el navegador a 390 px en tema claro y oscuro, y probar un ancho de unos 700 px. Los hallazgos 2 a 5 pueden ir en otro PR. Sin migración: no hay nada que avisar al equipo al integrar.
