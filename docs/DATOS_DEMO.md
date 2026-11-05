# Datos de demostración

Datos **ficticios** para ver las pantallas con contenido. Viven en la base de desarrollo compartida, están marcados y se pueden borrar sin tocar datos reales (decisión D-008 en [`DECISIONES.md`](DECISIONES.md)).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run db:demo` | Borra los datos demo anteriores (solo los marcados) y los vuelve a crear. Se puede repetir sin duplicar |
| `npm run db:demo:contar` | Solo cuenta lo que hay marcado como demo (no escribe) |
| `npm run db:demo:limpiar` | Borra únicamente lo marcado como demo |

Requieren `DIRECT_URL` en `.env` y que ya se haya corrido `npm run db:seed` (departamentos y grados base).

## Qué incluye

| Entidad | Cantidad | Detalle |
|---|---|---|
| Profesores | 50 | `Nombre 01` / `Apellido 01 Apellido 26`, código `DEMO001`, correo `profesor01@demo.invalid`. 35 de tiempo completo y 15 de asignatura; los cinco estatus laborales; CVU, ORCID, Scopus y Scholar en parte de ellos |
| Casos límite | — | Un nombre muy largo (07), uno con acentos y eñe (08), uno sin departamento (49) y uno sin grado (50) |
| Programas educativos | 6 | `DEMO-PE-01` a `06`, uno por departamento |
| Reconocimientos SNII | 18 | Vigentes, por vencer (30 días), que terminan hoy, vencidos, 2 «No aprobado», 2 en reconsideración, 2 profesores con un periodo anterior y uno ligado a una convocatoria oficial |
| Reconocimientos PRODEP | 10 | 7 vigentes, 1 vencido, 1 en reconsideración y 1 no aprobado |
| Cuerpos académicos | 6 | `DEMO-CA-01` a `06`, uno por departamento. Con 4, 3, 4, 4, 3 y 0 integrantes; el 5 sin líder; el 1 con vigencia vencida |
| LGAC | 10 | Dos por cada cuerpo con integrantes |
| Publicaciones | 30 | Los 7 tipos y 5 fuentes; 6 sin DOI; algunas sin fecha |
| Autorías | 60 | Validadas, pendientes y rechazadas, con coautorías |

Las fechas se calculan respecto del día en que se carga, así que «vigente» y «por vencer» siempre lo son.

## Cómo se reconoce lo que es demo

| Dato | Marca |
|---|---|
| Profesor | Correo que termina en `@demo.invalid` |
| Cuerpo académico | Clave que empieza con `DEMO-CA-` |
| Programa educativo | Clave que empieza con `DEMO-PE-` |
| Publicación | Título que empieza con `[DEMO] ` |
| Convocatoria | SNII del año 1999 |

La limpieza borra solo eso, siempre con condición (nunca `TRUNCATE` ni borrados sin `WHERE`). Un profesor demo con cuenta de acceso (`Perfil`) no se borra.

## Cosas que conviene saber

- **No toca el esquema** ni crea cuentas de acceso: es solo para ver las pantallas.
- **Los formularios no aceptan dígitos en nombres.** Para editar un profesor demo desde la pantalla hay que cambiarle el nombre, porque `Nombre 01` no pasa la validación del formulario.
- Si el escaneo externo o la carga de resultados vinculan datos reales a un profesor demo, `db:demo:limpiar` borra esos cortes y participaciones, pero deja las publicaciones sin marca que el escaneo haya creado.
- El código está en `scripts/demo.ts` y `scripts/lib/datos-demo.ts`; la generación es pura y está probada en `scripts/lib/datos-demo.test.ts`.
