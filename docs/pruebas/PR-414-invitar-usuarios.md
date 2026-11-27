# Revisión del PR #414: invitar usuarios con invitación pendiente y script (#275, D-301)

Revisión del [PR #414](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/414) de `edelpinovs` (I1), rama `feat/M8-275-invitar-usuarios` → `main`. Lleva `Closes #275`. En el panel de Usuarios y roles, «Invitar usuario» **no crea la cuenta**: guarda una *invitación pendiente* (tabla nueva `InvitacionPendiente`) y deja constancia en la bitácora; una persona del equipo ejecuta `npm run invitar:pendientes`, que crea el acceso en Supabase Auth, vincula al profesor, imprime el enlace y borra la invitación. Registra D-301, que reemplaza a D-242.

| Campo | Valor |
|---|---|
| PR | #414 · issue #275 (`Closes`) |
| Autor | @edelpinovs (I1), con Claude Code |
| Commit revisado | `b2fbc12` (incluye la fusión con el `main` del 2026-11-26; ver hallazgo 1) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1); es el mismo agente que escribió el cambio, así que esta revisión **no es independiente** |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Consultas a la base compartida solo de lectura (`prisma migrate status`). Sin sesión real, sin pantallas y sin Supabase Auth |
| Resultado | **Aprobable con comentarios.** Cumple el alcance del #275 y respeta la regla de secretos; falta probar el script con Supabase real, ver la pantalla y la aprobación de otra persona |

Esta revisión no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` y `migrations/20261127013611_invitacion_pendiente` | Tabla `InvitacionPendiente` (correo único, rol, profesor único opcional con `ON DELETE CASCADE`, `creadaPor`, `creadoEn`) con RLS |
| `src/app/administracion/usuarios/actions.ts` | `invitarUsuario` (modal) y `cancelarInvitacion`, ambas con `requireModulo("administracion")` y bitácora en la misma transacción |
| `src/app/administracion/usuarios/registrar-usuario.tsx`, `page.tsx` | Modal con `ModalAlta` y `SelectorProfesor`; panel «Invitaciones pendientes» con «Cancelar invitación» |
| `src/modules/administracion/usuarios.ts`, `auditoria.ts` | `buscarDuplicadoInvitacion`, acciones `usuario.invitado` y `usuario.invitacion_cancelada` y sus resúmenes |
| `scripts/invitar-pendientes.ts`, `scripts/lib/invitacion.ts`, `package.json` | Script `invitar:pendientes`; `invitar` acepta el profesor a vincular |
| `scripts/lib/cargar-profesores.ts` | `invitacion` en `SIN_USO_PROFESOR` (la prueba del esquema lo exige) |
| Pruebas | `invitaciones.test.ts` en la acción y en el módulo |
| `docs/DECISIONES.md` | D-301 (vigente) y D-242 marcada como reemplazada |

Catorce archivos, +503 / −9. Toca `prisma/schema.prisma` (acordado por I1).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 144 archivos, **1786 pruebas** (con el `main` actual) |
| `npm run lint`, `npm run typecheck`, `npx prisma validate` | Correctos |
| CI de GitHub (`verificar`, incluye `build`) | No lo vi correr al revisar; Vercel en verde. Se confirma tras subir la fusión |
| Fusión con el `main` actual | Había un conflicto en `docs/DECISIONES.md` (D-298 a D-300 llegaron a `main` mientras tanto). **Lo resolví** conservando las cuatro filas en orden y subí la fusión a la rama |
| Pantallas y script contra Supabase | **No los probé** (el script exige la llave secreta, que solo tiene el equipo) |

## 3. Lo que se leyó y está bien

- **Secretos:** la aplicación no importa `SUPABASE_SECRET_KEY` ni crea cuentas; el único código que la usa sigue en `scripts/`.
- **Permisos y validación:** las dos acciones empiezan con `requireModulo("administracion")`; el servidor valida con Zod (mensajes en español, también con valores atípicos como un rol inventado o un identificador no numérico) y vuelve a comprobar al profesor con Prisma (existe, sin perfil y sin invitación).
- **Unicidad:** se revisa en la regla pura contra perfiles *e* invitaciones, se respalda con `@unique` en correo y profesor y se captura `P2002` con un mensaje propio.
- **Bitácora atómica:** el alta y la cancelación escriben su registro en la misma transacción; el resumen lleva el código del profesor, nunca su nombre (D-294).
- **Cancelar:** el identificador pasa por una validación de entero positivo de 32 bits; si ya no existe avisa sin tocar la bitácora.
- **Script:** la invitación se borra solo después de crear la cuenta; si falla, queda pendiente y el comando termina con código de error. No escribe enlaces en archivos.
- **Migración:** solo agrega una tabla (compatible con `main`, D-275) y activa RLS.

## 4. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **Hasta aplicar la migración, `/administracion/usuarios` falla** (la tabla no existe en la base compartida). Es compatible con `main`, así que D-275 permite aplicarla antes de integrar; se aplica tras esta revisión y la descripción del PR debe decir que ya está aplicada |
| 2 | Media | **El script no tiene prueba automática ni se ejecutó contra Supabase.** Es delgado (reutiliza `invitar`), pero es la única pieza que crea accesos reales. La primera corrida debe hacerse con un correo ficticio propio y comprobar: cuenta creada, perfil con rol y profesor vinculado, invitación borrada, enlace que entra |
| 3 | Menor | **Borrar un profesor borra en silencio su invitación pendiente** (`ON DELETE CASCADE`), porque el borrado de Profesores no la cuenta entre lo que impide eliminar (solo `SIN_USO_PROFESOR` de los scripts la considera). No hay daño, pero tampoco aviso ni constancia; si se prefiere, agregarla a la condición de borrado de `src/app/profesores/actions.ts` en otro PR |
| 4 | Menor | **Una invitación pendiente no caduca ni muestra su antigüedad más que la fecha.** Si el equipo tarda, el panel la sigue mostrando; basta la fecha por ahora |
| 5 | Menor | **Un `P2002` devuelve un mensaje genérico** («Ese correo o ese profesor ya tiene una invitación pendiente») sin decir cuál de los dos campos chocó; es una carrera poco probable |
| 6 | Menor | **Sin revisión visual** en tema claro, oscuro y celular (el issue la pide antes de cerrar), ni `npm run build` en local |
| 7 | Menor | **Conflictos futuros en `docs/DECISIONES.md`:** los PR de documentación y de código que agreguen fila al final seguirán chocando entre sí; el segundo en integrarse lo resuelve |
| 8 | Menor | **No es una revisión independiente:** el mismo agente escribió y revisó el cambio; otra persona debe aprobarlo (D-006) |

## 5. Dictamen

**Aprobable con comentarios.** Después de esta revisión se aplica la migración (aditiva), se actualiza la descripción del PR y quien lo apruebe debe ver la pantalla en claro, oscuro y celular y probar `npm run invitar:pendientes` con un correo ficticio antes de usarlo con personas reales. Al integrar, avisar en el chat: `git pull` y `npx prisma generate`.
