# Revisión del PR #391: los formularios responden la validación en español y no en el idioma de Chrome (#350)

Revisión del [PR #391](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/391) de `dpfuentes92` (I2). Cierra [#350](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/350).

| Campo | Valor |
|---|---|
| PR | #391 (`Closes #350`) |
| Autor | @dpfuentes92 (I2) |
| Rama | `feat/avisos-navegador-espanol` → `main` |
| Commit revisado | `5849dbc` (ya contiene `main`) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`). Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Los formularios que lista el issue quedan corregidos y el servidor responde en español a los envíos vacíos. Pero `Closes #350` cerraría el issue con formularios todavía sin corregir (hallazgo 1), y D-297 cambia tres piezas compartidas con el acuerdo de una sola persona (hallazgo 2) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/components/modal-alta.tsx`, `listado.tsx` (`BarraListado`) y `fila-editable.tsx` | `noValidate` en el `<form>` |
| Profesores, Convocatorias (carga), Producción (escaneo y demostración) y Reconocimientos (SNII y PRODEP, alta y edición) | `noValidate` en el `<form>`. Participantes y la publicación manual lo reciben a través de `ModalAlta` |
| `src/app/produccion/demostracion/actions.ts` | Si la solicitud no es válida, responde con el mensaje de Zod («Indica un año entre 1900 y 2099…») y no con uno genérico |
| `src/app/avisos-navegador.test.tsx` (nuevo) y pruebas de los módulos | Cada formulario lleva `novalidate`; envíos vacíos de año, fecha y enlace responden con su mensaje en español |
| `docs/DECISIONES.md` | D-297 |

Sin cambios de esquema, migración ni dependencias.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 140 archivos, 1722 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 3. Comprobación propia: ¿responde el servidor en español a un envío vacío?

`noValidate` deja pasar al servidor lo que antes frenaba el navegador, así que esto es lo importante. Con una prueba temporal, que no se subió, pasé por cada esquema del issue un envío con todos los campos vacíos, como lo manda un formulario real. Los esquemas fueron:

- `registrarProfesor`, `cargaResultados`, `participante`;
- `reconocimientoSnii`, `reconocimientoProdep`;
- `publicacionManualEsquema`, `solicitudEscaneoEsquema`, `solicitudDemoEsquema`.

| Caso | Resultado |
|---|---|
| Campos vacíos (`""`) | Todos los mensajes que llegan a la persona salen en español. Las acciones muestran el primero |
| Campo ausente (envío manipulado) | Zod responde en inglés («Invalid input: expected string, received undefined») en profesor, SNII, publicación manual y carga. **No llega a la pantalla**, porque las acciones convierten lo ausente en `""` con `String(formData.get(...) ?? "")` antes de validar. Hay una excepción, explicada abajo: `prepararCarga` |
| Año vacío en carga y participantes | Responde «El año debe ser 2000 o posterior.» (ver detalles menores) |

## 4. Lo que se revisó y está bien

- **La solución que eligió el issue.** El issue proponía dos caminos. Este PR toma `noValidate` en lugar de `setCustomValidity`, igual que se hizo en el acceso en el #345. No agrega piezas nuevas.
- **Los formularios con campos de fecha, año, correo y enlace que lista el issue** quedan cubiertos, directamente o a través de `ModalAlta` y `BarraListado`.
- **La demostración** ahora muestra el mensaje exacto del año, con prueba.
- **`maxLength` sigue funcionando.** No muestra ningún aviso del navegador, porque solo impide escribir de más.

## 5. Hallazgos

### Hallazgo 1 (medio): `Closes #350` cerraría el issue con formularios aún sin corregir

El issue incluye «cualquier campo con `required`, `min`, `max`, `minLength` o `pattern`». Siguen sin `noValidate`, con `required` o `minLength`, que sí muestran el aviso de Chrome:

| Formulario | Validación nativa |
|---|---|
| `cuenta/contrasena/page.tsx` y `cuenta/formulario-contrasena.tsx` | `required` y `minLength` en contraseñas («Please lengthen this text…») |
| `cuerpos-academicos/formulario.tsx`, `[id]/formulario.tsx`, `[id]/fila.tsx` y `[id]/formulario-lgac.tsx` | `required` (ocho en el alta del cuerpo académico) |
| `administracion/usuarios/fila-usuario.tsx` | `required` |
| `validacion/fila-bandeja.tsx` | `required` |

Además, la casilla «Comprobado en el navegador con Chrome en inglés» del issue no consta como hecha. El plan de pruebas del PR está sin marcar.

**Qué hacer:**

- Cambiar a `Refs #350` y abrir la lista de pendientes con los dueños de cada módulo: I1 tiene Cuenta y Usuarios. O agregar `noValidate` a esos formularios aquí, comprobando sus mensajes.
- Anotar la prueba en Chrome en inglés.

### Hallazgo 2 (medio): D-297 cambia piezas compartidas con el acuerdo de una sola persona

El issue pedía que «el equipo elige la solución». D-297 dice «acuerdo de I2» y quedó como `vigente`. Además cambia `ModalAlta`, `BarraListado` y `FilaEditable`, que requieren un acuerdo previo (AGENTS.md). El PR lo deja como «Aviso para I1».

**Qué hacer:** confirmar en el chat y registrar en D-297 quién lo acordó, o dejarla como `pendiente` hasta entonces. Ya pasó lo mismo en el #333.

### Detalles menores

- **Mensaje del año vacío.** En carga y participantes, un año vacío responde «El año debe ser 2000 o posterior.»: el vacío se convierte en 0. Sería más claro «Escribe el año de la convocatoria.», que ya existe para el texto no numérico. Las pruebas nuevas fijan el mensaje actual.
- **`prepararCarga` puede mostrar mensajes en inglés.** Recibe un objeto del cliente y devuelve **todos** los mensajes de Zod. Si alguien manipula la llamada y omite `nombreArchivo`, `tipo` o `tamano`, la pantalla muestra textos en inglés. Viene de antes y solo pasa con un envío manipulado, pero va contra la regla de mensajes de AGENTS.md. Es del módulo de Convocatorias.
- **La prueba nueva es débil en algunos casos.** En `ModalAlta` y en la publicación manual, `avisos-navegador.test.tsx` busca `noValidate` o el tipo de campo con una expresión regular sobre el código fuente. En Participantes solo comprueba que aparece el texto «Registrar participante». Es aceptable, pero no prueba que el formulario que se dibuja lleve `novalidate`.
- **`noValidate` en `Confirmacion` de `FilaEditable`** no tiene efecto, porque ese formulario no tiene campos. No hace daño.

## 6. Lo que no se probó

- **El navegador.** No abrí Chrome en inglés ni envié los formularios. Los mensajes se comprobaron sobre los esquemas, no en pantalla.
- **Las acciones con la base real.**
- **Límite de esta revisión:** no sustituye la aprobación de otra persona del equipo que pide D-006.
