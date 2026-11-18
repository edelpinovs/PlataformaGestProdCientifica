# Revisión del PR #228: accesos frecuentes en Mi cuenta (#226)

Registro de la revisión del [PR #228](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/228) de `edelpinovs` (rama `feat/transversal-accesos-frecuentes`, cierra el issue #226). El comentario está publicado en el PR. La persona que revisa es la misma que lo preparó, así que es una revisión previa: la aprobación en GitHub la da otra persona del equipo.

## 1. Alcance revisado

Un panel «Accesos frecuentes» en Mi cuenta con los cuatro módulos que más usa la persona, filtrados por su rol actual; sin historial, un estado vacío y los módulos del rol. Para contarlos: la tabla nueva `AccesoModulo` (perfil, módulo, conteo, último acceso; única por perfil y módulo; borrado en cascada) con su migración, la Server Action `registrarAcceso` y el componente cliente `RegistroAcceso`, que `Marco` monta solo en los módulos del registro. Cambia dos piezas que se acuerdan antes (`prisma/schema.prisma` y `src/components/marco.tsx`) y el PR lo avisa. Solo se guarda el slug del módulo: nunca rutas, parámetros ni identificadores. Catorce archivos; el PR está apilado sobre el [#227](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/227) (su base es `feat/transversal-mi-cuenta`).

## 2. Chequeos

En un worktree del commit `f893bee` con `main` ya incluido y el cliente de Prisma regenerado: `npm test` (1024 pruebas, las mismas que cita el PR), `npm run lint` y `npm run typecheck` pasan. El CI (`verificar`, que también corre `npm run build`) y Vercel pasaron.

La migración es solo aditiva (`CREATE TABLE`, índice único y llave foránea con `ON DELETE CASCADE`, sin `DROP`), coincide con el modelo y trae RLS y `REVOKE` a `anon` y `authenticated`, igual que `ConfiguracionScopus`. `registrarAcceso` empieza con `requireRol` de los tres roles, valida el slug contra el rol real y aplica la ventana de 30 minutos en el servidor; `requireRol` queda fuera del `try`, así que una redirección no se traga. Las pruebas cubren esas reglas, el ranking y el panel.

No se vio la pantalla en el navegador (claro, oscuro, celular, teclado) y no se ejerció `registrarAcceso` con una sesión real ni contra la base; el propio PR lo declara.

## 3. Hallazgos

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | El issue pide una fila en `docs/SEGUIMIENTO.md` y el PR no la trae; se agrega con esta revisión | Menor (bitácora) |
| 2 | La comprobación de la ventana y el `upsert` no son atómicos: dos pestañas que entran a la vez pueden sumar dos visitas en la misma ventana. El efecto es de un conteo, pero se evita con una sola sentencia condicional (`updateMany` donde `ultimoAcceso` sea anterior a la ventana) | Menor |
| 3 | Sin historial, «Módulos disponibles» muestra solo los cuatro primeros del rol en el orden del registro; el administrador tiene ocho y el título sugiere que son todos | Menor |
| 4 | La migración ya está aplicada en la base compartida antes de aprobar el PR. Si el PR cambia, la base queda por delante de `main` y quien corra `prisma migrate status` en otra rama verá una migración aplicada que no existe en su copia. Es la práctica del equipo, pero conviene avisarlo en el chat | Menor |
| 5 | No hay prueba de `RegistroAcceso` ni de que `Marco` lo monte solo en módulos del registro; la lógica que importa (`debeRegistrar`, `moduloRegistrable`) sí está probada | Menor |
| 6 | Falta comprobar con sesión real que la Server Action no refresque la ruta ni haga esperar a una acción de formulario enviada justo al cargar (Next las atiende en fila). El PR lo anota como no probado | A comprobar |
| 7 | La revisión visual (claro, oscuro, celular y teclado) está pendiente, como pide el issue | A comprobar |

Fuera del código: D-237 sigue pendiente y D-234 a D-236, de las que depende, viven en el #227; el #228 no debe integrarse antes que ese ni sin cambiar su base a `main`.

## 4. Dictamen

**Aprobable con comentarios.** La regla es simple, está probada, los permisos y la privacidad están cuidados y la migración es segura. Lo abierto son mejoras menores y las comprobaciones con sesión real y en el navegador. La aprobación en GitHub la da otra persona del equipo.
