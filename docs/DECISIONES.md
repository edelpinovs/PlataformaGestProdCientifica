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
| D-009 | 2026-11-05 | Listados | Todo listado se pagina de 10 en 10, ofrece búsqueda de texto libre en cualquier campo visible y orden por cada encabezado de columna (con filtro en las de valores finitos); el estado va en la URL y se valida en el servidor | Que los listados sigan siendo usables cuando crezcan los datos y se vean igual en todos los módulos | Petición de I1 en sesión; `AGENTS.md` y pauta visual | vigente |

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
| D-112 | 2026-11-05 | Consulta de producción | La primera entrega de búsqueda, filtros y paginación mantiene los permisos actuales y se limita a Producción; roles nuevos e indicadores compartidos siguen pendientes de D-211 | Permitir una entrega acotada sin cambiar otros módulos ni el esquema | Sesión de I6; [issue #97](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/97) y [PR #98](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/98) | vigente para esta entrega |
| D-113 | 2026-11-05 | Convocatorias | El archivo oficial de una carga confirmada se protege en la base: la política de borrado de Storage exige que la ruta no pertenezca a una carga `CONFIRMADA` (`es_archivo_confirmado`), no solo la Server Action | Un Administrador o Coordinador podía llamar a Storage directamente y borrar el PDF oficial | PR #100; revisión del PR #77 | vigente al integrar el #100 |
| D-114 | 2026-11-05 | Listados | La regla D-009 se aplica con **una pieza compartida** (funciones puras en `src/lib/` y componentes en `src/components/`, issue #108) y después un issue por módulo: Catálogos como piloto (#109), Profesores (#110), SNII (#111), Cuerpos académicos (#112), Convocatorias (#113), Producción (#114) y Validación (#115). Las tablas de integrantes y LGAC dentro del detalle de un cuerpo académico quedan exentas por estar acotadas | Evitar repetir el mismo código en siete módulos y validar la pieza con los listados más simples antes de repartirla | Sesión de I1; D-212 | vigente |
| D-115 | 2026-11-05 | Pantallas de Producción | Separar resumen, escaneo y publicaciones; listado compartido de 10 elementos, cantidad visible y enlaces numerados según D-009 | Reducir la acumulación de formularios y resultados | Petición de I6; issue #114 | vigente; integrada en el PR #119, revisión visual pendiente |
| D-116 | 2026-11-05 | Resultado del escaneo | Mostrar resultados parciales si hay obras guardadas e incidencias; conservar FALLIDO en persistencia para los reintentos y presentar errores por lista permitida | Una fuente fallida ocultaba resultados válidos | Issue #120; PR #121 | vigente; integrada en el PR #121, revisión visual pendiente |
| D-117 | 2026-11-06 | Profesores | El rol COORDINADOR puede registrar, editar y eliminar profesores igual que ADMINISTRADOR (con la misma protección en la página y en cada Server Action) | Se acordó en la revisión del #69 y el #128 lo conserva; no estaba en la bitácora | PR #69; PR #128; `src/modules/registry.ts` | vigente |

| D-118 | 2026-11-06 | Historial inicial | Sin año ni corte, ORCID y OpenAlex recuperan el historial; después conservan el incremental. No se reinician cortes existentes ni cambia Scopus | Recuperar obras anteriores de profesores nuevos sin consultas por cada año | Sesión de I6; issue #133 y PR #134 | implementada; revisión pendiente |

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
| D-210 | 2026-11-05 | Producción y Reportes | Confirmar en el equipo el alcance de Crossref, cuartiles y `src/modules/reportes/unificado.ts` del PR de escaneo, o separarlos en otra entrega | [PR #63](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/63), segunda revisión; ID ajustado al integrar main para evitar colisión con D-208 | pendiente |
| D-211 | 2026-11-05 | Consulta de producción | Acordar el alcance RF-PC, los roles y un servicio compartido de conteo de obras únicas entre Producción, Validación y Reportes; el conteo actual de Validación suma autorías | [PR #63](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/63), sesión de trabajo de I6; ID ajustado al integrar main para evitar colisión con D-209 | pendiente |
| D-213 | 2026-11-06 | Listados | Tolerar acentos en la búsqueda de nombres propios («Alarcon» debe encontrar a «Alarcón»): exige la extensión `unaccent` de PostgreSQL con una migración y consultas con `$queryRaw`, o una columna normalizada; D-009 solo pide ignorar mayúsculas | La búsqueda de profesores no encuentra nombres escritos sin acento | PR #130; revisión de I1 | pendiente |
| D-212 | 2026-11-05 | Listados | Aplicar D-009 a los listados existentes (catálogos, profesores, SNII, cuerpos académicos, LGAC, validación, convocatorias), alinear la paginación de Producción (hoy 20/50/100) a 10 y decidir si se crea una pieza compartida en `src/components/` (cambio que se acuerda antes) o cada módulo usa sus funciones puras | La regla es nueva y los listados actuales no la cumplen | D-009 | reemplazada por D-114 |
