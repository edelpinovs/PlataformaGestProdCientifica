# Revisión del PR #445: correo electrónico y CVU en la exportación de Reportes (#261)

Revisión del [PR #445](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/445) de `layon-king` (I8, módulo M7 Reportes). Cierra [#261](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/261), que pide incluir el correo y el CVU en la exportación de reportes y deja abierta una duda de privacidad: ¿para todos los roles o solo Coordinación?, ¿en todos los reportes o en cuáles? (D-238 y D-231).

| Campo | Valor |
|---|---|
| PR | #445 (`Closes #261`) |
| Autor | @layon-king (I8) |
| Rama | `feat/M7-261-correo-cvu` → `main` |
| Commit revisado | `400ec0a`, mezclado con `main` en `c24fca5` (hay un conflicto en `docs/DECISIONES.md`, hallazgo 5) |
| Fecha de la revisión | 2026-11-27 |
| Revisó | Claude Code, a petición de @edelpinovs (I1) |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con el cliente de Prisma generado con una URL ficticia. Sin base de datos, sin `next dev` y sin sesión |
| Resultado | **Aprobable con comentarios.** El código está bien hecho y probado, pero toca datos personales: las dos columnas salen **por omisión**, los correos de los profesores reales cargados son marcadores y la decisión de privacidad la tomó quien escribe el PR. Conviene resolver los hallazgos 1 a 3 antes de integrar |

**Límite de esta revisión:** la hace un agente a petición de I1. No sustituye la aprobación de una persona del equipo (D-006).

## 1. Alcance

| Dónde | Cambio | Archivos |
|---|---|---|
| Vigencias | Columnas `correo` y `cvu`; en un cuerpo académico dicen «No aplica» | `vigencias.ts`, `cargar-vigencias.ts` |
| Matriz de acreditación | Columnas `correo` y `cvu` | `matriz.ts`, `cargar-matriz.ts` |
| Reporte completo | Columnas `correo` y `cvu` dentro del grupo «Directorio» | `completo.ts`, `cargar-completo.ts` |
| Valores vacíos | «Sin correo» y «Sin CVU» | `vigencias.ts` |
| Convocatoria anual | No cambia: agrupa por departamento y género | — |
| Exportación | Excel y PDF toman los encabezados y valores de las mismas columnas, sin cambios en `exportar.ts` | — |
| Decisión | D-253 pasa a «reemplazada por D-303» y se agrega D-303 | `docs/DECISIONES.md` |
| Pruebas | Valores de columna en tres módulos, exportación de vigencias y una prueba de la ruta | `*.test.ts`, `reportes/exportar/route.test.ts` |

Sin cambios de esquema, migración ni dependencias. La exportación de Profesores no cambia (D-238).

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 157 archivos, 1905 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos, sobre la rama sin mezclar |
| Mezcla con `main` | **Conflicto** en `docs/DECISIONES.md`: el #442 agregó D-302 en la misma línea donde este PR agrega D-303. Lo resolví conservando las dos filas para probar |
| `npm run build` local | **No lo corrí** (lo cubre el CI) |

## 3. Lo que se revisó y está bien

- **La ruta sigue protegida.** `GET` de `reportes/exportar` empieza con `requireModulo("reportes")` y el módulo solo admite ADMINISTRADOR y COORDINADOR. La prueba nueva comprueba que el permiso se exige antes de armar el archivo.
- **La convocatoria anual queda fuera**, como dice D-303: no tiene filas por persona.
- **Un cuerpo académico no inventa datos.** Dice «No aplica» en lugar de dejar el correo o el CVU vacíos, y la prueba de exportación lo comprueba.
- **Los valores vacíos se explican.** `correo` y `cvu` con espacios o nulos salen como «Sin correo» y «Sin CVU».
- **El ordenamiento y la búsqueda en pantalla** incluyen las columnas nuevas (`valorOrdenable`, `textoColumna`), así que no hay columnas que se vean pero no se ordenen.
- **Solo datos ficticios** en las pruebas (`@demo.invalid`, CVU de seis dígitos inventados). La exportación de Profesores sigue sin CVU.
- **Reglas del equipo.** Cambios dentro de `src/modules/reportes/`, mensajes en español, `Closes #261` y decisión registrada con su fila.

## 4. Hallazgos

### Hallazgo 1 (medio): una decisión de privacidad que el issue pedía al equipo la toma el autor

El #261 conserva la etiqueta `pendiente`, no tiene comentarios y pide «Alcance y roles acordados y registrados en `docs/DECISIONES.md`». D-253 explicaba por qué estaba abierto: el CVU es un dato personal sensible, D-238 lo excluyó de Profesores y D-231 advierte que un expediente completo es delicado. D-303 la cierra como `vigente` con «lo define @layon-king (I8)», con el argumento de que el módulo ya está limitado a administración y coordinación.

El argumento es razonable, pero el issue preguntaba exactamente eso al equipo o al cliente. Es la misma situación que se señaló en el #442 (D-302) y con D-299.

**Qué hacer:** confirmar con el equipo o con el cliente que el CVU y el correo van en los tres reportes para ambos roles, dejarlo dicho en el issue, quitar la etiqueta `pendiente` y, si no se confirma, dejar D-303 en `pendiente`.

### Hallazgo 2 (medio): las dos columnas salen por omisión, en pantalla y en las descargas

`leerSeleccion` y `leerColumnas` devuelven **todas** las columnas cuando la URL no trae `columnas`, y `enlaceReporte`, `enlaceMatriz` y `enlaceCompleto` omiten el parámetro cuando están todas. Con el PR, abrir Vigencias, la matriz o el reporte completo sin tocar nada muestra el correo y el CVU de todos, y lo mismo pasa con los enlaces del inicio, de Calidad de datos y de Administración (`/reportes?semaforo=…`) y con la descarga directa. Se pueden quitar, pero hay que saber hacerlo.

El issue pide que la exportación *pueda* incluirlos; D-303 dice «cuando están elegidas». Para un dato que D-238 excluyó por privacidad, lo prudente es lo contrario: que estén apagadas y se enciendan a propósito.

**Qué hacer:** que `correo` y `cvu` no entren en la selección por omisión (al menos el CVU) y se activen al marcarlas. Hay que ajustar los enlaces que omiten `columnas` cuando están todas y sus pruebas.

### Hallazgo 3 (medio): los correos de los profesores cargados son marcadores y saldrán como si fueran reales

Los 122 profesores importados con el flujo de datos reales tienen un correo de marcador `pend-0001@pendiente.invalid` (D-262). Con este PR, el Excel y el PDF de las tres pantallas los traerán en la columna «Correo electrónico» sin ninguna señal de que son provisionales. Quien reciba el archivo puede intentar escribir a esas direcciones o creerlas las del profesor. Con el CVU el problema no existe, porque vacío sale «Sin CVU».

**Qué hacer:** tratar el dominio `@pendiente.invalid` como «Pendiente» (o «Sin correo») al armar la fila. El dominio es una constante del importador (`scripts/lib/cargar-profesores.ts`); `src/` no puede importar de `scripts/`, así que habría que definirla también en el módulo, con su prueba.

### Hallazgo 4 (bajo): en el PDF el correo se parte a mitad de palabra y, con muchas columnas, se corta

Probé `generarPdf` con un correo ficticio de 38 caracteres:

| Reporte | Columnas | Cómo queda el correo en el PDF |
|---|---|---|
| Vigencias | 9 | Una línea, partida: `persona.ficticia.larga@alumnos.u` y el resto debajo |
| Matriz | 11 | Dos líneas, partidas a mitad de palabra: `persona.ficticia.larga@a` / `lumnos.udg.mx` |
| Reporte completo | 21 | Tres líneas y la tercera termina en **`lumnos.ud...`**: el final del correo se pierde |

Con las columnas por omisión (hallazgo 2) el PDF del reporte completo ya sale con el correo truncado. El Excel no tiene el problema. Los encabezados y el departamento también se truncan en ese PDF, así que no lo introduce este PR, pero el correo es un dato que no admite cortes.

**Qué hacer:** si se mantiene el correo en el PDF del reporte completo, dar ancho a esa columna o partir el correo por `@` y puntos; o avisar en el archivo que el Excel trae el dato completo.

### Hallazgo 5 (bajo): conflicto con `main` en `docs/DECISIONES.md`

El #442 se integró y agregó D-302 al final de la tabla; este PR agrega D-303 en el mismo lugar. Hay que mezclar `main` y conservar las dos filas (así lo hice para probar).

De paso, `main` ya trae duplicado el comentario de `enlaceReporte` en `vigencias.ts` (dos líneas `/** Conserva distinciones… */`, una todavía dice «semáforo»): quedó de la resolución del conflicto del #442. No es de este PR, pero conviene quitar la línea sobrante cuando se toque el archivo.

### Detalles menores

- **Lógica repetida.** `textoCorreo` y `textoCvu` viven en `vigencias.ts`, pero `matriz.ts` y `completo.ts` repiten `?.trim() || SIN_…` en línea. Una sola función compartida evitaría que una cambie sin la otra (y facilitaría el hallazgo 3).
- **La prueba de la ruta es débil.** Comprueba que `requireModulo` rechaza y que el módulo tiene dos roles, pero no que la exportación lleve `correo` y `cvu` (eso lo cubre solo la prueba de `tablaVigencias`; para matriz y completo no hay prueba de exportación).
- **El plan de pruebas del PR** está en inglés y sin marcar, salvo `npm test`, lint y typecheck; no se revisó en pantalla.
- **Sin constancia de la descarga.** El archivo con correo y CVU de todo el padrón se genera sin dejar registro en la bitácora. No lo pide el issue, pero encaja con la auditoría de más módulos (#277).

## 5. Pruebas de revisión

Archivo temporal `src/modules/reportes/_revision445.test.ts`, borrado después. Llama a `generarPdf` con tablas de datos ficticios (un correo de 38 caracteres, CVU de seis dígitos) y lee del PDF las líneas de texto dibujadas.

| # | Caso | Resultado |
|---|---|---|
| R1 | PDF de Vigencias con las 9 columnas | Correo en una línea, partido por el ancho de la columna, completo |
| R2 | PDF de la matriz con las 11 columnas | Correo en dos líneas, partido a mitad de palabra, completo |
| R3 | PDF del reporte completo con las 21 columnas | Correo en tres líneas y el final truncado con `...` → hallazgo 4 |
| R4 | Lectura del código de las columnas por omisión (`leerSeleccion`, `leerColumnas`) | Sin `columnas` en la URL, entran todas → hallazgo 2 (leído en el código; no lo vi en pantalla) |

## 6. Lo que no se probó

- **El navegador.** No abrí Vigencias, la matriz ni el reporte completo, ni vi las columnas nuevas en tema claro, oscuro y celular. Dos columnas más hacen más ancha una tabla que ya se apila en celular.
- **El Excel y el PDF con datos reales** ni la descarga con sesión. El hallazgo 2 sale de leer el código, no de ver la pantalla.
- **Los correos reales de los profesores** (los hallazgos 3 y 4 usan datos ficticios y el dominio documentado del marcador).
- **`npm run build`** local.
- **Límite de esta revisión:** no es una revisión independiente. La aprobación en GitHub debe darla otra persona del equipo (D-006).
