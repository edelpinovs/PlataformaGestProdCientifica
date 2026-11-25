# Importación de datos reales de profesores

Notas de la validación de los listados reales y del criterio acordado para importarlos. Decisiones D-259 a D-261 en [`DECISIONES.md`](DECISIONES.md).

> Este documento **no lleva nombres ni datos de personas**: el repositorio es público. El detalle con nombres lo genera el comando de validación en una carpeta ignorada por git (`datos-reales/`), para revisarlo con el cliente por otro medio.

## Criterio acordado

1. **Se importa solo lo que no es ambiguo.** Lo ambiguo o inconsistente **se excluye de la importación** y se anota para revisarlo después con el cliente. No se adivina, no se elige «el más probable» y no se corrige a mano en la base.
2. **La exclusión es por campo cuando se puede.** Si el problema está en un identificador (Scopus, Scholar u ORCID), la persona se importa con ese campo vacío. Solo se excluye a la persona completa cuando no se puede identificar sin adivinar (nombre inválido o nombre que no se puede separar en nombres y apellidos).
3. **Los campos obligatorios que el cliente no entregó se guardan como pendientes marcados**, nunca inventados (D-260, ajustado por D-262):
   - `codigo`: `PEND0001`, `PEND0002`… (el código real es el de CUValles).
   - `correo`: `pend-0001@pendiente.invalid`.
   - `genero` y `tipoContratacion`: valor `PENDIENTE` (requiere agregarlo a los enums; ver «Pendiente antes de cargar»).
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

## Pendiente antes de cargar a la base

La carga **no se ha hecho**. Va en entregas aparte, cada una con su issue y su revisión:

1. **Migración `PENDIENTE`** (aplicada a la base compartida el 2026-11-24; pantallas en el PR #309): agrega `PENDIENTE` a `Genero` y `TipoContratacion` y lo trata así:
   - **No se puede elegir** en ningún formulario: el alta solo ofrece los valores reales y el servidor rechaza `PENDIENTE` con «Selecciona un género.» o «Selecciona el tipo de contratación.».
   - **Se ve como «Pendiente»** en el listado, la exportación y los reportes. En el reporte de convocatoria se cuenta aparte (no se suma a Masculino ni Femenino) y se puede filtrar.
   - **Al editar a una persona con `PENDIENTE`**, el select muestra «Pendiente» (para no guardar otro valor en silencio) y el guardado exige elegir uno real. Por eso, **editar a alguien importado obliga a completar género y contratación**, aunque solo se quiera cambiar otro campo. El código `PEND0001` y el correo `pend-0001@pendiente.invalid` sí pasan la validación del formulario (el código sin guion es válido), así que se pueden reemplazar cuando el cliente entregue los reales, sin que bloqueen otras correcciones (D-262).
   - **No entra a PRODEP ni a Cuerpos Académicos** (requieren tiempo completo) y el mensaje dice que falta registrar la contratación.
2. **Departamentos y divisiones reales** dados de alta, con la división de cada uno (tabla de abajo). Sin esto, `aplicar` se niega a correr.
3. **Cargador** (hecho): ver la sección siguiente.
4. **Revisión con el cliente** de las incidencias de este documento; cada una resuelta se corrige desde la pantalla de Profesores (Editar), no con SQL.

### Departamentos y divisiones

El listado trae **seis** departamentos y ninguno existe todavía en la base, que solo tiene los de ejemplo (`DEP-A1`…, y las divisiones `DIV-A`, `DIV-B` y `DIV-C`). Los nombres deben coincidir con los del CSV, sin importar acentos ni mayúsculas. Las divisiones tampoco están dadas de alta.

| Departamento (como viene en el CSV) | Personas a crear | División | Estado |
|---|---|---|---|
| Departamento de Ciencias Computacionales e Ingenierías | 21 | CUCEI | Confirmada (2026-11-24) |
| Departamento de Ciencias de la Salud | 19 | CUCS | Confirmada (2026-11-24) |
| Departamento de Ciencias del Comportamiento | 5 | CUCSH | Confirmada (2026-11-24) |
| Departamento de Ciencias Naturales y Exactas | 26 | — | **Por confirmar con el cliente** |
| Departamento de Ciencias Económicas y Administrativas | 13 | — | **Por confirmar con el cliente** |
| Departamento de Ciencias Sociales y Humanidades | 20 | — | **Por confirmar con el cliente** |

- Las personas son las que arrojó `npm run importar:simular` el 2026-11-24: 104 de las 122 a crear traen departamento (las otras 18 no aparecen en el archivo de Scopus). Las tres divisiones por confirmar cubren **59 de las 104**.
- **Falta el nombre completo y la clave de cada división** (la base exige ambos: `clave` es única) antes de darlas de alta.
- No se asume ninguna división sin confirmar. Mientras falten, se pueden dar de alta solo los tres departamentos confirmados; `aplicar` seguirá negándose a cargar mientras falte cualquiera de los seis (o hay que usar `--sin-departamento`, que no se recomienda: dejaría a esas personas sin departamento y asignarlas después sería una por una).

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
