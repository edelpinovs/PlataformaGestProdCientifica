# Importación de datos reales de profesores

Notas de la validación de los listados reales y del criterio acordado para importarlos. Decisiones D-259 a D-261 en [`DECISIONES.md`](DECISIONES.md).

> Este documento **no lleva nombres ni datos de personas**: el repositorio es público. El detalle con nombres lo genera el comando de validación en una carpeta ignorada por git (`datos-reales/`), para revisarlo con el cliente por otro medio.

## Criterio acordado

1. **Se importa solo lo que no es ambiguo.** Lo ambiguo o inconsistente **se excluye de la importación** y se anota para revisarlo después con el cliente. No se adivina, no se elige «el más probable» y no se corrige a mano en la base.
2. **La exclusión es por campo cuando se puede.** Si el problema está en un identificador (Scopus, Scholar u ORCID), la persona se importa con ese campo vacío. Solo se excluye a la persona completa cuando no se puede identificar sin adivinar (nombre inválido o nombre que no se puede separar en nombres y apellidos).
3. **Los campos obligatorios que el cliente no entregó se guardan como pendientes marcados**, nunca inventados (D-260, ajustado por D-262):
   - `codigo`: `PEND0001`, `PEND0002`… (el código real es el de CUValles).
   - `correo`: `pend-0001@pendiente.invalid`.
   - `genero` y `tipoContratacion`: valor `PENDIENTE` (agregado a los enums, D-261; ver «Estado de la carga a la base»).
   - Nunca se infiere el género por el nombre.
4. **Todo lo cargado es identificable y reversible**, igual que los datos demo: por el prefijo `PEND` y el dominio `@pendiente.invalid`. Los datos demo siguen conviviendo con los reales (D-259).

## Archivos de origen

| Archivo | Qué trae | Uso |
|---|---|---|
| Listado completo (`profesores_completo`) | Apellidos, nombres, Scholar ID, URL de Scholar, ORCID y Scopus ID | **Fuente principal** |
| Autores de Scopus (`scopus_authors`) | Nombre en un solo campo, Scopus ID y departamento | Aporta departamento y confirma Scopus ID |
| Listado anterior (`profesores (2)`) | Copia vieja del completo, casi sin Scopus ID y con cientos de filas vacías | **Se descarta** |

Ningún archivo trae código de CUValles, correo, género, tipo de contratación, grado ni división. La columna `CODIGO` del archivo de Scopus está vacía.

## Hallazgos

Conteos confirmados con `npm run importar:validar` el 2026-11-24 (tabla de la sección siguiente).

| Hallazgo | Efecto en la importación | Para revisar con el cliente |
|---|---|---|
| **Scopus ID repetido entre dos personas distintas** (2 casos) | Ese Scopus ID no se asigna a ninguna de las dos personas | Cuál de las dos personas es la dueña del ID |
| **Scholar ID repetido entre dos personas distintas** (2 casos) | Ese Scholar ID no se asigna a ninguna de las dos | Cuál es el perfil correcto de cada una |
| **Personas con varios Scopus ID** (6: 4 con filas repetidas, 1 con dos IDs en una celda y 1 con IDs distintos entre los dos archivos) | Se importa sin Scopus ID | Cuál es el ID vigente; el sistema guarda uno solo |
| **Scopus ID distinto entre los dos archivos** (1 caso; se cuenta dentro de «varios Scopus ID») | Se importa sin Scopus ID | Cuál es el correcto |
| **Scholar ID con error de Excel `#VALUE!`** (19, con la URL vacía) | Scholar ID vacío; la persona se importa | Perfil de Scholar de cada una |
| **Scholar ID con sufijo de idioma** (`&hl=es`, `&hl=en`) | Se limpia el sufijo y se conserva el ID (no es ambigüedad) | — |
| **Scholar ID de forma inusual** (no termina en `AAAAJ`; 1 caso) | Se importa, queda anotado | Que la persona confirme su perfil |
| **Personas en el archivo de Scopus que no están en el listado completo** (14) | **No se importan**: el nombre viene en un solo campo y no se puede separar en nombres y apellidos sin adivinar (por ejemplo, con cuatro o cinco palabras) | Nombres y apellidos por separado, ORCID y Scholar |
| **Misma persona dos veces en el archivo de Scopus** (nombre en otro orden) | Se fusionan si el ID coincide | — |
| **Filas repetidas en el listado completo** | Se fusionan; si traen valores distintos, ver «varios Scopus ID» | — |
| **Espacios sobrantes, tabuladores, mayúsculas y acentos inconsistentes** en nombres y departamentos | Se limpian (no es ambigüedad) | — |
| **ORCID o Scopus ID vacíos** | Campos opcionales; quedan vacíos | Completar si existe |
| **Departamento solo en el archivo de Scopus** | Quien no aparece ahí queda sin departamento | Departamento de quien falta |
| **Divisiones vacías** en el archivo de Scopus | Sin división | La división de cada departamento |

