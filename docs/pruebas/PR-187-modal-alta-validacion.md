# Validación: «Registrar publicación manual» en modal con selector de profesor (D-214, D-215) (#187)

Registro de la implementación para el issue [#187](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/187): migración del alta manual de publicaciones del módulo de Validación a `ModalAlta` con `SelectorProfesor`.

## 1. Alcance

| Archivo | Qué hace |
|---|---|
| `src/app/validacion/registrar-publicacion-modal.tsx` | Componente cliente que compone `ModalAlta` con `SelectorProfesor` y todos los campos de metadatos de la publicación manual con soporte accesible. |
| `src/app/validacion/actions.ts` | Server Action `registrarPublicacionManual` adaptada al contrato de `ModalAlta`: retorna `Promise<EstadoAlta>`, utiliza `revalidarProfesorSeleccionado` para administradores/coordinadores y valida autoría propia para docentes. |
| `src/app/validacion/page.tsx` | Retira el panel fijo de captura manual y coloca el disparador del modal en la cabecera de la sección junto a los controles de vista. |
| `src/app/validacion/formulario-manual.tsx` | Eliminado (sustituido completamente por `registrar-publicacion-modal.tsx`). |
| `src/app/validacion/actions.test.ts` | Pruebas unitarias automatizadas para `registrarPublicacionManual` (roles, revalidación de profesor, validaciones Zod, detección de duplicados y unicidad DOI). |

Solo se modificaron archivos del módulo de Validación (`src/app/validacion/`) y documentación en `docs/`.

## 2. Cumplimiento de requisitos («Terminado cuando»)

1. **Alta en modal sin panel fijo**: Se retiró el panel estático de `page.tsx` y se integró `ModalAlta` desde el botón «Registrar publicación» en la cabecera del listado, conservando la vista actual, búsqueda, orden y paginación.
2. **Selector de profesor integrado (D-215)**:
   - Rol `DOCENTE`: Solo puede seleccionar su propio `profesorId` (viene preseleccionado de inicio); el servidor comprueba que no registre a nombre de terceros y verifica su existencia en base de datos.
   - Rol `ADMINISTRADOR` o `COORDINADOR`: Puede buscar interactivamente entre todos los profesores del directorio; el servidor revalida la selección mediante `revalidarProfesorSeleccionado`.
3. **Contrato de `ModalAlta`**:
   - `registrarPublicacionManual` retorna `Promise<EstadoAlta>` con `{ exito }` o `{ error, campo, valores }`.
   - Ante errores de validación, el modal permanece abierto, preserva los valores ingresados y enfoca el campo correspondiente.
   - Al registrar con éxito, el modal se cierra, se dispara `router.refresh()` y se muestra el aviso de confirmación accesible.
4. **Reglas de negocio de RF-023**:
   - Registro por docente nace `VALIDADA` e ingresa al conteo oficial.
   - Registro por administrador/coordinador nace `PENDIENTE` para confirmación del docente en su bandeja (RF-024).
   - Se preservan validaciones de título (mínimo 3 caracteres), autores, fecha no futura, normalización y detección de duplicados por título y DOI.

## 3. Chequeos automáticos

| Chequeo | Comando | Resultado |
|---|---|---|
| Pruebas unitarias | `npm test` | 104 archivos de prueba, 1155 pruebas pasando (17 pruebas específicas en `actions.test.ts`). |
| Linting | `npm run lint` | Sin errores ni advertencias (ESLint limpio). |
| Tipos TypeScript | `npm run typecheck` | Sin errores (`next typegen && tsc --noEmit`). |
| Compilación de producción | `npm run build` | Compilación de Next.js (Turbopack) exitosa en 40 rutas. |
