# Revisión de los PR #263, #267, #268 y #269: panel de administración (#241 a #244)

Revisión de la pila de cuatro PR de `edelpinovs` que forman el panel de administración (decisiones [D-241 y D-242](../DECISIONES.md), ambas aún **pendientes**). Cada PR apunta a la rama del anterior; solo el #263 apunta a `main`. Los cuatro pasaron de borrador a *listo para revisión* el 2026-11-23.

| Campo | Valor |
|---|---|
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code). Es el mismo dueño que preparó los PR: **otra persona debe aprobarlos** |
| Entorno | Local (Windows 10, Node 24), copia aislada de cada rama (`git worktree`), `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios** los cuatro. No hay hallazgos que bloqueen; hay puntos que decidir antes de integrar (sección 4) |

Los registros que dejó quien preparó cada PR están en sus ramas: PR-263-admin-fase1-usuarios-roles.md, PR-267-admin-fase2-auditoria-calidad.md, PR-268-admin-fase3-escaneo-sistema.md y PR-269-admin-fase4-exportaciones.md (llegan a `main` con cada PR). Este documento es la revisión aparte; no los reemplaza.

## 1. Alcance

| PR | Rama → base | Commit revisado | Archivos | Contenido |
|---|---|---|---|---|
| #263 | `feat/M1-administracion-usuarios-reglas` → `main` | `dff5082` | 15 | `Perfil.activo` y su migración, módulo `administracion`, listado de usuarios con edición y desactivación, `getPerfil()` exige `activo` |
| #267 | `feat/M1-administracion-auditoria-calidad` → #263 | `74c29ce` | 12 | Tabla `Auditoria` y su migración, bitácora de solo lectura, cinco reglas de calidad de datos |
| #268 | `feat/M1-administracion-escaneo-parametros` → #267 | `edbedd3` | 7 | Control del escaneo y estado del sistema, ambos de solo lectura |
| #269 | `feat/M1-administracion-exportaciones` → #268 | `333b52f` | 11 | Descarga en Excel y PDF de los tres listados, con constancia en la bitácora |

## 2. Verificaciones automáticas

Cada rama se probó con `prisma validate`, `npm test`, `npm run lint` y `npm run typecheck`. El `npm run build` se corrió sobre el último PR (#269), que contiene el código de los otros tres, en una copia con `npm ci` propio.

| Rama | `prisma validate` | `npm test` | `npm run lint` | `npm run typecheck` | `npm run build` |
|---|---|---|---|---|---|
| #263 | Correcto | 104 archivos, 1147 pruebas | Correcto | Correcto | (ver #269) |
| #267 | Correcto | 106 archivos, 1180 pruebas | Correcto | Correcto | (ver #269) |
| #268 | Correcto | 108 archivos, 1196 pruebas | Correcto | Correcto | (ver #269) |
| #269 | Correcto | 110 archivos, 1219 pruebas | Correcto | Correcto | Correcto; compila las seis rutas de `/administracion` y `/administracion/exportar` |

- Las descripciones de los PR dicen que falla `produccion/conectores/http.test.ts` y que Vitest solo corre con `--pool=vmThreads`. **En esta revisión no falló nada con la configuración por defecto**: la suite completa pasa. Si falla en su equipo, es un problema de ese entorno.
- En el worktree que reutilicé al principio, el build falló con «Symlink node_modules is invalid» porque `node_modules` era un enlace fuera de la carpeta. Es un problema de mi entorno, no del código; con `npm ci` propio compila.

## 3. Lo que se leyó en el código y está bien

- **Permisos (RNF-005):** las dos Server Actions de usuarios, las tres páginas nuevas y la ruta `/administracion/exportar` empiezan con `requireModulo("administracion")`, que en el registro es solo `ADMINISTRADOR`.
- **Desactivar no deja sin acceso a nadie por error:** no se puede desactivar el propio acceso, ni al único administrador activo, ni cambiarle el rol; un administrador desactivado no cuenta como respaldo (prueba incluida).
- **`getPerfil()` exige `activo`:** es el punto por el que pasan `requireRol` y `requireModulo`, así que un perfil desactivado queda sin acceso en todos los módulos. No hay bucle de redirección: `/login` no consulta el perfil.
- **Auditoría atómica (#267):** el cambio y su registro van en un solo `prisma.$transaction`; una edición sin cambios no escribe nada. La bitácora no tiene relación con `Perfil`, así que desactivar a alguien no altera lo ya registrado.
- **Migraciones:** `perfil_activo` es una línea (`ADD COLUMN ... DEFAULT true`, sin borrar nada) y `auditoria` solo crea la tabla, dos índices y la RLS. Ninguna usa `DROP`.
- **Listados (D-009):** usuarios y auditoría usan `skip`/`take` con `count`, orden con lista permitida y desempate por `id`; la búsqueda escapa `%` y `_` (prueba incluida).
- **Mensajes en español:** los esquemas Zod fijan el mensaje en cada regla y hay pruebas con valores ausentes y atípicos.
- **Estado del sistema (#268):** solo dice si algo responde o está configurado; nunca muestra valores de variables de entorno ni mensajes de error de librerías.
- **Exportación (#269):** valida `listado` y `formato`, rechaza un filtro inválido en lugar de exportar «todo», pone tope de 10 000 filas y **no entrega el archivo si no puede registrarlo en la bitácora**. Las celdas se escriben como texto, así que un correo que empiece con `=` no se ejecuta como fórmula.

## 4. Puntos abiertos

1. **D-241 y D-242 siguen pendientes y los PR ya no son borrador.** El #263 decía «Borrador hasta que el equipo acuerde D-241 y D-242». Conviene acordarlos en el chat antes de integrar, o volver los PR a borrador hasta entonces.
2. **Las dos migraciones ya están aplicadas a la base compartida** (`20261123221656_perfil_activo` y `20261123230018_auditoria`, el 2026-11-23) antes de ese acuerdo. Son aditivas y no rompen a las demás ramas (la columna tiene valor por omisión), pero si el equipo decide otro diseño de la tabla `Auditoria`, se corrige con una migración nueva, no editando esta.
3. **El esquema comenta «`resumen` nunca lleva datos de contacto», pero lleva el correo.** `resumenCambioEstado` y `resumenEdicionUsuario` escriben «… de `correo`» y `actorCorreo` es una columna aparte. Es útil y el acceso es solo de administradores, pero el comentario de `prisma/schema.prisma` debe decir lo que hace. Lo que sí se cumple es que el profesor se identifica por su código, no por su nombre.
4. **La descarga (#269) es un GET con efecto** (escribe en la bitácora). Solo funciona con la sesión del administrador y la cookie de sesión no se envía en peticiones entre sitios que no sean navegación, así que el riesgo es bajo: un enlace de otro sitio podría hacer que el administrador descargue un archivo y deje un registro. Quien lo prefiera puede pasarlo a POST; no bloquea.
5. **Si falla la escritura en la bitácora, la persona ve el error genérico de Next.js** y no un mensaje en español. El archivo no se entrega (correcto), pero conviene capturar el error y responder con un texto propio, como ya se hace con los filtros inválidos.
6. **El Excel y el PDF llevan correos** (usuarios y quienes actuaron). Ya lo señala el #269; falta que el equipo confirme que es aceptable (D-253 sobre correo y CVU en reportes).
7. **Revisión por otra persona:** los cuatro los preparó I1 con un agente. Según `SEGUIMIENTO.md`, un PR del dueño del repositorio necesita la aprobación de otro integrante.
8. **Carrera entre dos administradores** (ya reconocida en un comentario del #263): dos administradores que se degraden a la vez podrían saltarse «debe quedar uno». Es un caso que exige coincidir en el mismo instante; si importa, se cierra con un bloqueo o una restricción en la base.
9. **Calidad de datos se filtra y pagina en memoria** (excepción a D-009 que el #267 pide confirmar). Es razonable mientras la lista sea acotada.
10. **Cambio de base al integrar:** al integrar el #263, el #267 debe pasar a apuntar a `main`; y así con el #268 y el #269. GitHub no lo hace solo.

## 5. Lo que no se pudo probar

- **Las pantallas en el navegador** (tema claro, oscuro y celular): `/administracion`, `/usuarios`, `/auditoria`, `/calidad`, `/escaneo` y `/sistema`. Ni quien preparó los PR ni esta revisión las vieron.
- **Contra la base real:** la edición y desactivación de usuarios, la transacción de la bitácora y la lectura de la tabla `Auditoria`. Las pruebas usan un `prisma` simulado.
- **Los archivos descargados** abiertos en Excel y en un lector de PDF; las pruebas solo comprueban los primeros bytes.
- **Un usuario desactivado intentando entrar con sesión real:** que vuelva a `/login` se deduce del código, no se probó.

## 6. Dictamen

Los cuatro PR pasan todas las verificaciones y siguen las reglas del equipo en permisos, listados, mensajes y migraciones. **Aprobables con comentarios.** Antes de integrar: acordar D-241 y D-242, ver las pantallas en los tres modos, corregir el comentario del esquema (punto 3) y que otra persona los apruebe.