### Faltantes que impiden una carga «completa»

- **Código de CUValles, correo, género y tipo de contratación:** no vienen en ningún archivo; se guardan como pendientes marcados.
- **Grado científico:** no viene; queda vacío (el campo es opcional).
- **Departamentos:** los de la base son de ejemplo (`DEP-A1`…). Los seis reales del archivo de Scopus deben darse de alta, con su división, antes de asignarlos.
- **Estatus laboral:** no viene; entra como `ACTIVO` (valor por omisión del esquema). Confirmar con el cliente (ver D-246).

## Resultado de la validación

> Salida de `npm run importar:validar` sobre los archivos reales.

Corrida del 2026-11-24 sobre los archivos entregados por el cliente (el detalle con nombres queda en `datos-reales/informe-validacion.md`, ignorado por git).

| Concepto | Cantidad |
|---|---|
| Filas con datos en el listado completo | 129 |
| Filas con datos en el archivo de Scopus | 121 |
| Personas distintas en el listado completo | 125 |
| Importables (con los campos ambiguos vacíos) | 125 |
| Excluidas por completo | 14 |
| Importables con al menos un campo excluido | 13 |

| Incidencia | Efecto | Casos |
|---|---|---|
| `solo_en_scopus` | excluye a la persona | 14 |
| `identificador_multiple` (todos de Scopus ID) | excluye el campo | 6 |
| `identificador_repetido` (2 de Scopus ID y 2 de Scholar ID) | excluye el campo en las 2 personas implicadas | 4 |
| `scholar_error_excel` | informativa (Scholar vacío) | 19 |
| `scholar_inusual` | informativa | 1 |
| `persona_repetida` | informativa (se fusionan) | 4 |
| `sin_departamento` | informativa | 19 |
| `nombre_invalido`, `scholar_formato`, `scholar_url_distinta`, `orcid_formato`, `scopus_formato`, `departamento_contradictorio` | — | 0 |

Las 13 personas importables con un campo excluido son 6 con varios Scopus ID y 7 que comparten un Scopus ID o un Scholar ID con otra persona (una de ellas aparece en dos casos). Las 14 excluidas por completo son las que solo aparecen en el archivo de Scopus.

## Cómo se valida

```bash
# 1. Copia los CSV a datos-reales/ (carpeta ignorada por git). Un archivo debe llevar «completo»
#    en el nombre y otro «scopus».
# 2. Valida (solo lee; no toca la base):
npm run importar:validar
# 3. Revisa datos-reales/informe-validacion.md y pega la tabla de conteos (sin nombres) en este documento.
```

El script comprueba que la carpeta esté ignorada por git y se niega a correr si no lo está. En la terminal solo imprime conteos.

El código está en `scripts/validar-profesores.ts` y `scripts/lib/importar-profesores.ts`; la lógica es pura y está probada en `scripts/lib/importar-profesores.test.ts` con datos ficticios.

### Qué hace la validación

- Une las filas del listado completo por nombre (sin acentos, mayúsculas ni orden) y fusiona las repetidas.
- Cruza el archivo de Scopus por nombre. Si un nombre está incompleto en un lado, lo acepta solo si hay un único candidato.
- Aplica las mismas reglas del formulario de Profesores: ORCID `0000-0000-0000-0000`, Scholar ID de 5 a 50 caracteres sin `&` ni `=`, Scopus ID de 4 a 20 dígitos, nombres sin dígitos.
- Deja vacío cualquier identificador con varios valores o repetido entre personas.

## Estado de la carga a la base

**La carga se hizo el 2026-11-24** (resultado abajo). Se hizo en entregas aparte, cada una con su issue y su revisión:

