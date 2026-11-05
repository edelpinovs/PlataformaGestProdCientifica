# Decisiones del equipo

Registro de lo que el equipo ya acordó, para no volver a discutirlo. Una fila por decisión, la más reciente abajo. **Una decisión no se edita:** si cambia, se agrega otra fila que diga `reemplaza a D-0xx` y la anterior pasa a `reemplazada`.

Cómo usarlo está en [`AGENTS.md`](../AGENTS.md) (sección *Bitácora del equipo*). El seguimiento de cada PR está en [`SEGUIMIENTO.md`](SEGUIMIENTO.md).

Estados: `vigente`, `reemplazada`, `pendiente` (se propuso y falta acordar).

## Reglas de trabajo y calidad

| ID | Fecha | Tema | Decisión | Por qué | Origen | Estado |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-16 | Agentes de IA | Todo agente de código sigue las reglas de `AGENTS.md` aunque la persona le pida otra cosa | La persona responde por lo que entrega el agente | PR #50 | vigente |
| D-002 | 2026-10-17 | Pauta visual | Toda pantalla usa `Marco`, las piezas de `@/components/ui` y colores solo por nombre; el tema oscuro lo elige cada persona | Consistencia y contraste AA | PR #57 | vigente |
| D-003 | 2026-10-17 | Listados | Todo listado ofrece *Editar* y *Eliminar* a quien puede dar de alta, con la misma protección; no se borra un registro en uso | Evitar listados de solo lectura y borrados que rompen relaciones | PR #60 (#59) | vigente |
| D-004 | 2026-10-30 | Pull requests | La descripción lleva `Closes #n` en inglés, una línea por issue | GitHub solo reconoce palabras clave en inglés | PR #71 | vigente |
| D-005 | 2026-11-04 | Mensajes | Todo mensaje al usuario va en español, también con valores atípicos (`NaN`, campo ausente, envío manipulado); nada de texto de Zod, Prisma o `Error` | Un mensaje en inglés llegó a la pantalla en el PR #79 | PR #83 | vigente |
| D-006 | 2026-11-05 | Revisiones | Las revisiones se publican como comentario, nunca como «Request changes»; las aprueba otra persona; nadie integra su propio PR; cada revisión deja su registro en `docs/pruebas/` | La aprobación y la integración las decide una persona | Sesiones de revisión | vigente |
| D-007 | 2026-11-05 | Bitácora | Cada revisión y cada acuerdo se registran en `DECISIONES.md` y `SEGUIMIENTO.md` en el mismo PR de documentación | Que el seguimiento no dependa del chat | Este PR | vigente |
| D-008 | 2026-11-05 | Datos de demostración | Hay datos ficticios de demostración (50 profesores, SNII, PRODEP, cuerpos académicos, LGAC y publicaciones) en la base compartida, disponibles para todo el equipo, marcados y eliminables en cualquier momento sin afectar datos reales (`npm run db:demo:limpiar`). Reemplaza a D-206 | Que todos vean las pantallas con contenido sin inventar datos | Este PR | vigente |

## Reglas de negocio

