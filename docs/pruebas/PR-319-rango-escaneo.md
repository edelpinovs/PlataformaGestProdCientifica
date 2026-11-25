# Revisión del PR #319: escaneo por un rango de fechas completas Desde y Hasta (#266)

Revisión del [PR #319](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/319) de `irybyron` (responsable del módulo Producción), rama `feat/M6-RF-020-rango-escaneo-266` → `main`. Lleva `Closes #266` («Producción: rangos de búsqueda (periodos) en el escaneo») y agrega la decisión D-271.

| Campo | Valor |
|---|---|
| PR | #319 · issue #266 · decisión D-271 |
| Autor | @irybyron |
| Commit revisado | `45772f3` (mezcla de `main` sobre el commit de trabajo `d466e73`) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma generado. Consultas a la base compartida **solo de lectura** (`SELECT`). Sin `next dev`, sin navegador y sin llamar a las fuentes externas |
| Resultado | **Aprobable con comentarios.** La lógica del rango está bien aislada y probada. Antes de integrar hay que resolver el estado de D-271 y las fechas futuras (hallazgo 1) y proteger el SQL del historial (hallazgo 2) |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; aun así no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/rango-escaneo.ts` (nuevo) | Función pura del rango: años que abarca, qué obras entran (`dentroDelRango`), validación (`validarRango`, `rangoSolicitudEsquema`), compatibilidad con el año único anterior (`rangoEfectivo`) y texto «del 15/03/2024 al 30/06/2025» |
| `src/modules/produccion/escaneo.ts` | El motor consulta cada año del rango, guarda solo las obras dentro y no adelanta los cortes |
| `src/modules/produccion/lotes.ts` | `desde` y `hasta` en la solicitud y en el trabajo guardado (`Job.datos`, sin migración) |
| `src/modules/produccion/fechas-escaneo.ts` | `hoyMexico()` |
| `src/modules/produccion/historial.ts` | El alcance del historial muestra el rango (SQL) |
| `src/app/produccion/actions.ts`, `trabajos.ts`, `escaneo/page.tsx` | La Server Action y el trabajo reciben y devuelven el rango |
| `src/app/produccion/formulario-escaneo.tsx` | Dos campos de fecha en lugar del año; el rango de un trabajo pendiente se muestra bloqueado |
| `src/app/produccion/historial/page.tsx` | «Periodo solicitado: …» |
| Pruebas | `rango-escaneo.test.ts` (nuevo), `lotes.test.ts`, `escaneo.test.ts`, `trabajos.test.ts`, `revision-pr63.test.ts` |
| Documentos | README del módulo y `docs/DECISIONES.md` (D-271) |

Sin cambios de esquema, migración, dependencias ni `src/components/`, `src/lib/` o `prisma/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (con `main` ya mezclado, que trae las pruebas del #316 y #317) | Correcto: 123 archivos, **1447 pruebas** (el PR dice 1439 antes de esa mezcla) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | Sin conflictos (`MERGEABLE`); `main` avanzó después con solo documentación |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **La regla vive en un solo lugar,** una función pura que usan el motor, el formulario, el historial y el trabajo guardado. Es lo que pedía el issue.
- **Validación en el servidor con mensajes en español, también con valores atípicos:** fecha imposible (`2025-02-30`), año `0000`, `NaN`, campo repetido o ausente, solo «Hasta», rango invertido, fuera de límites (desde 01/01/1990, hasta el 31/12 del próximo año) y de más de 10 años. Está probado.
- **Extremos inclusivos,** con pruebas del día anterior y posterior a cada extremo.
- **Compatibilidad:** un trabajo anterior con `anio` equivale a ese año completo; continuar y reintentar respetan el rango guardado. El formulario lo muestra bloqueado.
- **Un rango no adelanta los cortes incrementales** (hay prueba en el motor).
- **«Hoy» en Ciudad de México,** con prueba en el límite del año (23:30 del 31 de diciembre).
- **La Server Action sigue protegida** (`requireRol`, con su prueba) y `desde` y `hasta` salen del formulario por `formData`, sin confiar en el navegador.
- **Accesibilidad:** cada campo dentro de su `<label>`, `aria-invalid` con error y mensajes con `<Aviso tipo="error">`.
- **Sin datos personales** en pruebas ni documentos.

## 4. Pruebas de revisión (solo lectura; no se llamó a las fuentes externas)

Script temporal con la validación real y `SELECT` contra la base compartida (se borró después):

| Caso | Resultado |
|---|---|
| Rango normal 2024-03-15 a 2025-06-30 | Acepta |
| Solo «Hasta» | «Indica la fecha inicial del rango.» en `desde` |
| Solo «Desde» en el futuro (2027-03-01) | «La fecha final debe ser igual o posterior a la fecha inicial.» **en `hasta`, aunque esté vacío** (hallazgo 3) |
| «Desde» y «Hasta» futuros dentro del límite (2027-03-01 a 2027-06-01) | **Acepta** (hallazgo 1) |
| Historial real: `sqlHistorial` con la expresión nueva | Responde |
| Alcance del historial con JSON `{desde, hasta}`, `{anio}` y `{}` | «; del 15/03/2024 al 30/06/2025», «; año 2024» y «; novedades» |
| Alcance con JSON `{"desde":"2024-02-30",…}` | **Error de la base** `22008` (fecha fuera de rango): hallazgo 2 |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Importante (antes de integrar) | **D-271 se registra como «vigente»,** pero decide los puntos que el issue y D-256 dejaban «Por acordar»: el tope de duración, el reemplazo del año único, la obra con fecha incompleta y las fechas futuras. El origen es «elección de @irybyron en sesión». La regla del equipo es que lo que solo se propuso va como `pendiente`. Además el issue recoge un criterio de la revisión del #289 («no aceptar fechas futuras y tomar la fecha actual en America/Mexico_City») y el PR **sí acepta fechas futuras** hasta el 31/12 del próximo año | Confirmar con I1 (y el cliente si aplica) y dejar D-271 como `pendiente` hasta entonces; decidir si se aceptan fechas futuras y, si no, limitar «Hasta» a hoy |
| 2 | Importante (robustez) | La expresión SQL del historial protege con la forma `AAAA-MM-DD` pero hace `::date`, y una fecha imposible con esa forma (`2024-02-30`) **hace fallar la consulta entera**: un solo registro así dejaría sin cargar toda la pantalla de Historial. Hoy el esquema (`z.iso.date`) impide guardarlo, así que no ocurre en la práctica, pero el SQL del historial ya se escribió con cuidado ante JSON raro (por ejemplo el id del profesor) | Dar el formato con `substr` (`substr(x,9,2) \|\| '/' \|\| substr(x,6,2) \|\| '/' \|\| substr(x,1,4)`), sin convertir a fecha, y añadir una prueba con una fecha imposible |
| 3 | Menor | Con solo «Desde» en el futuro el mensaje sale en «Hasta» y dice «La fecha final debe ser igual o posterior…», aunque la persona dejó «Hasta» vacío; confunde | Mensaje propio: «La fecha inicial no puede ser posterior a hoy. Indica también la fecha final.» |
| 4 | Observación | Una obra **sin fecha ni año** entra en cualquier rango (queda para revisión), y una fecha de **1 de enero** cuenta por año, así que con «Desde» a mitad de ese año puede entrar una obra anterior a «Desde». Está documentado en D-271 y probado | Aceptable si el cliente lo confirma; mencionarlo en la ayuda del formulario o en la revisión de resultados |
| 5 | Observación | El issue pide mostrar el rango «en el historial y en el punto de continuación (#169)». El PR lo muestra en el historial y explica que un rango no adelanta los cortes, pero no aclara por qué no aparece en Continuidad | Anotarlo en el issue o en la descripción (los cortes son por profesor y fuente, no por búsqueda) |
| 6 | Observación | El tope es de 10 años **calendario**: 2015-12-31 a 2025-01-01 se rechaza aunque dure menos de 10 años. El mensaje dice «máximo 10 años» | Aclararlo en el mensaje («10 años calendario») |
| 7 | Observación | Con 10 años, el motor hace una consulta por año y por fuente para cada profesor: hasta 10 × 5 fuentes × 122 profesores. El tope protege las cuotas de Scopus y Google Scholar, pero no se midió con las fuentes reales | Probar con un solo profesor y una fuente antes de lanzar una búsqueda para todos |
| 8 | Observación | La casilla «Revisar `/produccion/escaneo` con sesión real y una búsqueda corta» sigue sin marcar; el navegador se probó con el simulador y datos ficticios | Revisarlo con sesión real en claro, oscuro y celular (el issue lo pide) |
| 9 | Observación | La descripción no menciona `npm run build` (el CI sí lo corre y pasa) | Anotarlo |

## 6. Lo que no se probó

- La pantalla en el navegador con sesión real (claro, oscuro y celular) y el calendario nativo en celular.
- Una búsqueda de verdad contra ORCID, OpenAlex, Scopus, Crossref y Google Scholar: ninguna prueba llama a las fuentes.
- `npm run build` en local.

## 7. Dictamen

**Aprobable con comentarios.** El diseño es limpio y está bien probado. Antes de integrar: cerrar el estado de D-271 y la regla de fechas futuras (hallazgo 1) y blindar el SQL del historial (hallazgo 2). Falta la aprobación de otra persona del equipo (D-006).
