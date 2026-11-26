# Revisión del PR #352: el detalle del profesor se abre en un modal de solo lectura (#341, D-277)

Revisión del [PR #352](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/352) de `dpfuentes92` (I2, responsable del módulo Profesores), rama `feat/M2-detalle-profesor` → `main`. Lleva `Closes #341` («Listados: icono *Ver detalle* con la información completa del registro en un modal, piloto en Profesores»). Cada fila de Profesores gana un icono de ojo que abre un modal con el registro completo; la URL usa `ver` y conserva búsqueda, filtros, orden y página. La pieza `ModalDetalle` y el icono `ver` quedan en `src/components/`.

| Campo | Valor |
|---|---|
| PR | #352 · issue #341 |
| Autor | @dpfuentes92 |
| Commit revisado | `54bdeaa` (la rama ya incluye el último `main`) |
| Fecha de la revisión | 2026-11-25 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24, Chrome sin interfaz con perfil aislado): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Sin base de datos ni sesión real; el modal y la fila se probaron con el arnés de navegador del repositorio y datos ficticios |
| Resultado | **Aprobable con comentarios.** El modal funciona, la lógica está en una función pura probada y la lectura exige permiso. Faltan una prueba propia de la pieza compartida y corregir que un clic en el relleno cierra el modal; D-277 está como `vigente` sin confirmación de I1 |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/components/modal-detalle.tsx` (nuevo) | `<ModalDetalle>`: `<dialog>` con `showModal()`, secciones etiqueta/valor, «Cargando…», botones *Editar* (enlace) y *Cerrar*; Escape, X, *Cerrar* y clic fuera quitan `ver` con `router.replace` y devuelven el foco |
| `src/components/fila-editable.tsx` | Props opcionales `verDetalle` (icono de ojo), `edicionInicial` y `urlListado`; al cancelar una edición abierta desde el detalle vuelve al listado |
| `src/components/ui.tsx` | `ICONOS.ver` |
| `src/modules/profesores/profesores-detalle.ts` y `.test.ts` (nuevos) | `idDeDetalle` (Zod, mensaje en español), `seccionesDetalleProfesor`, `subtituloDetalleProfesor`; vacío «—», *Pendiente* marcado, goce solo si el estatus lo admite |
| `src/app/profesores/actions.ts` y `.test.ts` | `leerDetalleProfesor(id)` con `requireModulo("profesores")`; 2 pruebas (permiso y registro inexistente) |
| `src/app/profesores/page.tsx` | Lee `ver` y `editar`, valida, muestra el modal o un aviso en español |
| `docs/diseno/PAUTA_VISUAL.md`, `docs/DECISIONES.md` | Sección «Detalle en modal (D-277)» y la decisión D-277 |

Diez archivos, +463 / −7 líneas. Sin esquema, migración ni dependencias. **Toca `src/components/`**, que según `AGENTS.md` se acuerda antes en el chat; la descripción lo avisa a I1.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 128 archivos, **1513 pruebas** |
| `npm run lint` y `npm run typecheck` | Correctos (incluye `pauta-visual.test.ts`) |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se leyó y está bien

- **Permisos:** la página ya exige el módulo y `leerDetalleProfesor` lo exige otra vez; hay prueba de que, sin permiso, no se consulta la base.
- **Entrada validada:** `ver` y `editar` pasan por `idDeDetalle` (entero positivo, tope de `Int` de la base) y un valor inválido o un profesor inexistente muestran un aviso en español sin abrir el modal. No hay texto de librería en pantalla.
- **El listado no carga de más:** el detalle se pide solo al abrir y trae conteos con `_count`, no las relaciones.
- **Contenido fiel al issue:** secciones Datos generales, Adscripción, Identificadores, Relacionado y Registro; vacíos y espacios en blanco salen como «—»; *Pendiente* con `EtiquetaEstado`; goce de sueldo solo en Licencia o Estancia posdoctoral; fechas en hora de Ciudad de México.
- **Sigue la pauta visual:** colores con nombre, `rounded-2xl`, sin colores de la paleta de Tailwind; icono con `aria-label` «Ver detalle de (nombre)» y `title`.
- **La documentación acompaña:** la pauta describe el patrón y deja claro que es piloto y que Producción conserva su diálogo.

## 4. Revisión en el navegador

Prueba temporal con `ModalDetalle`, `FilaEditable` y las secciones reales del módulo con un profesor ficticio (se borró después), en claro, oscuro y celular de 390 px:

| Qué comprueba | Resultado |
|---|---|
| El icono tiene el nombre accesible esperado; al abrir, el foco entra al diálogo | Correcto |
| Se ven *Pendiente* (género y contratación), «Sí» en el goce con Licencia y cinco «—» en los vacíos | Correcto |
| *Editar* del modal apunta a `…&pagina=2&editar=1` (conserva la página) | Correcto |
| Un clic dentro del contenido no lo cierra; Escape lo cierra, `replace` va a la URL del listado con la misma búsqueda y página, y el foco vuelve al icono | Correcto |
| Sin desbordamiento horizontal | Correcto |
| **Clic en el relleno (el margen interior) del diálogo** | **Lo cierra** (misma causa que en el #343) |

Capturas revisadas: en escritorio el modal ocupa el centro con scroll interno, y en celular ocupa toda la pantalla con las secciones apiladas; legible y con buen contraste en claro y oscuro. En ambas vistas *Editar* y *Cerrar* quedan al final del contenido, así que hay que desplazarse para llegar a ellos. No probé la página real con sesión ni con la base.

## 5. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **`ModalDetalle` no tiene prueba propia.** El issue pedía la pieza «y su prueba» y `ModalAlta` tiene `modal-alta.navegador.mjs`. Solo se prueban la función de secciones y la acción. Falta una prueba de navegador (abrir, Escape, foco de regreso, `replace` a la URL del listado, clic fuera) |
| 2 | Media | **Un clic en el relleno del diálogo lo cierra**: la comprobación `evento.target === evento.currentTarget` también se cumple en el margen interior (`p-5`), no solo en el fondo oscuro. Quien pulsa cerca del borde del contenido pierde el modal. Conviene quitar el relleno del `<dialog>` y ponerlo en el `<div>` interior |
| 3 | Media | **D-277 está `vigente` sin confirmación de I1**, y cambia `src/components/` (pieza compartida) y la pauta. La fila dice «acuerdo de I2 al implementar el piloto». Es el mismo patrón de otras decisiones: dejarla `pendiente` hasta que I1 la confirme. Además quedó entre D-276 y D-275 (fuera de orden numérico) |
| 4 | Menor | `leerDetalleProfesor` se exporta desde un archivo `"use server"`, así que además es un punto de entrada que se puede llamar desde el navegador con cualquier `id`. Está protegida con el permiso del módulo, pero la lectura que arma la página no necesita ser una Server Action (el comentario del issue de @irybyron proponía armarla en el servidor sin una acción aparte). Sin prueba de la transformación fila → datos (`departamento.division`, conteos, `perfil`) |
| 5 | Menor | Con «Atrás» del navegador el modal se cierra, pero el foco no vuelve al icono de la fila (solo ocurre con los cierres propios) |
| 6 | Menor | `ICONOS.ver` duplica el `ICONO_VER` de Producción; D-277 ya dice que Producción lo migrará después, conviene anotarlo en el issue de esa migración |
| 7 | Menor | El plan de pruebas de la descripción quedó sin marcar (ninguna casilla), así que no consta que la autora viera el modal en claro, oscuro y celular, que pide el issue |

## 6. Dictamen

**Aprobable con comentarios.** Puede integrarse cuando I1 acuerde el cambio a `src/components/` y otra persona lo apruebe. Antes conviene corregir el hallazgo 2 y añadir la prueba del hallazgo 1; el 3 pide la decisión de I1 sobre D-277.
