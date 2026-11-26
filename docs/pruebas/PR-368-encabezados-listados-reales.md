# Revisión del PR #368: el lector de listados reconoce los encabezados de SNII y PRODEP de la Coordinación (#355)

Revisión del [PR #368](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/368) de `Grillo-de-Alambre` (I5, responsable del módulo Convocatorias), rama `feat/M5-RF-017-encabezados-listados-reales` → `main`. Lleva `Closes #355` («Convocatorias: reconocer los encabezados de los listados reales SNII y PRODEP»). Amplía el lector de RF-017 (`lectura.ts`) para que lea `CÓDIGO UdeG`, `Inicio vigencia` / `Fin vigencia`, `APELLIDOS` en una sola columna, `NIVEL SNII [año]` y `RESULTADO [en convocatoria] [año]`, con la regla de que **el resultado manda** sobre el nivel anterior.

| Campo | Valor |
|---|---|
| PR | #368 · issue #355 |
| Autor | @Grillo-de-Alambre |
| Commit revisado | `c478900` (la rama sale de un `main` anterior; GitHub la marca `MERGEABLE`) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24): el PR en una carpeta aparte (`git worktree`) con el cliente de Prisma regenerado. Sin base de datos, sin Storage y sin archivos de `datos-reales/` (no hay ningún `.xlsx` en esta copia) |
| Resultado | **Aprobable con comentarios.** Cumple el issue y las pruebas pasan, pero la regla «el resultado manda» es más amplia de lo pedido y las filas de totales del listado real se leerían como personas |

