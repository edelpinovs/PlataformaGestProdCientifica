# Importación de datos reales de profesores

Notas de la validación de los listados reales y del criterio acordado para importarlos. Decisiones D-259 a D-261 en [`DECISIONES.md`](DECISIONES.md).

> Este documento **no lleva nombres ni datos de personas**: el repositorio es público. El detalle con nombres lo genera el comando de validación en una carpeta ignorada por git (`datos-reales/`), para revisarlo con el cliente por otro medio.

## Criterio acordado

1. **Se importa solo lo que no es ambiguo.** Lo ambiguo o inconsistente **se excluye de la importación** y se anota para revisarlo después con el cliente. No se adivina, no se elige «el más probable» y no se corrige a mano en la base.
2. **La exclusión es por campo cuando se puede.** Si el problema está en un identificador (Scopus, Scholar u ORCID), la persona se importa con ese campo vacío. Solo se excluye a la persona completa cuando no se puede identificar sin adivinar (nombre inválido o nombre que no se puede separar en nombres y apellidos).
3. **Los campos obligatorios que el cliente no entregó se guardan como pendientes marcados**, nunca inventados (D-260):
   - `codigo`: `PEND-0001`, `PEND-0002`… (el código real es el de CUValles).
   - `correo`: `pend-0001@pendiente.invalid`.
   - `genero` y `tipoContratacion`: valor `PENDIENTE` (requiere agregarlo a los enums; ver «Pendiente antes de cargar»).
   - Nunca se infiere el género por el nombre.
4. **Todo lo cargado es identificable y reversible**, igual que los datos demo: por el prefijo `PEND-` y el dominio `@pendiente.invalid`. Los datos demo siguen conviviendo con los reales (D-259).

## Archivos de origen

| Archivo | Qué trae | Uso |
|---|---|---|
| Listado completo (`profesores_completo`) | Apellidos, nombres, Scholar ID, URL de Scholar, ORCID y Scopus ID | **Fuente principal** |
| Autores de Scopus (`scopus_authors`) | Nombre en un solo campo, Scopus ID y departamento | Aporta departamento y confirma Scopus ID |
| Listado anterior (`profesores (2)`) | Copia vieja del completo, casi sin Scopus ID y con cientos de filas vacías | **Se descarta** |

Ningún archivo trae código de CUValles, correo, género, tipo de contratación, grado ni división. La columna `CODIGO` del archivo de Scopus está vacía.

## Hallazgos

Observados en la revisión del 2026-11-24. Los conteos exactos los da `npm run importar:validar` (tabla de la sección siguiente).

| Hallazgo | Efecto en la importación | Para revisar con el cliente |
|---|---|---|
| **Scopus ID repetido entre dos personas distintas** (2 casos) | Ese Scopus ID no se asigna a ninguna de las dos personas | Cuál de las dos personas es la dueña del ID |
| **Scholar ID repetido entre dos personas distintas** (2 casos) | Ese Scholar ID no se asigna a ninguna de las dos | Cuál es el perfil correcto de cada una |
| **Personas con varios Scopus ID** (al menos 5: filas repetidas o dos IDs en una celda) | Se importa sin Scopus ID | Cuál es el ID vigente; el sistema guarda uno solo |
| **Scopus ID distinto entre los dos archivos** (al menos 1 caso) | Se importa sin Scopus ID | Cuál es el correcto |
| **Scholar ID con error de Excel `#VALUE!`** (unas dos docenas, con la URL vacía) | Scholar ID vacío; la persona se importa | Perfil de Scholar de cada una |
| **Scholar ID con sufijo de idioma** (`&hl=es`, `&hl=en`) | Se limpia el sufijo y se conserva el ID (no es ambigüedad) | — |
| **Scholar ID de forma inusual** (no termina en `AAAAJ`; al menos 1) | Se importa, queda anotado | Que la persona confirme su perfil |
| **Personas en el archivo de Scopus que no están en el listado completo** (unas 15) | **No se importan**: el nombre viene en un solo campo y no se puede separar en nombres y apellidos sin adivinar (por ejemplo, con cuatro o cinco palabras) | Nombres y apellidos por separado, ORCID y Scholar |
| **Misma persona dos veces en el archivo de Scopus** (nombre en otro orden) | Se fusionan si el ID coincide | — |
| **Filas repetidas en el listado completo** | Se fusionan; si traen valores distintos, ver «varios Scopus ID» | — |
| **Espacios sobrantes, tabuladores, mayúsculas y acentos inconsistentes** en nombres y departamentos | Se limpian (no es ambigüedad) | — |
| **ORCID o Scopus ID vacíos** | Campos opcionales; quedan vacíos | Completar si existe |
| **Departamento solo en el archivo de Scopus** | Quien no aparece ahí queda sin departamento | Departamento de quien falta |
| **Divisiones vacías** en el archivo de Scopus | Sin división | La división de cada departamento |

### Faltantes que impiden una carga «completa»

- **Código de CUValles, correo, género y tipo de contratación:** no vienen en ningún archivo; se guardan como pendientes marcados.
- **Grado científico:** no viene; queda vacío (el campo es opcional).
- **Departamentos:** los de la base son de ejemplo (`DEP-A1`…). Los siete reales del archivo de Scopus deben darse de alta, con su división, antes de asignarlos.
- **Estatus laboral:** no viene; entra como `ACTIVO` (valor por omisión del esquema). Confirmar con el cliente (ver D-246).

## Resultado de la validación

> Se llena con la salida de `npm run importar:validar` sobre los archivos reales. El detalle con nombres queda en `datos-reales/informe-validacion.md` (ignorado por git).

Pendiente de correr: los CSV todavía no están en `datos-reales/`.

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

1. **Migración `PENDIENTE`** en los enums `Genero` y `TipoContratacion` (cambia el esquema compartido: `npm run db:nueva-migracion`). Afecta a Profesores (formularios, validación, exportación), Cuerpos Académicos, PRODEP y Reportes; hay que revisar cada pantalla donde se elige o se cuenta género o contratación para que `PENDIENTE` se vea y se pueda corregir. Avisar al equipo antes (regla de `prisma/schema.prisma`).
2. **Departamentos reales** dados de alta con su división.
3. **Cargador** `scripts/importar-profesores.ts`: simulación por omisión, `--aplicar` para escribir, con las marcas `PEND-` y `@pendiente.invalid`, y comando de conteo y de limpieza con `WHERE` (como `db:demo`).
4. **Revisión con el cliente** de las incidencias de este documento; cada una resuelta se corrige desde la pantalla de Profesores (Editar), no con SQL.

## Después de la carga

- Quitar los datos demo cuando ya no hagan falta: `npm run db:demo:limpiar` (no toca los reales). Ver [`DATOS_DEMO.md`](DATOS_DEMO.md).
- Los cortes del escaneo y las autorías generadas sobre profesores reales **no** se borran con la limpieza de demo: viven en los profesores reales.
- Una carga más grande o periódica desde el panel de administración sería una función nueva (issue propio). Para esta carga única se prefirió el script porque los datos requieren decisiones caso por caso.
