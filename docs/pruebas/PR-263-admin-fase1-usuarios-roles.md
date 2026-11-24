# Prueba del PR #263: panel de administración, fase 1: usuarios y roles (#241)

Fecha: 2026-11-23. Rama: `feat/M1-administracion-usuarios-reglas`. Lo preparó I1 (dueño del módulo, `@edelpinovs`) con ayuda de un agente de IA. Es la base de una cadena de cuatro PR: #263 ← #267 ← #268 ← #269. Cada uno tiene como base la rama del anterior; al integrar uno, hay que cambiar la base del siguiente a `main`. Sigue en borrador. Refs #241; no lo cierra.

## 1. Qué cambia

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/usuarios.ts` (+ prueba) | Esquemas Zod de invitación y edición con mensajes en español; unicidad de correo y de profesor; último administrador; nadie desactiva su propio acceso; matriz de permisos desde `registry.ts` |
| `src/modules/administracion/usuarios-listado.ts` (+ prueba) | Columnas, filtros (rol, estado), búsqueda y orden del listado (D-009) |
| `src/app/administracion/usuarios/` | Listado, `FilaUsuario` (editar rol y profesor; desactivar o reactivar) y las Server Actions `editarUsuario` y `cambiarEstadoUsuario` (+ prueba) |
| `src/app/administracion/page.tsx` | Inicio con tres cifras reales |
| `prisma/schema.prisma` y `prisma/migrations/20261123221656_perfil_activo/` | `Perfil.activo Boolean @default(true)`. SQL: `ALTER TABLE "Perfil" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;` |
| `src/modules/registry.ts` | Módulo `administracion`, solo ADMINISTRADOR, a cargo de `@edelpinovs`, liberación prevista 2026-12-09 |
| `src/lib/auth/session.ts` (+ prueba) | `getPerfil()` devuelve `null` si el perfil está desactivado. Va en su propio commit y se puede quitar sin afectar al resto |

Archivos compartidos que toca y que hay que confirmar en el chat del equipo: `prisma/schema.prisma`, `src/modules/registry.ts` y `src/lib/auth/session.ts`. La migración **se aplicó a la base compartida antes de ese acuerdo** (2026-11-23, con `npm run db:migrar`); el esquema quedó al día.

## 2. Comprobaciones (copia aislada con `main` integrado)

| Control | Resultado |
|---|---|
| Pruebas propias (módulo, acciones y sesión) | 51 pasan en 4 archivos |
| `npm test` completo | 1146 de 1147 pasan (104 archivos). Falla `src/modules/produccion/conectores/http.test.ts` («un JSON inválido no se reintenta como si fuera un fallo de red»), de otro módulo. No se comprobó si falla también en el CI |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores (tras regenerar el cliente de Prisma) |
| `npm run build` | **no se pudo ejecutar** en la copia aislada: Next rechaza el enlace a `node_modules` que se usó para compartir dependencias («Symlink [project]/node_modules is invalid»). Es una limitación del entorno, no del código. Queda para el CI |

Vitest solo corre en este equipo con `--pool=vmThreads`: con el modo por defecto fallan hasta las pruebas que ya existían en `main` (`Cannot read properties of undefined (reading 'config')`).

Las pruebas de las acciones comprueban: el permiso del módulo se exige antes de leer o escribir; cambiar el rol, desvincular y vincular a un profesor (que se vuelve a comprobar con Prisma); un profesor que ya no está disponible o ya tiene otro perfil; el perfil no choca consigo mismo; no se quita el rol ni se desactiva al único administrador; nadie desactiva su propio acceso; identificador o acción manipulados, rol inválido y profesor `abc` devuelven su mensaje en español; `P2002` y `P2025` se traducen y un error inesperado no se oculta. Las de sesión: un perfil desactivado se trata como sin acceso en `getPerfil()` y `requireRol` lo manda a `/login` aunque su rol sea el permitido.

## 3. Lectura real de la base (solo lectura, solo conteos)

Un script temporal (no se conserva) contó filas con la columna ya aplicada: **14 perfiles activos y 0 desactivados**. Confirma que la migración dejó a los perfiles existentes con acceso. No se escribió nada.

## 4. Límites: lo que NO se probó

- **Las pantallas no se vieron en el navegador** (tema claro, oscuro, celular 390 × 844). Es lo primero que hay que revisar.
- **No se probó con una sesión real por rol**: `requireModulo` se simuló en las pruebas. No se comprobó que un DOCENTE o COORDINADOR sea rechazado en `/administracion`.
- **No se probó el efecto de desactivar a una persona real**: que su inicio de sesión se rechace en todos los módulos se comprueba en `getPerfil()` con pruebas, no con una persona desactivada de verdad. Quien está desactivado vuelve a `/login` sin explicación.
- No se probó con lector de pantalla ni en Safari o Firefox.
- No se probó el selector de profesor dentro de la fila con teclado ni la fila en celular.
- La regla «debe quedar un administrador» no es atómica: dos administradores que se degraden en el mismo instante podrían saltarse la comprobación. Es un caso muy improbable y está comentado en el código.

## 5. Excepciones y decisiones de diseño

- **No se usa `<FilaEditable>`:** el identificador es un uuid, hay un selector de profesor y los usuarios no se eliminan.
- **No hay «Eliminar»** (excepción a #59): se desactiva para conservar el historial. Falta confirmarlo en el chat (D-241).
- **No hay columna de fecha de alta**, para no mostrar un campo que la búsqueda no cubre.

## 6. Pendiente para integrar

- Confirmar en el chat los cambios a `schema.prisma`, `registry.ts` y `session.ts` (D-241).
- Decidir cómo se invita a un usuario nuevo (D-242): `SUPABASE_SECRET_KEY` no puede usarse en la aplicación. Esta fase no invita desde la pantalla.
- Revisión visual y de otra persona. El alta en modal depende del piloto de Profesores (D-216).
- Mostrar un mensaje a quien está desactivado en lugar de volver a `/login` en silencio.
