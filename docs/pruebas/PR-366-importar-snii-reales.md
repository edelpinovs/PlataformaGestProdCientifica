# Revisión del PR #366: importar los reconocimientos SNII reales 2026–2027 (#357)

Revisión del [PR #366](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/366) de `edelpinovs` (I1), rama `feat/M3-RF-007-importar-snii-reales` → `main`. Lleva `Refs #357` (no `Closes`: el issue termina cuando una persona aplica en la base compartida y se verifican el listado y el semáforo). Es la fase F5 de [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](../PLAN_IMPORTACION_DATOS_REALES_2027.md) y depende de F3 y F4 ([PR-361](PR-361-completar-profesores-pend.md), [PR-363](PR-363-altas-profesores-reales.md)).

| Campo | Valor |
|---|---|
| PR | #366 · issue #357 |
| Autor | @edelpinovs (el código lo escribió Claude Code a petición suya) |
| Commit revisado | `79207e9` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 11, Node 24). `simular` contra la base compartida (solo lectura). **Sin ensayo en base local** (Docker no arranca en ese equipo) |
| Resultado | **Aprobable con comentarios, pero no conviene aplicarlo todavía.** La lógica está probada con datos ficticios y las reglas clave tienen dientes. El problema no es el código sino el efecto de D-284: con la opción B solo se crearían 22 periodos y **solo uno está vigente hoy** (comentario 1). Falta además ejecutar `aplicar` y `revertir` contra una base real, y que otra persona apruebe |

