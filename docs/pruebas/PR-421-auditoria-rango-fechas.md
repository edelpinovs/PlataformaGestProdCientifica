# Revisión del PR #421: rango libre Desde/Hasta en la bitácora de auditoría (#277)

Revisión del [PR #421](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/421) de `edelpinovs` (I1), rama `feat/M8-277-rango-fechas-auditoria` → `main`. La bitácora de Auditoría gana dos campos de fecha, **Desde** y **Hasta**, que se suman al filtro «Periodo» y a la búsqueda por fecha que ya existían. No cierra el #277 (los borrados por módulo siguen en #376 a #381).

| Campo | Valor |
|---|---|
| PR | #421 · issue #277 (parte propia; sin `Closes`) |
| Autor | @edelpinovs (I1), con Claude Code |
| Commit revisado | `5489ed3` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1); es el mismo agente que escribió el cambio, así que esta revisión **no es independiente** |
| Entorno | Local (Windows 10, Node 24). Lint y typecheck en una carpeta aparte (`git worktree`); las pruebas, en la rama del PR. Sin sesión real ni pantallas |
| Resultado | **Aprobable con comentarios.** Cumple lo pedido y no toca piezas compartidas ni el esquema; falta ver la pantalla y la aprobación de otra persona |

Esta revisión no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/fechas.ts` | `leerRangoFechas` (valida `YYYY-MM-DD`, descarta lo inválido y avisa) y `rangoDesdeHasta` (ambos días completos, hora de México) |
| `src/modules/administracion/auditoria-listado.ts` | `analizarAuditoria` (suma `desde` y `hasta` al análisis común) y `filtroAuditoria` combina el rango con «Periodo» |
| `src/app/administracion/auditoria/page.tsx` | Dos `input type="date"` dentro de `BarraListado` por su campo `contenido` |
| `src/app/administracion/exportar/route.ts`, `exportar.ts` | La descarga usa `analizarAuditoria` y anota el rango en la bitácora de exportaciones |
| Pruebas | `auditoria.test.ts`, `fechas.test.ts`, `exportar.test.ts` |

Ocho archivos. **No toca** `src/lib/`, `src/components/` ni `prisma/schema.prisma`: el rango se valida en el módulo, como hace Producción con sus fechas. Sin migración.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` en la rama (mismo commit) | Correcto: 144 archivos, **1813 pruebas** |
| `npm run lint`, `npm run typecheck` en carpeta aparte | Correctos |
| CI de GitHub (`verificar`, incluye `build`) y Vercel | En verde |
| Fusión con `main` | Sin conflictos |
| Pruebas en la carpeta aparte | No corrieron: Vitest «no encuentra el ejecutor» con `node_modules` enlazado. Es un problema del entorno de revisión, no del PR; ya habían pasado en la rama y en el CI |
| Pantalla en navegador | **No la probé** |

## 3. Lo que se leyó y está bien

- **Permisos:** la página y la descarga siguen con `requireModulo("administracion")`; no se agregó ninguna acción nueva.
- **Validación en el servidor:** fechas con `z.iso.date`, año `0000` rechazado, valores repetidos en la URL tratados como error; mensajes en español («Indica una fecha válida.»; «La fecha final debe ser igual o posterior a la fecha inicial.»). Nada llega a Prisma sin validar.
- **Horas:** «Hasta» incluye el día completo (cierra al inicio del día siguiente en México, también el 31 de diciembre); la prueba cubre el desfase UTC.
- **Combinación con «Periodo»:** se queda el tramo que cumple ambos en una sola condición `creadoEn`, sin pisar una condición con otra.
- **Descarga:** el enlace conserva `desde` y `hasta` (`enlaceListado` copia todos los filtros); un rango inválido hace que la descarga se rechace con el mensaje.
- **Datos personales:** el resumen de la exportación anota solo las fechas.
- **Forma:** colores por nombre, campos dentro de su `<label>`, `aria-invalid` y texto solo para lector de pantalla; la prueba de pauta visual pasa.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Menor | **Años de dos dígitos mal interpretados.** `0050-01-01` es una fecha válida para el esquema, pero `Date.UTC` la toma como 1950. No tiene efecto práctico (la bitácora empieza en 2026) y devuelve resultados vacíos o todo, nunca error; si se quiere, acotar el año a 1900 o más |
| 2 | Menor | **Sin prueba de la ruta de descarga con un rango inválido** (la lógica sí está probada en el módulo): `route.test.ts` no cubre `desde`/`hasta` |
| 3 | Menor | **Sin revisión visual** en tema claro, oscuro y celular: dos campos de fecha más en la barra pueden alargarla; hay que ver cómo se acomodan. Tampoco corrí `npm run build` local (el CI sí) |
| 4 | Menor | **Un rango y un «Periodo» sin traslape** (por ejemplo «Hoy» con una semana pasada) devuelven una lista vacía sin explicar por qué; el mensaje genérico de «Ningún registro coincide» basta por ahora |
| 5 | Menor | **No es una revisión independiente:** el mismo agente escribió y revisó el cambio; otra persona debe aprobarlo (D-006) |

## 5. Dictamen

**Aprobable con comentarios.** Quien lo apruebe debe ver `/administracion/auditoria` en claro, oscuro y celular, y probar un rango (con y sin «Periodo») y la descarga con él. Los hallazgos 1 y 2 pueden ir en otro PR. Sin migración: no hay nada que avisar al equipo al integrar.