1. **Migración `PENDIENTE`** (aplicada a la base compartida el 2026-11-24; pantallas en el PR #309): agrega `PENDIENTE` a `Genero` y `TipoContratacion` y lo trata así:
   - **No se puede elegir** en ningún formulario: el alta solo ofrece los valores reales y el servidor rechaza `PENDIENTE` con «Selecciona un género.» o «Selecciona el tipo de contratación.».
   - **Se ve como «Pendiente»** en el listado, la exportación y los reportes. En el reporte de convocatoria se cuenta aparte (no se suma a Masculino ni Femenino) y se puede filtrar.
   - **Al editar a una persona con `PENDIENTE`**, el select muestra «Pendiente» (para no guardar otro valor en silencio) y el guardado exige elegir uno real. Por eso, **editar a alguien importado obliga a completar género y contratación**, aunque solo se quiera cambiar otro campo. El código `PEND0001` y el correo `pend-0001@pendiente.invalid` sí pasan la validación del formulario (el código sin guion es válido), así que se pueden reemplazar cuando el cliente entregue los reales, sin que bloqueen otras correcciones (D-262).
   - **No entra a PRODEP ni a Cuerpos Académicos** (requieren tiempo completo) y el mensaje dice que falta registrar la contratación.
2. **Departamentos y divisiones reales** dados de alta, con la división de cada uno (tabla de abajo). **Hechos los seis departamentos y las cuatro divisiones** (2026-11-24).
3. **Cargador** (hecho): ver la sección siguiente.
4. **Revisión con el cliente** de las incidencias de este documento; cada una resuelta se corrige desde la pantalla de Profesores (Editar), no con SQL.

### Resultado de la carga (2026-11-24)

Se ejecutó `npm run importar:aplicar -- --confirmo` en la base compartida, con los CSV del cliente (D-259 a D-262, D-270):

| Concepto | Cantidad |
|---|---|
| Profesores creados | **122** (códigos `PEND0001` a `PEND0122`) |
| Con departamento | 104 |
| Sin departamento (no aparecen en el archivo de Scopus) | 18 |
| Omitidas porque ya existían en la base | 3 |
| Excluidas por aparecer solo en el archivo de Scopus | 14 |
| Importadas con algún identificador excluido por ambigüedad | 13 |

Todos entraron con género y tipo de contratación `PENDIENTE`, estatus `ACTIVO` y correo `pend-0001@pendiente.invalid`.

**Cómo se verificó:** `importar:contar` da 122 (18 sin departamento); una segunda `importar:simular` da 0 a crear y 125 omitidas; y el cliente de Prisma actual lee las 122 filas con `PENDIENTE` sin error. **No se vieron las pantallas en el navegador.**

**Pendiente de completar** (cada punto se corrige desde la pantalla de Profesores, con Editar, no con SQL):

1. Género y tipo de contratación de las 122 personas: los entregará el cliente. Al guardar, el formulario exige elegir un valor real.
2. Código institucional y correo reales (hoy `PEND…` y `@pendiente.invalid`).
3. Departamento de las 18 personas que no aparecen en el archivo de Scopus.
4. Las 14 personas excluidas y las 13 con identificador excluido (ver «Hallazgos»): se revisan con el cliente.
5. Quien tiene la contratación pendiente no cuenta como tiempo completo en PRODEP, Cuerpos Académicos ni en las cifras de tiempo completo de los reportes: esas cifras subestiman hasta completar cada registro.

**Aviso operativo:** un cliente de Prisma anterior al PR #309 fallaría al leer estas filas. Quien tenga código anterior debe hacer `git pull` y `npx prisma generate`. La base compartida también la usa el sitio publicado: estos profesores ya son visibles ahí para quien tenga acceso.

Para revertir lo que nadie ha tocado ni usado: `npm run importar:limpiar`.

### Departamentos y divisiones

Los seis departamentos del listado y sus cuatro divisiones **están dados de alta en la base desde el 2026-11-24** (D-263, D-265, D-267 y D-269). La base conserva además los de ejemplo (`DEP-A1`…, y las divisiones `DIV-A`, `DIV-B` y `DIV-C`). Los nombres de los departamentos coinciden con los del CSV, sin importar acentos ni mayúsculas.

**Divisiones.** La «clave» es la clave interna de la UdeG y es la que se guarda en la base:

| Siglas | Nombre completo | Clave | Estado |
|---|---|---|---|
| CUCEI | Centro Universitario de Ciencias Exactas e Ingenierías | `EI` | Dada de alta (2026-11-24) |
| CUCS | Centro Universitario de Ciencias de la Salud | `SA` | Dada de alta (2026-11-24) |
| CUCSH | Centro Universitario de Ciencias Sociales y Humanidades | `SH` | Dada de alta (2026-11-24) |
| CUCEA | Centro Universitario de Ciencias Económico Administrativas | `EA` | Dada de alta (2026-11-24) |

La clave de centro de trabajo de la SEP (CCT) no tiene campo en el sistema y no se guarda.

**Departamentos:**

| Departamento (como viene en el CSV) | Personas a crear | División | Nomenclatura | Estado |
|---|---|---|---|---|
| Departamento de Ciencias Computacionales e Ingenierías | 21 | CUCEI (`EI`) | `DCCI` | Dado de alta (2026-11-24) |
| Departamento de Ciencias de la Salud | 19 | CUCS (`SA`) | `DCS` | Dado de alta (2026-11-24) |
| Departamento de Ciencias del Comportamiento | 5 | CUCSH (`SH`) | `DCCOM` | Dado de alta (2026-11-24) |
| Departamento de Ciencias Naturales y Exactas | 26 | CUCEI (`EI`) | `DCNE` | Dado de alta (2026-11-24) |
| Departamento de Ciencias Económicas y Administrativas | 13 | CUCEA (`EA`) | `DCEA` | Dado de alta (2026-11-24) |
| Departamento de Ciencias Sociales y Humanidades | 20 | CUCSH (`SH`) | `DCSH` | Dado de alta (2026-11-24) |

El equipo confirmó el nombre y la clave de CUCEA y las seis nomenclaturas (D-265 y D-269). El cliente no dio nomenclaturas oficiales: si las da, se corrigen desde la pantalla de Departamentos (Editar).

#### Alta de divisiones y departamentos

```bash
npm run importar:catalogos:simular                 # qué se crearía y qué choca; no escribe
npm run importar:catalogos:aplicar -- --confirmo   # crea lo que falta
```

- **Aplicada en dos tandas el 2026-11-24:** tres divisiones y tres departamentos; después CUCEA y los tres departamentos restantes. Una simulación posterior no encuentra nada por crear (4 divisiones y 6 departamentos ya existen).
- **Solo crea:** nunca edita ni borra. Se puede repetir: lo que ya existe (sin importar acentos ni mayúsculas) se omite.
- **Si algo choca** (una clave, un nombre o una nomenclatura ya en uso, o un departamento con el mismo nombre en otra división), no escribe nada y lo explica. Se resuelve desde las pantallas del catálogo.
- Usa las mismas validaciones y la misma detección de duplicados que las pantallas de Divisiones y Departamentos, y todo va en una transacción.
- Para deshacerlo, se eliminan desde esas pantallas (que no dejan borrar lo que ya tiene personas asignadas). El código está en `scripts/alta-catalogos-reales.ts` y `scripts/lib/catalogos-reales.ts`; el plan está probado en `scripts/lib/catalogos-reales.test.ts`. **`aplicar` no tiene prueba automática** (escribe en la base compartida): se comprueba con `simular` antes y después.

## El cargador

```bash
npm run importar:simular                  # calcula qué se crearía; no escribe en la base
npm run importar:aplicar -- --confirmo    # crea los profesores en la base compartida
npm run importar:contar                   # cuántos hay con marca de pendiente
npm run importar:limpiar                  # borra lo marcado que nadie ha tocado ni usado
```

- **`simular`** lee la base (profesores y departamentos) para comparar, pero no escribe. Imprime solo conteos y deja el detalle con nombres en `datos-reales/plan-carga.md` (ignorado por git).
- **`aplicar`** se niega a correr si falta la migración de `PENDIENTE`, si faltan departamentos en la base (salvo `--sin-departamento`) o si no se pasa `--confirmo`. Crea todo en una transacción: o entran todos o ninguno.
- **Qué crea:** código `PEND0001…`, correo `pend-0001@pendiente.invalid`, género y contratación `PENDIENTE`, estatus `ACTIVO` (valor por omisión), nombres y apellidos en nombre propio («ABUNDIS GUTIÉRREZ» → «Abundis Gutiérrez») y los identificadores que no estaban en la lista de excluidos.
- **Se puede repetir:** quien ya existe en la base por nombre (sin importar acentos ni mayúsculas) se omite, y la numeración continúa después del `PEND` más alto. Lo omitido no recibe los identificadores del CSV; si hacen falta, se capturan al editar.
- **Si un identificador ya lo tiene otra persona en la base**, se crea a la persona con ese campo vacío y queda anotado.
- **`limpiar`** borra solo a quien conserva el código `PEND` **y** el correo `@pendiente.invalid` y no tiene perfil, programas, reconocimientos, cuerpos académicos, LGAC, participaciones, resultados, autorías ni cortes. Quien ya fue corregido o usado no se toca. Cada borrado lleva su condición.

Código en `scripts/importar-profesores.ts` y `scripts/lib/cargar-profesores.ts`; la parte pura está probada en `scripts/lib/cargar-profesores.test.ts`. **`aplicar` y `limpiar` no tienen prueba automática** porque escriben en la base compartida: se comprueban con `simular` y `contar` antes y después.

## Después de la carga

- Quitar los datos demo cuando ya no hagan falta: `npm run db:demo:limpiar` (no toca los reales). Ver [`DATOS_DEMO.md`](DATOS_DEMO.md).
- Los cortes del escaneo y las autorías generadas sobre profesores reales **no** se borran con la limpieza de demo: viven en los profesores reales.
- Una carga más grande o periódica desde el panel de administración sería una función nueva (issue propio). Para esta carga única se prefirió el script porque los datos requieren decisiones caso por caso.

## Completar los pendientes con los listados 2027 (F3)

Plan en [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](PLAN_IMPORTACION_DATOS_REALES_2027.md) y decisiones D-278 a D-282 en [`DECISIONES.md`](DECISIONES.md). Completa a los profesores `PEND` ya cargados con el paquete de datos 2027 (`datos-reales/pgpc-2027/`, ignorado por git).

```bash
npm run importar:completar:simular                              # calcula el plan; no escribe en la base
npm run importar:completar:aplicar -- --confirmo                # una persona; en una sola transacción, con bitácora
npm run importar:completar:revertir -- <bitácora> --confirmo    # deshace lo que conserva el valor que puso
```

- **Solo llena campos con marcador:** código `PEND…`, correo `@pendiente.invalid`, género o contratación `PENDIENTE`, y grado, departamento o CVU vacíos. Lo que alguien ya editó no se toca.
- **Cruce por nombre:** nombre normalizado exacto y, si no hay, las mismas palabras sin importar el orden. Con 0 o más de 1 coincidencia, o si dos personas cruzan con el mismo registro, no se toca a nadie.
- **Género:** `H→M` y `M→F` (en el Excel `M` es mujer; en el repo `M` es Masculino). Contratación: investigador y docente → tiempo completo; asignatura → asignatura; Técnico Académico, Convenio SECIHTI y otros quedan `PENDIENTE`.
- **Departamento** por nomenclatura (`CCI→DCCI`, `CNE→DCNE`, `CSH→DCSH`, `CEA→DCEA`, `CS→DCS`, `CC→DCCOM`) y **grado** (`DR.`/`DRA.` → `DR`; `MTRO.`/`MTRA.`/`M.C.` → `MTRO`).
- **No toca** el estatus laboral, el goce de sueldo, ORCID, Scopus ni Scholar. Solo usa el correo institucional (no los alternos).
- **Si un código, correo o CVU ya es de otra persona** (o viene repetido en el paquete), ese campo no se escribe, se anota como conflicto y el resto de la persona sí se completa. Cada campo pasa por las mismas reglas del formulario de Profesores.
- Cada actualización solo corre si la persona sigue con los valores leídos; si alguien la editó mientras tanto, se deshace toda la transacción.
- Imprime en la terminal solo conteos y la base a la que se conecta (`127.0.0.1:54322` es el ensayo local). El detalle con nombres queda en `datos-reales/plan-completar.md` y la bitácora en `datos-reales/bitacoras/completar-<fecha>.json`.

Código en `scripts/completar-profesores.ts` y `scripts/lib/completar-profesores.ts`; la parte pura está probada en `scripts/lib/completar-profesores.test.ts` con datos ficticios. **`aplicar` y `revertir` no tienen prueba automática** (escriben en la base compartida): se comprueban con `simular` antes y después.

### Simulación del 2026-11-26 (base compartida, solo lectura)

| Concepto | Cantidad |
|---|---|
| Profesores con código `PEND` | 122 |
| A actualizar | 121 |
| Sin nada que completar | 1 |
| Conflictos | 0 |

| Campo que se completaría | Cantidad |
|---|---|
| código | 112 |
| correo | 121 |
| género | 114 |
| tipo de contratación | 111 |
| grado | 114 |
| departamento | 17 |
| CVU | 111 |

Aún **no se ha aplicado** en la base compartida ni se ha hecho el ensayo local (aplazado). Antes de aplicar: respaldo fresco, aviso en el chat del equipo y una persona que ejecute `aplicar`.

## Alta de los profesores que faltan (F4)

Plan en [`PLAN_IMPORTACION_DATOS_REALES_2027.md`](PLAN_IMPORTACION_DATOS_REALES_2027.md) y decisión P6 (D-283) en [`DECISIONES.md`](DECISIONES.md). Da de alta a las personas del paquete 2027 que **no están en la base**: ingresos SNII, quienes solo aparecen en PRODEP y los integrantes de cuerpos académicos.

```bash
npm run importar:altas:simular                              # calcula el plan; no escribe en la base
npm run importar:altas:aplicar -- --confirmo                # una persona; una sola transacción, con bitácora
npm run importar:altas:revertir -- <bitácora> --confirmo    # borra solo lo que nadie ha tocado ni usado
```

- **Solo se crea a quien tiene código UdeG real y correo institucional.** Quien no los tiene (o trae un código `PEND`) va a `datos-reales/plan-altas.md` para el cliente: no se inventa nada.
- **Quien ya existe no se vuelve a crear:** se compara el nombre normalizado (exacto y, si no, las mismas palabras en otro orden). Un código que ya tiene otra persona con distinto nombre se informa, no se toma por la misma persona.
- **Se omite** a las personas con nombre, código o correo repetidos en el paquete, y a quien choca en código o correo con alguien de la base. Si solo choca el CVU, se crea sin CVU.
- **Campos:** nombres y apellidos en nombre propio; género `H→M` y `M→F`; contratación, grado y departamento con las mismas conversiones de F3 (si no son claras, género y contratación quedan `PENDIENTE`, como en la primera carga). Estatus `ACTIVO` y goce de sueldo sin marcar. **No** escribe ORCID, Scopus ni Scholar.
- Cada alta pasa por las mismas reglas del formulario de Profesores; un dato obligatorio inválido manda a la persona al informe y uno opcional se descarta.
- **Conviene aplicar después de F3**, para que los `PEND` ya tengan su código real: el resumen avisa cuántos `PEND` siguen en la base.
- **`revertir`** borra solo a quien conserva el código y el correo de la bitácora y no tiene perfil, programas, reconocimientos, cuerpos académicos, LGAC, participaciones, resultados, autorías ni cortes (la misma condición de `importar:limpiar`).
- Imprime en la terminal solo conteos y la base a la que se conecta; el detalle con nombres queda en `datos-reales/plan-altas.md` y la bitácora en `datos-reales/bitacoras/altas-<fecha>.json`.

Código en `scripts/altas-profesores.ts` y `scripts/lib/altas-profesores.ts`; la parte pura está probada en `scripts/lib/altas-profesores.test.ts` con datos ficticios. **`aplicar` y `revertir` no tienen prueba automática** (escriben en la base compartida): se comprueban con `simular` antes y después.

### Simulación del 2026-11-26 (base compartida, solo lectura)

| Concepto | Cantidad |
|---|---|
| Registros en el paquete | 181 |
| Con código UdeG real | 133 |
| Ya existen en la base | 125 |
| **A dar de alta** | **10** |
| Omitidos (al informe del cliente) | 46 |
| — sin código UdeG real | 38 |
| — sin correo institucional | 8 |
| Campos opcionales ajustados | 0 |
| Profesores `PEND` que siguen en la base | 122 |

Aún **no se ha aplicado** en la base compartida ni se ha hecho el ensayo local (aplazado).
