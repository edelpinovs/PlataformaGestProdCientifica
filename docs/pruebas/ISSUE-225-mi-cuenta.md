# Issue #225: página «Mi cuenta» con perfil, apariencia y cambio de contraseña (D-234 a D-236)

Fecha: 2026-11-17. Rama: `feat/transversal-mi-cuenta`. Transversal; la preparó I1. No cambia el esquema ni agrega dependencias. El panel de accesos frecuentes va aparte ([#226](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/226)).

## Qué cambia

| Archivo | Cambio |
|---|---|
| `src/app/cuenta/page.tsx` | Nuevo. Página dentro de `<Marco>` con `requireRol` de los tres roles; Perfil, Apariencia y Seguridad |
| `src/app/cuenta/actions.ts` | Nuevo. `cambiarContrasena`: permiso, validación Zod, comprobación de la contraseña actual con el correo de la sesión y guardado |
| `src/app/cuenta/formulario-contrasena.tsx`, `apariencia.tsx` | Nuevos. Formulario con `useActionState` y selector Claro/Oscuro (lee `data-tema` con `useSyncExternalStore`, misma cookie que el menú) |
| `src/modules/cuenta/` | Nuevo. Reglas puras con prueba: `contrasena.ts` (esquema y traducción de errores de Supabase), `tema.ts`, `perfil.ts` |
| `src/components/marco.tsx` | **Pieza compartida.** El avatar del encabezado es un enlace a `/cuenta` y el menú de cuenta ofrece «Mi cuenta» en lugar de «Cambiar contraseña» |
| `docs/diseno/PAUTA_VISUAL.md` | Menú lateral y tabla de archivos |
| `docs/DECISIONES.md` | D-234 a D-236, pendientes |

`/cuenta/contrasena` no cambia: sigue siendo el paso de las invitaciones y recuperaciones.

## Comprobaciones

| Control | Resultado |
|---|---|
| `npm test` | 998 pasan (88 archivos); 37 son nuevas de `src/modules/cuenta/` y `src/app/cuenta/` |
| `npm run lint` | sin errores (el primer intento marcó `document.cookie` dentro del componente; se movió a una función de módulo) |
| `npm run typecheck` | sin errores |
| `npm run build` | correcto |

Las pruebas comprueban: el permiso se exige antes de tocar Supabase y sin él no se llama a Supabase; la contraseña actual se verifica con el correo de la sesión aunque el formulario mande otro; una contraseña actual equivocada no guarda nada; un fallo distinto de credenciales inválidas (por ejemplo, límite de peticiones) no culpa a la persona ni deja pasar texto en inglés; contraseña vacía, ausente, corta, de más de 72 caracteres, igual a la actual, con confirmación distinta o con valores que no son texto devuelven su mensaje en español y el campo a marcar; el selector de tema se muestra en «Claro» en el servidor y la cookie es la que lee `layout.tsx`.

## Límites

- **No se vio la pantalla en el navegador** (claro, oscuro, celular) ni se recorrió con teclado o lector de pantalla: no se disponía de una sesión de prueba. Debe hacerlo quien revise, con `npm run dev` y una cuenta ficticia.
- La acción no se ejerció contra Supabase real: se probó con dobles. Falta confirmar con una cuenta de prueba que el cambio funciona de punta a punta y que la sesión sigue abierta después de `updateUser`.
- Supabase puede limitar los intentos de `signInWithPassword`; ese caso muestra un mensaje genérico (probado con un doble).
- Las demás sesiones abiertas de la persona no se cierran al cambiar la contraseña.