Esta revisión la hace un agente que trabaja para I1 sobre código de otra persona; no sustituye la aprobación de otra persona del equipo (D-006).

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/convocatorias/lectura.ts` | Nuevos encabezados (`CODIGO UDEG`, `INICIO VIGENCIA`, `FIN VIGENCIA`, `APELLIDOS` en el paterno); columna `resultado`; `PATRONES` con año para `NIVEL SNII` y `RESULTADO`; en `mapearColumnas`, si hay `resultado`, `nivel` pasa a ser esa columna |
| `src/modules/convocatorias/lectura.test.ts` | 8 casos nuevos con encabezados reales y personas, CVU y códigos ficticios |
| `src/modules/convocatorias/README.md` | Sección «Lectura de listados (RF-017)» con el criterio |

Tres archivos, +116 / −6 líneas. Sin esquema, migración, dependencias ni cambios a `src/lib/`, `src/components/` o `prisma/`. No toca otros módulos.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 131 archivos, **1575 pruebas** (coincide con la descripción) |
| `npm run lint`, `npm run typecheck` y `npx prisma validate` | Correctos |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Prueba de solo lectura con los `.xlsx` reales (último punto del issue) | **No se pudo correr**: `datos-reales/` no tiene esos archivos en esta copia. Tampoco la corrió la autora |

## 3. Lo que se leyó y está bien

- **Cubre lo pedido:** todos los encabezados de la lista del issue, `APELLIDOS` guardado en `apellidoPaterno` con el criterio documentado, y el resultado por encima del nivel anterior con prueba.
- **Los patrones con año son estrictos:** `^NIVEL SNII(?: \d{4})?$` y `^RESULTADO(?: EN CONVOCATORIA)?(?: \d{4})?$` no aceptan «Resultado final», «Nivel SNII anterior» ni «INICIO VIGENCIA UdeG» (las pruebas lo comprueban).
- **Nada que hoy se reconocía deja de reconocerse** para los formatos anteriores: solo se agregan nombres y patrones, y las pruebas existentes siguen en verde.
- **Sin datos reales:** las pruebas usan personas, CVU y códigos ficticios; la descripción lo dice y no hay archivos de `datos-reales/` en el cambio.
- **Resultado vacío:** con CVU o código, la persona se lee sin nivel y con aviso; no toma el nivel anterior (probado).

## 4. Pruebas de revisión (solo lectura, encabezados y personas ficticios)

Script temporal que llama a `interpretarListado` (se borró después):

| Caso | Resultado |
|---|---|
| `NIVEL OTORGADO` + una columna `RESULTADO` con «Aprobado» | El nivel pasa a ser el de `RESULTADO`: «Aprobado» no se reconoce y la persona queda **sin nivel**, con aviso, aunque `NIVEL OTORGADO` traía «II» |
| `APELLIDOS`, `NOMBRES`, `NIVEL SNII 2026`, `RESULTADO 2026`, **sin CVU ni código**, resultado vacío | La persona con resultado vacío **desaparece sin aviso** (el filtro de «no es una persona» exige CVU, código o nivel) |
| Con CVU, filas al final «TOTAL SNII … 12» y «Total candidatos … 4» en la columna de apellidos y el resultado | **Se leen como personas** (4 renglones en vez de 2), con avisos «no se reconoce el nivel «12»» |
| Filas de totales sin texto en apellidos (`["","","","Total","12"]`) | Se descartan bien |
| Dos columnas de nivel con año (`NIVEL SNII 2026` y `NIVEL SNII 2027`) | Gana la primera (2026); no se avisa de la segunda |
| PRODEP con `CÓDIGO UdeG`, `APELLIDOS`, `NOMBRE(S)`, `Inicio vigencia`, `Fin vigencia` | Correcto: lee persona, código y vigencia |

## 5. Hallazgos

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Media | **Las filas de totales del listado SNII se leerían como personas.** Es el punto abierto que la autora ya menciona: al reconocer `APELLIDOS`, un renglón «TOTAL …» con un número en la columna de resultado pasa el filtro y aparece como persona sin nivel (en mi simulación, 2 de 4 renglones eran totales). Hay que confirmarlo con los archivos reales y, si pasa, descartar los renglones cuyo apellido empiece por «Total» o cuyo nivel sea solo un número |
| 2 | Media | **«El resultado manda» es más amplio de lo pedido.** El issue lo limita a cuando el archivo trae «nivel anterior y resultado»; el código lo aplica siempre que exista una columna `RESULTADO`, incluso si hay `NIVEL OTORGADO` explícito. Un archivo con `NIVEL OTORGADO` más un `RESULTADO` de otro tipo («Aprobado», «Pendiente») pierde el nivel. Conviene aplicar el cambio solo si la columna de nivel es la del año o `NIVEL SNII` (no `NIVEL OTORGADO`) |
| 3 | Menor | Con resultado vacío y **sin CVU ni código** en el archivo, el renglón se descarta sin aviso, aunque el PR dice que queda «con aviso». Con CVU o código sí funciona. Añadir la prueba de ese caso o ajustar el texto |
| 4 | Menor | Con dos columnas de nivel con año se toma la primera sin avisar. Si el archivo trae `NIVEL SNII 2026` y `NIVEL SNII 2027`, lo normal es que el otorgado sea el de la convocatoria nueva |
| 5 | Hecho el 2026-11-26 | La prueba de solo lectura con los `.xlsx` reales se corrió después de integrar el PR; resultado en la sección 7. Con esos archivos el hallazgo 1 **no se reprodujo**, pero el código sigue sin filtrar filas de totales |
| 6 | Media | **Con el Perfil Deseable real, 22 de 128 renglones se descartan sin aviso** (sin código ni resultado; solo traen nombre y fechas). Es el hallazgo 3 con datos reales. Ver sección 7 |

## 6. Dictamen

**Aprobable con comentarios.** Puede integrarse cuando otra persona del equipo lo apruebe y se haya corrido la prueba con los archivos reales (hallazgo 5). Conviene corregir antes los hallazgos 1 y 2; el 3 y el 4 son menores.

## 7. Prueba de solo lectura con los `.xlsx` reales (2026-11-26)

La hizo Claude Code a petición de @edelpinovs (I1), **después de que el PR se integrara**, con los tres archivos de `datos-reales/pgpc-2027/data/ingesta/`. Un comando temporal de `npx tsx` (no se guardó en el repo) pasó cada archivo por `filasDeExcel` y `interpretarListado`, el mismo camino que la pantalla de carga. No usó la base, Storage ni la pantalla de carga, y solo se anotan conteos y categorías, sin nombres.

| Archivo | Programa | Resultado |
|---|---|---|
| Listado SNII | SNII | **Se acepta.** 135 renglones (los 135 de datos), 118 con CVU, 135 con vigencia y 135 con apellidos. Por nivel: Candidato 33, Nivel 1 87, Nivel 2 11 y 4 sin nivel con aviso «no se reconoce el nivel» (los 4 con resultado vacío; el estatus del mismo archivo trae 4 «No aprobado») |
| Perfil Deseable | PRODEP | **Se acepta, pero lee 106 de 128 renglones de datos y no avisa de los 22 que faltan.** De los 106: 98 con código y 98 con vigencia |
| Cuerpos académicos | — | No es un listado de convocatoria: el lector no encuentra filas. Fuera del alcance de M5 |

Qué confirma y qué no:

- Los encabezados `APELLIDOS`, `NIVEL ANTERIOR 2026`, `RESULTADO EN CONVOCATORIA 2026`, `INICIO` y `FIN` se reconocen, y el resultado manda sobre el nivel anterior (el nivel sale de la columna de resultado, con `C`, `I` y `II`).
- **Hallazgo 1 (filas de totales):** en este archivo no aparece. Hay 135 renglones leídos para 135 filas de datos, así que ninguna fila de totales se coló como persona. El comportamiento del código no cambió: otro archivo con totales en la zona de datos sí los leería como personas.
- El archivo de Perfil Deseable trae las columnas `TIPO SOLICITUD` y `RESULTADO`: **`TIPO SOLICITUD` está vacío en los 128 renglones** y `RESULTADO` trae «Aprobada» en 30 (98 vacíos). Confirma que el Excel no resuelve P8 (D-285).
- **Hallazgo nuevo (6, media): 22 de los 128 Perfiles se descartan sin aviso.** `interpretarListado` descarta el renglón que no trae ninguna de las columnas que identifican a la persona (CVU, código o resultado), y en este archivo hay 22 personas con nombre y fechas, sin código y sin resultado. Es el mismo mecanismo del hallazgo 3, ahora con datos reales: quien cargue este listado verá 106 renglones sin ningún aviso de que faltan 22. Conviene avisar de los renglones descartados o contarlos en el resumen.
- Quedan sin atender los hallazgos 2, 3, 4 y 6 de la revisión.
