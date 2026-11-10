# Issue #183: piloto de Profesores con `ModalAlta` (D-214, D-216)

Fecha: 2026-11-10. Rama: `feat/M2-D-216-piloto-profesores-modal`. Lo preparó I1 para desbloquear el #179 y el resto de las migraciones por módulo (#184 a #187); el módulo es de I2, que debe revisarlo.

## Qué cambia

| Archivo | Cambio |
|---|---|
| `src/app/profesores/campos-profesor.tsx` | Nuevo. Los campos del alta, extraídos del formulario de página para compartirlos con el modal. El asterisco de los campos obligatorios queda junto a su texto (antes caía a otra línea) |
| `src/app/profesores/registrar-profesor.tsx` | Nuevo. `ModalAlta` con esos campos y la acción del modal |
| `src/app/profesores/actions.ts` | Las reglas del alta pasan a una función común; `crearProfesor` (página) sigue igual y `crearProfesorEnModal` devuelve el contrato de `ModalAlta` (`exito` o `error` con `campo` y `valores`) sin redirigir |
| `src/app/profesores/nuevo/formulario.tsx` | Usa los campos compartidos; mismo comportamiento |
| `src/app/profesores/page.tsx` | El botón «Registrar profesor» abre el modal; se retira el enlace a `/profesores/nuevo` y el del estado vacío |
| `src/app/profesores/actions.test.ts` | Nuevo. 7 pruebas de la acción |

`/profesores/nuevo` **se conserva** como página directa, sin enlace desde el listado; es un punto a decidir con I2 (retirarla o dejarla). No cambia reglas de negocio, permisos ni esquema.

## Comprobaciones

| Control | Resultado |
|---|---|
| `npm test` | 761 pasan (65 archivos); 7 son nuevas |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | correcto; `/profesores` y `/profesores/nuevo` se generan |
| Chrome aislado, claro, oscuro y celular 390 × 844 | Correcto con los campos reales y una acción ficticia; capturas inspeccionadas |

Las pruebas de la acción comprueban: el permiso del módulo se exige antes de leer o escribir; un alta correcta devuelve `exito` y llama a `revalidatePath`; un dato inválido, un género ausente o manipulado y un código o correo duplicado devuelven su mensaje en español con el `campo` y los `valores`, sin crear; una carrera de unicidad (`P2002`) no revienta y conserva los valores; el formulario de página mantiene las mismas reglas.

La prueba de navegador (un script temporal, no incluido) abre el modal con el foco dentro, envía un correo duplicado y verifica que el modal sigue abierto, marca el correo con `aria-invalid` y conserva nombres, género, código y tipo de contratación; al corregir, cierra, muestra el aviso, actualiza el listado y conserva `?q=agua&pagina=3`; una nueva alta empieza limpia; no hay desbordamiento horizontal.

## Límites

- La prueba de navegador usa una acción ficticia; no se probó el alta real contra la base ni con la sesión de cada rol (la acción conserva `requireModulo("profesores")`).
- No se probó con lector de pantalla ni en Safari o Firefox.
- No se probó el cierre con dos Escape seguidos con cambios sin guardar (punto abierto desde la revisión del #165).
- El piloto no ejercita `SelectorProfesor`: Profesores no elige profesores. Lo ejercitarán Cuerpos académicos (#186) y Validación (#187).

## Pendiente para integrar

- Revisión de I2 (dueño del módulo) y de otra persona.
- Decidir qué pasa con `/profesores/nuevo`.
- Con el piloto integrado y revisado se desbloquean #184 a #187 y el PR #179.