Esta revisión la hace el mismo agente que escribió el código: **no sustituye la aprobación de otra persona del equipo (D-006).**

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/lib/importar-snii.ts` (nuevo) | Lógica pura: plan (nivel, tipo, validación, traslapes, omitidos con motivo), informes, bitácora y reversión |
| `scripts/lib/importar-snii.test.ts` (nuevo) | 25 pruebas con datos ficticios |
| `scripts/importar-snii.ts` (nuevo) | CLI `simular`, `aplicar --confirmo` y `revertir <bitácora> --confirmo` |
| `scripts/lib/datos-reales.ts` y `.test.ts` | `leerTablaPaquete2027(nombre)`, que lee cualquier tabla del paquete con la misma comprobación de carpeta ignorada; 2 pruebas |
| `package.json` | `importar:snii:simular`, `:aplicar` y `:revertir` |
| `docs/IMPORTACION_DATOS_REALES.md` | Sección nueva, sin nombres, con la advertencia del impacto de D-284 |

Siete archivos, +943 / −5 líneas. Sin esquema, migración ni dependencias. No toca `src/`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 132 archivos, **1594 pruebas** (27 nuevas). Una corrida completa falló una prueba ajena (`src/app/convocatorias/carga/procesamiento.test.ts`, «guarda en bloques de 1,000 renglones»); pasa sola y pasó en la segunda corrida completa: parece inestable bajo carga |
| `npm run lint` y `npx prisma validate` | Correctos |
| `npm run typecheck` | Falla **solo localmente** por el `.ts` del paquete de datos; excluyendo `datos-reales/`, `tsc --noEmit` pasa limpio (igual que en #361 y #363) |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| `simular` en la base compartida | 157 periodos · **22 a crear** (Nivel 1 por iniciar 19, Nivel 1 vigente 1, Nivel 2 por iniciar 2) · 135 omitidos: 112 sin tipo de participación, 10 sin CVU en la base, 10 fuera de la base, 3 sin código UdeG |

## 3. Pruebas con dientes

Se rompió el código a propósito en tres sitios y se corrió el archivo de pruebas (cada vez se restauró desde una copia y se comprobó que quedara idéntico):

| Error introducido | Pruebas que fallaron |
|---|---|
| Quitar la regla de traslape (`hayTraslape`) | 2 |
| Quitar la validación del formulario (incluye D-225, Candidato con Renovación) | 3 |
| Quitar la exigencia de CVU en la base | 1 |

## 4. Lo que se leyó y está bien

- Solo se carga un periodo con tipo de participación conocido (D-284): `INGRESO`, `PROMOVIDO` y «se mantuvo» con participación en 2026. La estrategia de inferir existe en la lógica pura, solo para pruebas, y está probada.
- Se aplican las mismas reglas del formulario (`reconocimientoSnii`): Candidato con Renovación rechazado con el mensaje en español, fechas válidas y fin posterior al inicio. Los traslapes se revisan contra la base y dentro del lote.
- **El script nunca escribe el CVU:** valida con el que el profesor ya tiene en la base.
- `aplicar` corre en una sola transacción; la bitácora se valida con Zod y mensajes en español.
- `revertir` borra con `id`, `profesorId`, `nivel`, `inicio`, `fin` y `convocatoriaId: null` en cada `WHERE`: no borra un resultado oficial (D-107) ni algo que alguien editó.
- La terminal imprime solo conteos y `host:puerto/base` sin credenciales. El nombre de tabla de `leerTablaPaquete2027` solo admite minúsculas y guiones bajos (no se puede salir de la carpeta).
- El resumen explica por qué cada periodo se omite, y los 4 «no aprobado» no se inventan: sin fechas del dictamen no se pueden crear.

## 5. Comentarios

| # | Gravedad | Comentario |
|---|---|---|
| 1 | **Alta (decisión, no código)** | **D-284 deja el listado SNII casi sin vigentes.** Se crearían 22 de 157 periodos y **solo 1 está vigente hoy**; los demás empiezan en 2027. En el paquete, 120 de los 157 periodos están vigentes. Aplicado tal cual, el listado, los reportes y el semáforo mostrarían una cifra muy inferior a la real. D-284 se aprobó por omisión antes de conocer este efecto. Salidas: pedir al cliente el tipo de participación de los periodos que se mantuvieron sin participar en 2026; o una decisión nueva que reemplace a D-284 y permita inferirlo (opción A); o no aplicar F5 hasta resolverlo |
| 2 | Media | **`aplicar` y `revertir` nunca se han ejecutado contra una base real**, y `revertir` borra filas. Lo acotan los `WHERE` y la bitácora, pero conviene probarlo en una base local cuando Docker funcione |
| 3 | Media | De los **10 periodos omitidos por falta de CVU**, el paquete tampoco trae el CVU de 9; **uno sí lo trae** pero la base no lo tiene (probablemente es de las personas que ya estaban antes de F3, fuera de su alcance). Se corrige con Editar en Profesores y una nueva `simular`; hoy ese caso queda fuera sin un aviso especial |
| 4 | Baja | **La precedencia de motivos subestima «sin tipo»**: cada periodo se reporta por el primer motivo que le toca (nivel, profesor, CVU, tipo…). Si se resuelven los CVU y las altas faltantes, más periodos caerán en «sin tipo» (112 hoy). Conviene decirlo al cliente al pedirle el dato |
| 5 | Baja | Un periodo `INGRESO` con estatus `REINCORPORACION_POSDOC` (hay uno) se mapea a `NUEVO_INGRESO`; el enum también tiene `REINGRESO_NO_VIGENTE`. Confirmar si corresponde |
| 6 | Baja | «Ya existe» compara solo profesor e inicio/fin, no el nivel: un periodo existente con otro nivel se cuenta como existente en silencio |
| 7 | Info | La descripción del PR decía «31 nuevas pruebas»; son 27 (25 + 2). Corregido |
| 8 | Info | El estado de cada periodo (vigente / por iniciar / vencido) usa la fecha UTC de hoy; el conteo por nivel y estado cambiará con los días |

## 6. Lo que NO se probó

- `aplicar` y `revertir` contra una base (ni la compartida ni una local), incluido el borrado.
- La idempotencia sobre la base real: solo en la lógica pura.
- El ensayo completo del plan y la verificación del listado SNII y del semáforo en pantalla (casilla de #357).
- No hay pantallas que revisar.

## 7. ¿Qué pasa con los datos al integrar?

**Integrar el PR no cambia ningún dato.** Solo agrega código a `main`; ni el despliegue ni el CI ejecutan los scripts. La base cambia cuando una persona ejecuta `npm run importar:snii:aplicar -- --confirmo` desde su equipo, y entonces crearía **22 reconocimientos** (según la simulación de hoy), de los cuales solo uno está vigente.

Antes de ese `aplicar`: resolver el comentario 1, tener un respaldo fresco, avisar en el chat y hacer una `simular` reciente sin cambios inesperados.

## 8. Pendiente para cerrar

- [ ] Resolver con quien corresponda el impacto de D-284 (comentario 1) antes de aplicar.
- [ ] Aprobación de otra persona del equipo (D-006).
- [ ] Comentarios 2 a 4 atendidos o aceptados.
- [ ] Una persona aplica y se registran los conteos por nivel y estado (sin nombres) en `IMPORTACION_DATOS_REALES.md`, y se verifican el listado SNII y el semáforo.
- [ ] Cerrar #357 después del `aplicar`.
