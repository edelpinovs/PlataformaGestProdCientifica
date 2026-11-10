# Issue #22: extracción de los listados oficiales de resultados (RF-017)

Registro de lo que se probó en la rama `feat/M5-RF-017-extraccion-resultados` y de lo que **queda sin verificar** para quien revise el PR. Todas las pruebas usaron datos inventados (CVU `90xxxx` de los profesores demo); ningún archivo oficial pasó por la base compartida.

## Qué hace

Al registrar una carga de resultados (RF-016), el servidor descarga el archivo, lo lee (Excel con ExcelJS, PDF con `unpdf`) y guarda un `RenglonResultado` por persona con lo que trae el archivo: CVU, código, nombre, nivel otorgado y vigencia. La carga queda *En revisión* con «n renglones · m avisos», o *Fallida* con el motivo en español. *Volver a leer* se ofrece en cargas fallidas o atascadas más de 10 minutos.

## Verificación hecha (2026-11-09)

- `npm test` (685 pruebas), `npm run lint`, `npm run typecheck` y `npm run build`: correctos.
- Rendimiento de la lectura: un PDF inventado de 271 páginas × 35 filas (9,485 personas, la forma del listado SNII 2025) se lee, agrupa e interpreta en **2.3 s**, sin avisos.
- Navegador (`localhost`, rol administración), tres cargas inventadas:

| Archivo | Resultado |
|---|---|
| PDF SNII 2025, 3 personas, una con nivel desconocido | *En revisión*, «3 renglones · 1 aviso» |
| Excel PRODEP 2025, 2 personas con vigencia | *En revisión*, «2 renglones · 0 avisos» |
| PDF sin texto | *Fallida*: «El PDF no tiene texto seleccionable (parece escaneado); súbelo en Excel.» |

- *Volver a leer* en la carga fallida: «Leyendo…» → *Procesando* → *Fallida* con el mismo motivo. No aparece en cargas *En revisión*.
- Tema claro, tema oscuro y celular (375 px). En celular las acciones de la fila se salían del panel; se corrigió apilándolas (commit `60294d5`).
- Las tres cargas de prueba se eliminaron desde la pantalla; el historial quedó en 0. Sin errores en el registro del servidor.

## Pendiente de verificar

1. **Archivos oficiales reales.** Solo se probó con archivos inventados que imitan la estructura descrita en el spec. El lector de PDF asigna cada texto a una columna por su posición en la página: si el PDF oficial tiene otros márgenes, tamaños de letra o celdas desalineadas con el encabezado, algunas personas pueden quedar mal armadas. No falla en silencio (esas filas salen como avisos en el conteo), pero no se ha medido cuántas. Tampoco se probaron listados de PRODEP de otras instituciones ni variantes de redacción del nivel que no estén en `lectura.test.ts`. Hacerlo **fuera de la base compartida** (`AGENTS.md`: solo datos ficticios en la base), pasando el archivo por `fragmentosDePdf` + `agruparEnFilas` + `interpretarListado` en local y reportando solo conteos.
2. **Tiempo completo en Vercel.** Los 2.3 s son solo la lectura en local. No se midió descarga desde Storage + inserción de ~9,500 renglones en Supabase (bloques de 1,000) dentro de `after()`, con `maxDuration = 300`. Si no alcanza, la lectura queda atascada y a los 10 minutos se ofrece *Volver a leer*; la mitigación prevista es partir por páginas guardando el avance en `Job.datos`.
3. **Decisiones del equipo pendientes:** D-214 (dependencia `unpdf`), D-215 (tabla `RenglonResultado` y su migración `20261109165553_renglones_resultado`) y D-216 (de dónde sale la vigencia SNII, que el listado no publica).

## Fuera de alcance

Cruce con el directorio por CVU y nombre normalizado (RF-018), vista previa y conciliación (RF-019), OCR de PDF escaneados y paginación del historial (#113).
