# Revisión y pruebas del PR #227: página Mi cuenta (#225)

Registro de la revisión del [PR #227](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/227) de `edelpinovs` (rama `feat/transversal-mi-cuenta`, cierra #225). El comentario está publicado en el PR. El registro del propio PR está en `docs/pruebas/ISSUE-225-mi-cuenta.md`.

## 1. Alcance revisado

Página `/cuenta` con perfil, selector Claro/Oscuro y cambio de contraseña que exige la actual (`src/app/cuenta/`, reglas puras en `src/modules/cuenta/`), y el cambio a `Marco` (pieza compartida): el avatar pasa a ser un enlace y el menú de cuenta ofrece «Mi cuenta» en lugar de «Cambiar contraseña». Dieciséis archivos; sin cambios de esquema ni dependencias. `/cuenta/contrasena` se conserva para las invitaciones.

## 2. Pruebas realizadas

En copia local de la rama (`66dd829`):

| Prueba | Resultado |
|---|---|
| `npm test` | 998 pruebas pasan (37 nuevas del PR) |
| `npm run lint` y `npm run typecheck` | Sin errores |
| `npm run build` | Compila; `/cuenta` aparece como ruta dinámica |
| Permiso real con el servidor compilado, sin sesión | `/cuenta` y `/cuenta/contrasena` responden 307 a `/login`; `/login` responde 200. No se tocó la base |
| Mutación: no comprobar la contraseña actual | Fallan 2 pruebas |
| Mutación: quitar `requireRol` de la acción | Fallan 3 pruebas |
| Mutación: aceptar una nueva igual a la actual | Falla 1 prueba |
| Mutación: culpar a «la contraseña actual» ante cualquier error de Supabase | Fallan 2 pruebas |

**No se probó:**
- El cambio de contraseña contra Supabase real. Las pruebas usan dobles y no se ejecutó con una cuenta de la base compartida porque cambiaría su contraseña. Falta verificar con una cuenta ficticia que funciona, que la sesión sigue abierta y que la contraseña anterior deja de servir.
- La pantalla en el navegador en claro, oscuro y celular, ni con teclado o lector de pantalla (incluido el avatar de `Marco` como enlace).

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | Tras cambiar la contraseña, las sesiones de otros dispositivos siguen abiertas (Supabase no las revoca por defecto); conviene `signOut({ scope: "others" })` o registrar la decisión | A considerar |
| 2 | El correo con que se verifica la actual sale de `perfil.correo` (tabla), no de Supabase; si divergieran, se culparía a la contraseña buena. Usar `user.email` de `getUser()` | Menor |
| 3 | El límite de 72 es en bytes (bcrypt) y Zod cuenta caracteres: con acentos o emojis una contraseña válida para Zod puede ser rechazada por Supabase y solo se vería el mensaje genérico | Menor (sin verificar contra Supabase real) |
| 4 | Sin límite propio de intentos al comprobar la actual; solo lo frenan los límites de Supabase | Informativo |
| 5 | D-234 a D-236 están `pendientes` y D-234 cambia `Marco` (pieza compartida): confirmarlas con el equipo antes de integrar. Los IDs no chocan con otros PR abiertos (el #228 usa D-237) | A corregir (bitácora) |
| 6 | Falta la verificación contra Supabase real y la revisión en el navegador | Pendiente |

## 4. Dictamen

**Aprobable con comentarios.** La parte de seguridad está bien resuelta y probada: el correo no lo manda el navegador, la actual se comprueba antes de guardar, ningún texto de librería llega a la pantalla y el permiso se exige en la página y en la acción. Nada bloquea; lo pendiente es la prueba con una cuenta ficticia y la revisión visual. El PR es de la cuenta del dueño del repositorio, así que esta revisión no es independiente: lo aprueba otro integrante, como pide `AGENTS.md`.
