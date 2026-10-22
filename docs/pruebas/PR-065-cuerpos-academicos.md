# Prueba del PR #65: RF-012, registro de cuerpos académicos

| Campo | Valor |
|---|---|
| PR | [#65](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/65) (cierra #17, incluye la regla #59) |
| Autora | @marisleidysvazquez8293-arch (con Cursor) |
| Rama | `feat/M4-RF-012-registrar-ca` → `main` |
| Commit probado | `76ccad5` |
| Fecha de la prueba | 2026-10-22 |
| Probó | Edel Pino |
| Entorno | Verificaciones automáticas en local (Windows 11, Node 24), en un `git worktree` aparte. Pruebas manuales confirmadas por el revisor, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado.** Falta la aprobación en GitHub. La descripción del PR se corrigió para que GitHub cierre #17 (sección 4). |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/modules/cuerpos-academicos/cuerpo.ts` | Nuevo: esquema Zod del CA, `revisarCuerpo` (clave única y departamento existente, con `idPropio` al editar) y `motivoNoEliminable` |
| `src/modules/cuerpos-academicos/cuerpo.test.ts` | Nuevo: 18 pruebas |
| `src/app/cuerpos-academicos/actions.ts` | Nuevo: Server Actions `registrarCuerpo` (CU-007), `editarCuerpo` y `eliminarCuerpo`, todas con `requireModulo("cuerpos-academicos")` |
| `src/app/cuerpos-academicos/formulario.tsx` | Nuevo: formulario de registro con errores por campo; los campos se reutilizan al editar |
| `src/app/cuerpos-academicos/fila.tsx` | Nuevo: fila con *Editar* y *Eliminar*, con la edición y la confirmación dentro de la fila |
| `src/app/cuerpos-academicos/page.tsx` | Deja de ser página pendiente: formulario y listado dentro de `Marco` |
| `src/modules/cuerpos-academicos/README.md` | Reglas de RF-012 y pendientes de RF-013 a RF-015 |

No toca el esquema de Prisma, `src/lib/`, `src/components/` ni las dependencias.

### Reglas que implementa

| Campo | Regla |
|---|---|
| Clave | De 2 a 20 caracteres: letras, números y guiones, empezando con letra. Se guarda en mayúsculas. Única en el catálogo |
| Nombre | La regla común `nombreCatalogo(200)` de catálogos. La primera letra se guarda en mayúscula |
| Nivel | Uno de `EN_FORMACION`, `EN_CONSOLIDACION` o `CONSOLIDADO` |
| Área PRODEP y disciplina | Texto obligatorio de hasta 150 caracteres |
| Departamento | Debe existir |
| Años de registro y vencimiento | Enteros entre 1990 y 2100. El vencimiento no puede ser anterior al registro. El RF no los pide, pero el esquema los exige |

## 2. Revisión de código

| Punto | Resultado |
|---|---|
| Permisos (RNF-005): `requireModulo` en la página y en las 3 Server Actions | Correcto |
| Validación con Zod en el servidor, errores legibles por campo | Correcto |
| Unicidad de la clave en el servicio y en la base (`@unique`), con `P2002` capturado | Correcto. Como la clave se guarda en mayúsculas, el `@unique` también impide `ca-001` frente a `CA-001` en altas simultáneas |
| Departamento borrado mientras se llena el formulario (`P2003`) | Correcto: mensaje claro |
| Editar no choca consigo mismo (`idPropio`) | Correcto |
| Borrado: `IntegranteCa` y `Lgac` tienen `onDelete: Cascade`, así que la base se los llevaría sin avisar. La condición va dentro del borrado (`deleteMany` con `integrantes: { none: {} }, lgacs: { none: {} }`) y, si no borra nada, vuelve a consultar para explicar el motivo | Correcto, sigue la regla de `AGENTS.md` |
| Pauta visual: `Marco`, piezas de `@/components/ui`, colores con nombre, `aria-invalid` y `Aviso` | Correcto. La prueba `pauta-visual.test.ts` pasa |

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| CI de GitHub (`verificar`) y vista previa de Vercel, sobre `76ccad5` | Correcto |
| `npm test` (local) | Correcto: 9 archivos, 89 pruebas (18 nuevas de CA) |
| `npm run lint` y `npm run typecheck` (local) | Correcto |
| `/cuerpos-academicos` sin sesión (servidor local) | Correcto: redirige a `/login` (307) |

## 4. Pruebas manuales

Todas como `ADMINISTRADOR`. Los casos 1 a 8 los confirmó el revisor. El servidor local que se levantó para la prueba (puerto 3002) no registró sus visitas, así que no hay registro del servidor como evidencia.

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Registrar un CA ficticio muestra el aviso de éxito y la fila, y vacía el formulario | Correcto | Confirmado por el revisor |
| 2 | Clave existente en minúsculas (`ca-loc1`) muestra error de clave duplicada | Correcto | Confirmado por el revisor; prueba automática |
| 3 | Año de vencimiento anterior al de registro muestra error en ese campo | Correcto | Confirmado por el revisor; prueba automática |
| 4 | Editar un CA conservando su propia clave no choca consigo mismo | Correcto | Confirmado por el revisor; prueba automática |
| 5 | Editar con la clave de otro CA muestra el error dentro de la fila | Correcto | Confirmado por el revisor; prueba automática |
| 6 | Cancelar la edición y cancelar la eliminación no cambian nada | Correcto | Confirmado por el revisor |
| 7 | Eliminar un CA sin integrantes, con confirmación, muestra el aviso de éxito | Correcto | Confirmado por el revisor. Tras la prueba la base solo tiene `CA-LOC1` |
| 8 | Vista de celular y tema oscuro | Correcto | Confirmado por el revisor |
| 9 | Eliminar un CA con integrantes o LGAC no lo borra y explica por qué | **No probado a mano** | La base no tiene profesores. Lo cubren las pruebas de `motivoNoEliminable` y la condición dentro del `deleteMany` |

**Datos de prueba.** Al terminar, la base de desarrollo tiene un solo CA, `CA-LOC1` / *Cuerpo Academico de Ejemplo Local*, que creó la autora, y 0 profesores. No se crearon profesores ni integrantes.

### Corrección hecha en el PR

La descripción decía `Cierra #17`, pero GitHub solo reconoce las palabras clave en inglés: el PR no aparecía ligado al issue y #17 no se habría cerrado al integrarlo. Se cambió a `Closes #17`.

## 5. Observaciones (no bloquean)

1. **Caso 9 pendiente.** Repetirlo cuando RF-013 (integrantes) o RF-015 (LGAC) permitan asignar registros a un CA.
2. **Acentos en el registro de la autora.** `CA-LOC1` se capturó sin acentos (*Academico*, *Ingenieria*, *Computacion*). Conviene corregirlo desde *Editar* o borrarlo antes de la demo.
3. **El nombre no admite números.** `nombreCatalogo()` rechaza dígitos, como en grados y divisiones. Si algún CA oficial lleva números en el nombre (por ejemplo *Industria 4.0*), habrá que relajar la regla para este módulo.
4. **Rol `COORDINADOR` sin probar.** El módulo lo admite según `registry.ts`; falta entrar con una cuenta de ese rol.

## 6. Dictamen

Se aprueba la integración del PR #65 a `main`, una vez que otra persona del equipo lo apruebe en GitHub. Al integrarse, GitHub cerrará #17.
