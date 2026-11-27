# Revisión del PR #441: búsqueda por nombre completo en SNII y PRODEP, y apellidos que empiezan con «Total»

Revisión del [PR #441](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/441) de `Grillo-de-Alambre`. Atiende comentarios de las revisiones de los PR ya integrados #433 (Reconocimientos SNII) y #436 (Convocatorias). No cierra issues: lleva `Refs #111` y `Refs #24`.

| Campo | Valor |
|---|---|
| PR | #441 (`Refs #111`, `Refs #24`) |
| Autor | @Grillo-de-Alambre |
| Rama | `fix/M3-M5-ajustes-listados` → `main` |
| Commit revisado | `aad7ef9`, mezclado con `main` (la base del PR estaba al día) |
| Fecha de la revisión | 2026-11-27 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con el cliente de Prisma generado con una URL ficticia. Sin base de datos, sin `next dev` y sin sesión |
| Resultado | **Aprobable con comentarios.** Los tres cambios hacen lo que dicen y las pruebas nuevas son útiles. Queda sin anotar que toca dos módulos con distinta persona responsable, y los dos hallazgos medios de #433 y #436 siguen abiertos (apartado 4) |

**Límite de esta revisión:** la hace un agente a petición de I1. No sustituye la aprobación de una persona del equipo (D-006).

## 1. Alcance

| Comentario atendido | Cambio | Archivos |
|---|---|---|
| #433: «Ana Prueba» no encuentra nada | Función pura `porPalabras`: con dos o más palabras, cada una debe aparecer en algún campo del profesor. La condición se agrega con `OR` a la búsqueda de siempre. SNII la usa con nombres, apellidos, código y CVU; PRODEP, sin CVU | `reconocimientos/busqueda.ts`, `snii-listado.ts`, `prodep.ts` |
| #436: «Totalán» se descarta como fila de totales | `/^total\b/i` pasa a `/^total(?!\p{L})/iu` | `convocatorias/lectura.ts` |
| #436: `NO_SE_GUARDO` vive en `carga.ts` y lo usan otras pantallas | Pasa a `convocatorias/mensajes.ts`; las tres acciones cambian su importación | `convocatorias/carga.ts`, `mensajes.ts` y tres `actions.ts` |

Sin cambios de esquema, migración, dependencias ni `src/components/`. Pruebas nuevas en `busqueda.test.ts`, `snii-listado.test.ts`, `prodep.test.ts` y `lectura.test.ts`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 156 archivos, 1897 pruebas (coincide con el PR) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npx prisma validate` | Correcto |
| CI de GitHub (`verificar`, que además corre `npm run build`) y vista previa de Vercel | Correctos (`verificar` en 2 min 30 s) |
| Mezcla con `main` | Sin conflictos; GitHub la marca `MERGEABLE` |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se revisó y está bien

- **La búsqueda de siempre se conserva.** El criterio por palabras se agrega al `OR` existente, así que lo que antes encontraba una frase completa en un solo campo sigue encontrándose.
- **Con una palabra no cambia nada.** `porPalabras` devuelve `null` y no se agrega ninguna condición; la prueba lo comprueba en SNII.
- **Escape correcto.** Usa `escaparBusqueda`, el mismo de `condicionTexto`: `%`, `_` y `\` no se interpretan como comodines (R5). La longitud sigue acotada por el máximo de 200 caracteres del listado.
- **Ningún nombre de columna llega a la consulta desde la persona.** Solo cambia qué texto se busca en campos fijos.
- **La expresión de «Total» es la correcta.** `(?!\p{L})` con la bandera `u` trata como persona a «Totalán» y «Totalidad», y sigue descartando «TOTAL», «TOTAL SNII» y «Total de…». La prueba incluye además el aviso de la fila de totales.
- **El movimiento de `NO_SE_GUARDO` no deja importaciones rotas.** Las tres acciones importan de `mensajes.ts`, no queda ningún uso en `carga.ts` y `typecheck` lo confirma.
- **Reglas del equipo.** Mensajes en español, datos ficticios en las pruebas, funciones puras con su prueba junto al código, sin dependencias nuevas.

## 4. Hallazgos

### Hallazgo 1 (bajo): toca dos módulos de personas distintas y no dice que se acordó

AGENTS.md pide cambiar solo los archivos del módulo propio y avisar antes de tocar otro. En `src/modules/registry.ts`, `convocatorias` es de `@Grillo-de-Alambre` (autor), pero `reconocimientos` es de `@Ared11`. El PR cambia `snii-listado.ts`, `prodep.ts` y crea `busqueda.ts` dentro de Reconocimientos, y la rama se llama `fix/M3-M5-ajustes-listados`. El cuerpo dice «Queda en M3» pero no que M3 lo haya acordado.

**Qué hacer:** que @Ared11 lo confirme en el PR o en el chat del equipo antes de integrar. Los cambios son pequeños y están probados.

### Hallazgo 2 (informativo): los dos hallazgos medios de #433 y #436 siguen abiertos

El PR se presenta como los «comentarios que quedaron» de #433 y #436, pero no atiende los dos que esas revisiones marcaron como medios:

- **#433, hallazgo 1:** Editar y Eliminar regresan a la página 1 sin la búsqueda ni los filtros.
- **#436, hallazgo 1:** los `catch` nuevos no registran el error, así que una falla de la bitácora no deja rastro.

**Qué hacer:** no es un defecto de este PR. Conviene que su descripción diga que quedan abiertos, o que otro PR los atienda; en `docs/SEGUIMIENTO.md` siguen anotados.

### Detalles menores

- **Las pruebas comprueban la forma del filtro, no su efecto.** Verifican que el `where` contenga `AND` de `OR`; ninguna comprueba qué personas devuelve. En la revisión lo probé con un evaluador en memoria (R1 a R6) y el efecto es el esperado. Una prueba que evalúe el árbol contra datos ficticios daría la misma garantía en el repositorio.
- **Las palabras no ignoran acentos.** «Ana Maria» no encuentra a «Ana María» (R4). Es igual que la búsqueda de una palabra en todos los listados, no lo introduce este PR.
- **Una búsqueda larga crea una consulta grande.** Con 100 palabras de una letra (199 caracteres) el filtro serializado pesa unos 30 KB: cien condiciones sobre la relación del profesor. Es el máximo que permite el listado y no es probable, pero conviene medirlo con la base real.
- **PRODEP no busca por CVU,** porque ese listado tampoco lo hacía; es coherente con el filtro actual.

## 5. Pruebas de revisión

Archivo temporal `src/modules/reconocimientos/_revision441.test.ts`, borrado después. Evalúa el `where` real de `filtroSnii` y `filtroProdep` contra tres personas ficticias (Ana María Prueba Ficticia, Ana López, Luis Prueba) con un evaluador en memoria de los operadores `OR`, `AND` y `contains`.

| # | Búsqueda | SNII | PRODEP | Esperado |
|---|---|---|---|---|
| R1 | «Ana Prueba» y «prueba ana» (orden invertido) | Solo Ana María Prueba | Igual | Correcto |
| R2 | «Ana María Prueba» (tres palabras) | Solo Ana María Prueba | Igual | Correcto |
| R3 | «ana   prueba» (espacios de más) y «Ana 9990001» (nombre y código) | Solo Ana María Prueba | Igual | Correcto |
| R4 | «Ana Maria» (sin acento) | Nadie | Nadie | Igual que antes: la búsqueda no ignora acentos |
| R5 | «%» y «Ana %» | Nadie | Nadie | Correcto: el `%` se busca literal |
| R6 | «Luis López» (palabras de dos personas distintas) | Nadie | Nadie | Correcto: cada palabra debe estar en la misma persona |
| R7 | «9990001 111» (código y CVU) | Encuentra | Nadie | Correcto: solo SNII tiene CVU |
| R8 | 100 palabras de una letra (199 caracteres) | Sin error; filtro de unos 30 KB | — | Aceptable |

## 6. Lo que no se probó

- **El navegador y la sesión real.** El PR declara que probó contra la base compartida; yo no abrí las pantallas ni consulté la base.
- **Rendimiento** de la consulta con la base real y muchas palabras (apartado 4).
- **`npm run build`** local.
- **Límite de esta revisión:** no es una revisión independiente. La aprobación en GitHub debe darla otra persona del equipo (D-006).
