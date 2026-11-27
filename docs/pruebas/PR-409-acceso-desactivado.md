# Revisión del PR #409: el login avisa si el acceso está desactivado (#349)

Revisión del [PR #409](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/409) de `edelpinovs` (I1). Cierra [#349](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/349).

| Campo | Valor |
|---|---|
| PR | #409 (`Closes #349`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M8-349-acceso-desactivado` → `main` |
| Commit revisado | `df99929`. Va 2 commits detrás de `main`, solo documentación, y se mezcla sin conflictos |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`). Sin base de datos, sin Supabase real y sin `next dev` |
| Resultado | **Aprobable con comentarios.** El aviso solo aparece después de validar la contraseña, así que no revela qué cuentas existen. Las pruebas cubren los tres casos que pide el issue. Quedan sin aviso dos caminos de entrada (hallazgo 1). D-298 la decidió solo I1, aunque el issue pedía que decidiera el equipo (hallazgo 2). La aprobación tiene que darla otra persona (D-006) |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/login/actions.ts` | Después de un `signInWithPassword` correcto, lee `tema` y `activo` del perfil en una sola consulta. Si el perfil está desactivado, llama a `signOut()` y responde «Tu acceso está desactivado. Pide a la Coordinación que lo reactive.», conservando el correo. Si no hay perfil o la base falla, sigue el flujo de siempre |
| `src/app/login/actions.test.ts` | Tres pruebas nuevas: desactivado con contraseña correcta, contraseña incorrecta (no consulta el perfil) y cuenta sin perfil. Las pruebas del tema se ajustan a la nueva consulta |
| `docs/DECISIONES.md` | D-298 |

Sin cambios de esquema, migración ni dependencias. A diferencia de lo que sugería el issue, no toca `src/lib/auth/session.ts`. Me parece bien: el aviso solo hace falta al iniciar sesión.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 142 archivos, 1755 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 3. Lo que se revisó y está bien

- **No revela qué cuentas existen.** Con contraseña incorrecta o cuenta inexistente, Supabase responde con error y la acción devuelve «El correo o la contraseña no coinciden.» antes de consultar el perfil. Solo quien conoce la contraseña llega a saber que su acceso está desactivado. Una prueba lo fija: con contraseña incorrecta no se consulta el perfil ni se cierra la sesión.
- **El aviso sí aparece.** Desactivar desde el panel solo cambia `perfil.activo`: no bloquea la cuenta en Supabase. Por eso `signInWithPassword` sigue aceptando la contraseña y el código llega a la comprobación del perfil. Si algún día la desactivación bloquea también la cuenta en Supabase, el aviso dejaría de salir.
- **No deja una sesión abierta.** El `signOut()` ocurre antes de responder, así que la cookie que dejó `signInWithPassword` no le sirve a la persona desactivada. Además, `getPerfil()` ya niega el acceso en cada página: el `signOut()` es una capa extra, no la única.
- **La base caída no impide entrar a los demás.** `leerPerfilDeAcceso` devuelve `null` si hay un fallo, igual que antes con el tema. Con la base caída, las páginas tampoco cargarían, así que esto no abre nada.
- **El mensaje** está en español, es corto y dice qué hacer.

## 4. Hallazgos

### Hallazgo 1 (bajo): dos caminos de entrada siguen sin aviso

El PR ya menciona uno de los dos. En ambos la persona no entra, que es lo importante, pero vuelve a `/login` sin saber por qué, que es justo lo que describe el #349:

- **Sesión abierta al desactivarla.** Lo dice el PR. Vuelve a `/login` sin aviso hasta su próximo intento de entrar con contraseña.
- **Enlace de recuperación o de invitación.** `confirmarEnlace` (en `src/app/auth/confirmar/`) manda a `/cuenta/contrasena`, que no revisa el perfil. La persona desactivada puede fijar una contraseña nueva, y al terminar va a `/`, donde `getPerfil()` la regresa a `/login` sin mensaje. Si después entra con esa contraseña, ya ve el aviso.

**Qué hacer:** anotarlo en el issue como límite conocido, o abrir uno aparte. Hay dos salidas. Una es que `/login` muestre un `?error=` propio cuando hay sesión pero el perfil está desactivado, que necesita el cambio en `src/lib/auth/session.ts` que el issue proponía. La otra es aceptar el límite.

### Hallazgo 2 (bajo): D-298 la decidió una sola persona

El *Terminado cuando* del issue dice «El equipo decide y lo registra». D-298 dice «decidido por @edelpinovs (I1)» y quedó `vigente`. Es lo mismo que señalé en D-297 (#391) y en el #333. La decisión es razonable, y el issue pedía pensarla «con esa fuga en mente», que es lo que se hizo. Aun así, conviene que conste que el equipo la vio.

**Qué hacer:** confirmarlo en el chat y agregar a D-298 quién la aprobó, o dejarla `pendiente` hasta entonces.

### Detalles menores

- **`signOut()` cierra todas las sesiones.** Por omisión, Supabase usa el alcance `global` y revoca las sesiones de esa persona en todos sus dispositivos. Para alguien desactivado está bien, solo conviene saberlo. Si `signOut()` lanzara una excepción, la acción fallaría con la página de error en vez del aviso. No pasa en la práctica, porque Supabase devuelve `{ error }` y no lanza.
- **El mensaje nombra a «la Coordinación».** Quien desactiva es un administrador desde el panel. Si quien administra no es la Coordinación, el mensaje manda a la persona al lugar equivocado. Conviene confirmarlo con el uso real.
- **Sin revisión en pantalla.** El aviso sale en el `<Aviso tipo="error">` del formulario de siempre, así que el riesgo visual es bajo. Aun así, no se vio.

## 5. Lo que no se probó

- **Supabase real y el navegador.** No entré con una cuenta desactivada. Las pruebas usan dobles de Supabase y Prisma.
- **Los caminos del hallazgo 1** se dedujeron leyendo el código, no se recorrieron.
- **Límite de esta revisión:** el autor y el revisor son la misma persona (I1, con un agente). La aprobación en GitHub debe darla otra persona del equipo (D-006).