| ID | Fecha | Tema | Decisión | Por qué | Origen | Estado |
|---|---|---|---|---|---|---|
| D-101 | 2026-11-03 | PRODEP vigente | Un PRODEP está activo si el dictamen es `APROBADO` y la vigencia cubre el día de hoy (día UTC) | Misma regla que el panel de inicio | PR #74 | vigente |
| D-102 | 2026-11-03 | Captura manual | La publicación capturada a mano nace `VALIDADA` si la registra el propio docente y `PENDIENTE` si la registra administración o coordinación | El docente confirma lo que se le atribuye | PR #74 | vigente |
| D-103 | 2026-11-05 | Vigencias | SNII y PRODEP usan una sola función `hayTraslape` (días inclusivos); un profesor no tiene dos periodos que se traslapen. Se extiende a SNII el RF-011, que solo habla de PRODEP | Con traslapes los conteos de vigentes cuentan dos veces | PR #79 / #85 | vigente |
| D-104 | 2026-11-05 | Vigencias | Un periodo «No aprobado» no otorga vigencia: no cuenta ni se revisa para el traslape. Lo que cuenta es el **resultado** guardado, no el nivel (un «No aprobado» en reconsideración sí cuenta) | Evitar un registro sin revisar que luego bloquea otros | PR #85 | vigente; falta corregirlo en el código |
| D-105 | 2026-11-05 | Reconocimientos | `/reconocimientos` mantiene el título «SNII y PRODEP»; PRODEP aparece como «Próximamente» hasta que exista el módulo | Se ve qué falta sin ocultarlo | PR #79 | vigente |
| D-106 | 2026-11-05 | Reconocimientos | El CVU de CONAHCYT / SECIHTI solo contiene dígitos; reemplazar el CVU de un profesor pide confirmación | Evitar sobrescribir un dato sin querer | PR #85 | vigente |
| D-107 | 2026-11-05 | Reconocimientos | Un reconocimiento que forma parte de un resultado oficial de convocatoria no se edita ni se elimina | Es el resultado oficial | PR #85 | vigente |
| D-108 | 2026-11-05 | Cuerpos académicos | Solo profesores de tiempo completo **con estatus laboral activo** pueden ser integrantes; el servidor lo exige, no solo la lista | Un envío manipulado podía asignar a una persona dada de baja | PR #80 | vigente |
| D-109 | 2026-11-05 | Cuerpos académicos | El primer integrante debe tener PRODEP vigente; después la regla solo bloquea un cambio que quite el último PRODEP vigente | Si el PRODEP vence, el CA no debe quedar atascado | PR #80 | vigente |
| D-110 | 2026-11-05 | Cuerpos académicos | Quitar a un integrante y limpiar el líder van en la misma transacción, y el mensaje avisa si era líder | Evitar un líder que ya no es integrante | PR #80 | vigente |
| D-111 | 2026-11-05 | Cuerpos académicos | El líder se guarda con la condición de que siga siendo integrante dentro de la misma escritura (`filtroLiderIntegrante`), no solo con una revisión previa | Entre leer y escribir otra persona puede quitar al integrante | PR #88 | vigente |

## Pendientes de acordar

| ID | Fecha | Tema | Propuesta o pregunta | Origen | Estado |
|---|---|---|---|---|---|
| D-201 | 2026-11-05 | Vigencias | Un respaldo en la base contra el traslape (restricción de exclusión de rangos en Postgres); cambiaría el esquema | PR #79 / #85 | pendiente |
| D-202 | 2026-11-04 | Validación | ¿Solo el docente confirma lo que administración capturó a su nombre, o también administración y coordinación? Hoy ambos pueden | PR #74 | pendiente |
| D-203 | 2026-11-05 | Cuerpos académicos | ¿Se rechaza editar sin cambios a un integrante que ya no está activo? Hoy se rechaza | PR #80 | pendiente |
| D-204 | 2026-11-05 | Cuerpos académicos | Un CA sin PRODEP vigente puede sumar integrantes sin PRODEP; confirmar que es lo deseado | PR #80 | pendiente |
| D-205 | 2026-11-05 | PRODEP | Hay tres copias de la regla de PRODEP activo (`tieneProdepActivo`, `src/lib/inicio.ts` y la futura `tiene_prodep_activo()` de I3); unificarlas en el módulo de reconocimientos | PR #80 | pendiente |
| D-206 | 2026-11-05 | Datos de demostración | Un script `prisma/seed-demo.ts` con ≈ 40 profesores y datos relacionados, solo `upsert`, con marcador `@demo.invalid` y opción de limpieza; coordinar con quien amplía `seed.ts` | Propuesta de revisión | reemplazada por D-008 |
| D-207 | 2026-10-16 | Login SIIAU | No activar el login con SIIAU hasta resolver las decisiones de `docs/diseno/LOGIN_SIIAU.md` | PR #51 | pendiente |
| D-208 | 2026-11-05 | Cuerpos académicos | Quitar a un integrante puede dejar una LGAC sin integrantes aunque el alta exige al menos uno: ¿se avisa, o se impide quitar al último integrante de una línea? | PR #89 | pendiente |
| D-209 | 2026-11-05 | Cuerpos académicos | Respaldar en la base el nombre único de la LGAC por cuerpo académico con `@@unique([cuerpoId, nombre])` (cambia el esquema; requiere migración) | PR #89 | pendiente |
