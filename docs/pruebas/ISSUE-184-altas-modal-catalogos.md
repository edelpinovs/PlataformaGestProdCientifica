# Issue #184: altas de Catálogos en modal con `ModalAlta` (D-214)

Fecha: 2026-11-21. Rama: `feat/M1-184-altas-modal-catalogos`. Lo preparó I1 (responsable asignado del issue). El módulo es el de Catálogos (M1), que debe revisarlo otra persona.

## Qué cambia

| Archivo | Cambio |
|---|---|
| `src/app/catalogos/grados/registrar-grado.tsx`, `divisiones/registrar-division.tsx`, `departamentos/registrar-departamento.tsx` | Nuevos. `ModalAlta` con los campos de cada alta (mismos nombres, límites de longitud y textos de ejemplo que los formularios anteriores; asterisco de obligatorio junto al texto) |
| `src/app/catalogos/*/formulario.tsx` (3) | Se eliminan: el alta en panel que reemplazan |
| `src/app/catalogos/*/actions.ts` (3) | `registrarGrado`, `registrarDivision` y `registrarDepartamento` devuelven el contrato de `ModalAlta` (`exito` o `error` con `campo` y `valores`) en lugar de `registrado`/`registrada`. Las reglas no cambian: `requireModulo("catalogos")` al inicio, Zod, duplicados en el servicio y respaldo con `P2002`/`P2003`. No redirigen; `revalidatePath` se conserva. Se retiran los tipos `EstadoGrado`, `EstadoDivision` y `EstadoDepartamento`, que ya no usa nadie |
| `src/app/catalogos/*/page.tsx` (3) | El panel «Registrar …» se sustituye por el botón del modal junto al total («N en el catálogo» o «N coinciden» con búsqueda o filtros), como en el piloto de Profesores. Subtítulo nuevo. El panel del listado queda sin título porque el total ya está en la cabecera. En Departamentos, sin divisiones se muestra el aviso «Registra primero una división» en lugar del botón |
| `src/app/catalogos/*/actions.test.ts` (3) | Nuevos. 21 pruebas de las acciones de alta |
| `docs/diseno/PAUTA_VISUAL.md` | El estado de «Altas en modal» ya no dice que ninguna pantalla usa el modal: lo usan Profesores y los tres catálogos |

No cambia esquema, permisos, reglas de negocio ni `Editar`/`Eliminar` (#59) ni la paginación (D-009): el listado, la búsqueda, los filtros y las acciones de fila no se tocaron.

## Comprobaciones

| Control | Resultado |
|---|---|
| `npm test` | 1,045 pasan (93 archivos); 21 son nuevas |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | correcto; las tres rutas de `/catalogos` se generan |
| Mutación: quitar `requireModulo` de cada acción de alta | falla 1 prueba en cada catálogo |
| Chrome aislado con la pieza `ModalAlta` (`node src/components/modal-alta.navegador.mjs`) | correcto en claro, oscuro y celular 390 px |
| Chrome aislado con los tres componentes reales y una acción ficticia | correcto en claro, oscuro y celular 390 px; capturas inspeccionadas |

Las pruebas de las acciones comprueban en cada catálogo: el permiso del módulo se exige antes de leer o escribir; un alta correcta devuelve `exito` y llama a `revalidatePath` (Departamentos también a `/catalogos/divisiones`); un dato inválido o ausente devuelve su mensaje en español con `campo` y `valores` y no crea; un duplicado se rechaza con el campo marcado; la carrera con otra persona (`P2002`, y `P2003` en Departamentos) no cierra el modal y avisa; y un error inesperado se propaga, de modo que el modal muestra su mensaje genérico y no un éxito.

## Pruebas de navegador

Un script temporal (no incluido en el repositorio, derivado de `modal-alta.navegador.mjs`) monta los tres componentes reales con acciones ficticias, sin sesión ni base de datos, y recorre en cada catálogo: abrir el modal con el foco dentro, título y campos esperados con su asterisco, alta limpia, envío con error (el campo del nombre queda con `aria-invalid`, el mensaje aparece y se conservan los demás valores, incluida la división elegida) y envío correcto (el modal se cierra y aparece el aviso de éxito). Se ejecuta en claro, oscuro y celular de 390 px; comprueba que el modal no desborda el ancho ni hay desplazamiento horizontal de la página.

## Límites

- Las pantallas de Catálogos **no se vieron con sesión real**: la prueba de navegador usa acciones ficticias, por lo que no se probó el alta real contra la base ni con cada rol. Las acciones conservan `requireModulo("catalogos")` y se probaron con dobles.
- No se probó con lector de pantalla ni en Safari o Firefox.
- No se comprobó en el navegador que, tras un alta, el listado conserve búsqueda, filtros, orden y página en una pantalla real: lo garantiza `ModalAlta` (`router.refresh()` conserva la URL) y se probó en su prueba aislada, pero no con estas pantallas.
- `AGENTS.md` (regla «Altas en modal y selector de profesor») todavía dice que ninguna pantalla usa estas piezas. Es una regla del equipo y no se modificó aquí; conviene actualizarla en un PR aparte acordado con el equipo.

## Pendiente para integrar

Revisión de otra persona, con las pantallas vistas en claro, oscuro y celular con sesión real (alta correcta, alta con duplicado y cancelar con cambios sin guardar).
