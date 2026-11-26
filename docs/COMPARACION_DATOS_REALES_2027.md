# Comparación: paquete de datos reales vs. repositorio PGPC

Revisé el repositorio `edelpinovs/PlataformaGestProdCientifica` en el commit `4923991` (2026-11-25, merge del PR #351): `prisma/schema.prisma`, 15 migraciones, `AGENTS.md`, `docs/DECISIONES.md`, `docs/IMPORTACION_DATOS_REALES.md`, `scripts/lib/*`, y en `src/modules/` los módulos `profesores`, `reconocimientos`, `cuerpos-academicos` y `convocatorias`.

> Este documento **no contiene nombres de personas**, así que puede ir al repositorio si el equipo lo quiere. El resto del paquete sí tiene datos personales y va **solo** en `datos-reales/`, que git ignora (D-259).

## 1. Conclusión

- **El repo ya tiene un modelo maduro y no hay que reemplazarlo.** Mi `schema/schema.sql` y mi `schema/schema.prisma` quedan solo como referencia. Lo que sí sirve son **los datos**: con ellos se pueden completar los campos que hoy están en `PENDIENTE`.
- **El repo cargó 122 profesores el 2026-11-24 con los campos mínimos**: código `PEND0001…`, correo `@pendiente.invalid`, y género y contratación `PENDIENTE`, sin SNII, PRODEP ni CA (D-270). Su "listado completo" coincide con la hoja *Publicaciones* de la Planta SNII (las mismas 19 celdas `#VALUE!` en Scholar, los sufijos `&hl=` y los 2 Scopus ID compartidos). Los Excel nuevos traen justo lo que faltaba: código UdeG, correo, sexo, nombramiento, CVU, grado, vigencias SNII/PRODEP y CA con integrantes.
- **Hay 3 discrepancias que hay que resolver antes de cargar nada**: las divisiones (§3.1), el sentido de la letra `M` en el género (§3.2) y que M5 no reconoce los encabezados de los archivos reales (§3.3).

## 2. Qué coincide

| Aspecto | Repo | Paquete | Comentario |
|---|---|---|---|
| Entidades núcleo | `Division`, `Departamento`, `Profesor`, `ReconocimientoSnii`, `ReconocimientoProdep`, `CuerpoAcademico`, `IntegranteCa`, `Lgac` | Las mismas | Se pueden mapear 1 a 1 (§4) |
| Identificadores únicos | `codigo`, `correo`, `cvu`, `orcid`, `scopusId`, `scholarId` con `@unique` | Revisa duplicados de los mismos campos | Las dos revisiones encontraron los **mismos 2 Scopus ID compartidos** |
| Cruce por nombre | `nombreNormalizado` (sin acentos, minúsculas) | `nkey` (sin acentos, mayúsculas, sin puntuación) + conjunto de palabras | Mismo criterio; el paquete agrega tolerancia a subconjuntos y una similitud ≥ 0.88 |
| Criterio ante ambigüedad | Excluir lo ambiguo, no adivinar, marcar lo pendiente (D-260/D-262) | `requiere_revision` y un reporte de calidad con cada decisión | Filosofía compatible |
| Scholar ID | Se limpia `&hl=…`; `#VALUE!` → vacío | Igual | — |
| Clave del CA | Regex `^\p{L}[\p{L}\d-]{1,19}$` | `UDG-CA-###` | Válida tal cual |
| Líder del CA | Debe ser integrante (RF-014, D-111) | Lo valida y se cumple en los 17 CA | — |
| Traslape de vigencias | `hayTraslape` (D-103) | Cada profesor tiene un registro vigente; el anterior se enlaza con `reemplazado_por_id` | Al cargar, solo el registro vigente se inserta como vigencia (§4.3) |

## 3. Discrepancias críticas

### 3.1 Divisiones: el repo usa Centros Universitarios; los Excel, las divisiones de CUValles

D-263 y D-267 dieron de alta como **divisiones** cuatro Centros Universitarios de la red UdeG: CUCEI `EI`, CUCS `SA`, CUCSH `SH` y CUCEA `EA`. Los Excel oficiales de SNII 2027 y de la Planta 2026 traen la columna **DIVISIÓN** con las **tres divisiones internas de CUValles**, y la agrupación de departamentos **no coincide**:

| Departamento | Repo (D-263/D-267) | Excel oficial (columna DIVISIÓN) |
|---|---|---|
| Ciencias Computacionales e Ingenierías | CUCEI | Estudios Científicos y Tecnológicos |
| Ciencias Naturales y Exactas | CUCEI | Estudios Científicos y Tecnológicos |
| Ciencias Sociales y Humanidades | CUCSH | Estudios Económicos y Sociales |
| Ciencias Económico Administrativas | CUCEA | Estudios Económicos y Sociales |
| Ciencias de la Salud | CUCS | Estudios de la Salud |
| Ciencias del Comportamiento | **CUCSH** | **Estudios de la Salud** |

No solo cambian los nombres: Comportamiento queda con Sociales en el repo y con Salud en el Excel, y Sociales queda sola en el repo pero con Económico Administrativas en el Excel. Cualquier reporte por división (RF-029, la matriz de acreditación) saldría distinto.
**Propuesta:** llevarlo al equipo y a la Coordinación como una decisión nueva que reemplace a D-263/D-267 si se confirma. El cambio sería editar nombres y claves desde *Catálogos › Divisiones* y reasignar los departamentos. No requiere migración.

### 3.2 Género: `M` significa cosas opuestas

- Excel (SNII 2027, columna *Sexo*; layout de ejemplo, columna *Género*): `H` = hombre, `M` = **mujer**.
- Repo (`enum Genero`; `ETIQUETA_GENERO = { M: "Masculino", F: "Femenino" }`): `M` = **masculino**.

Si se copia `M` directo, **todas las mujeres quedarían como Masculino**. Mapeo obligatorio: `H → M` y `M → F`. Mi paquete guarda el valor original (`sexo = H|M`), así que la conversión va en el cargador. Agregaría una prueba Vitest con datos ficticios que lo verifique.

### 3.3 M5 no reconoce los encabezados de los archivos reales

Simulé `claveEncabezado` y `mapearColumnas` de `src/modules/convocatorias/lectura.ts` (la misma normalización y las mismas listas de `ENCABEZADOS`) sobre cada archivo:

| Archivo | Columnas que reconoce | Qué falta |
|---|---|---|
| SNII 2027 (original) | `NOMBRE`, `Fin de vigencia` | **Ningún nivel** (`NIVEL SNII 2026` y `Resultado 2026` no están en la lista, así que la carga SNII **se rechaza**); `CÓDIGO UdeG` se normaliza a `CODIGO UDEG` (no `UDG`); `Inicio vigencia` no está |
| Planta SNII 2026 | `NOMBRE`, `CVU`, `INICIO`, `FIN` | `NIVEL SNII` no está (se rechaza); `CÓDIGO UdeG` |
| Perfil PRODEP 2027 | solo `NOMBRE` | `Inicio vigencia`/`Fin vigencia` no están (la lista tiene `INICIO DE VIGENCIA` y `VIGENCIA INICIO`); el correo no se usa para cruzar |
| Layout de ejemplo · SNII | `CVU`, `NOMBRE(S)`, `INICIO`, `FIN` | `APELLIDOS` (solo acepta paterno y materno por separado); `Resultado en convocatoria 2026` (sin nivel, **se rechaza**) |
| Layout de ejemplo · Perfil Deseable | `CODIGO`, `NOMBRE`, `INICIO`, `FIN` | ✔ funciona |

**Propuesta para el dueño de M5 (en su propio issue):** agregar a `ENCABEZADOS` `CODIGO UDEG`, `NIVEL SNII`, `RESULTADO`, `RESULTADO EN CONVOCATORIA …` (con prefijo), `INICIO VIGENCIA`, `FIN VIGENCIA` y `APELLIDOS`, con su prueba. Los archivos `data/ingesta/*.xlsx` del paquete sirven para probarlo en local; **no van al repo** porque tienen datos reales. Para las pruebas del repo hay que fabricar versiones ficticias con esos mismos encabezados.

## 4. Mapeo de campos: paquete → modelo del repo

### 4.1 Profesor

| Repo (`Profesor`) | Obligatorio | Paquete | Conversión |
|---|---|---|---|
| `codigo` | sí, único | `codigo_udg` (133 de 181) | Reemplaza `PEND####` donde haya coincidencia |
| `nombres`, `apellidos` | sí | `nombres`, `apellidos` | El repo usa nombre propio ("Abundis Gutiérrez"); convertir desde MAYÚSCULAS como lo hace `cargar-profesores.ts` |
| `nombreNormalizado` | sí | — | Lo calcula el repo |
| `correo` | sí, único | `correo_institucional` (157) + `correos_alternos` | Reemplaza `@pendiente.invalid`. Hay `@academicos.udg.mx` y `@valles.udg.mx`; se prefiere el primero |
| `genero` | sí | `sexo` (135) | **`H→M`, `M→F`** (§3.2); sin dato queda `PENDIENTE` |
| `tipoContratacion` | sí | `nombramiento_tipo` | `PROFESOR_INVESTIGADOR`/`PROFESOR_DOCENTE` → `TIEMPO_COMPLETO`; `PROFESOR_ASIGNATURA` → `ASIGNATURA`; `TECNICO_ACADEMICO`, `CONVENIO_SECIHTI`, `OTRO` (coordinador) → **queda `PENDIENTE`** y se consulta con el cliente |
| `estatusLaboral` | sí (por omisión `ACTIVO`) | `reconocimiento_snii.estatus_observacion` | `LICENCIA` → `LICENCIA` (1 caso); `POSDOC_O_INVESTIGADOR_POR_MEXICO` y `REINCORPORACION_POSDOC` → **preguntar** si equivalen a `ESTANCIA_POSDOCTORAL` |
| `goceDeSueldo` | no | — | No viene; queda `false` (D-274) |
| `gradoId` | no | `grado` | `DR.`/`DRA.` → Doctorado (`DR`); `MTRO.`/`MTRA.`/`M.C.` → Maestría (`MTRO`), según el catálogo del seed |
| `departamentoId` | no | `departamento` (clave) | `CCI→DCCI`, `CNE→DCNE`, `CSH→DCSH`, `CEA→DCEA`, `CS→DCS`, `CC→DCCOM` (nomenclaturas de D-265/D-269) |
| `cvu` | no, único | `cvu` (113) | Solo dígitos (D-106); reemplazarlo pide confirmación |
| `orcid`, `scopusId`, `scholarId` | no, únicos | ídem | Mantener las exclusiones que el repo ya aplicó: no reasignar un ID que el repo dejó vacío por ambigüedad |
| — | — | `nombramiento*`, `categoria_contrato`, `adscripcion_externa`, `anio_ingreso_snii`, `verano_delfin`, `fuentes` | **No existen en el repo.** Se usan solo para derivar los campos de arriba |

**Cobertura estimada** sobre los 122 ya cargados (que salieron de la hoja *Publicaciones*): de los 123 profesores del paquete que aparecen en esa hoja, 114 tienen código, 122 correo, 116 sexo y 113 CVU. Su nombramiento da 89 de tiempo completo y 24 de asignatura. La cifra exacta saldrá al cruzar con la base en modo *simular*.

### 4.2 Cuerpos Académicos

| Repo | Paquete | Conversión |
|---|---|---|
| `clave`, `nombre` | ídem | — |
| `nivel` (`EN_FORMACION`/`EN_CONSOLIDACION`/`CONSOLIDADO`) | `nivel_vigente_2027` (`CAEF`/`CAEC`/`CAC`) | Mapeo directo |
| `areaProdep`, `disciplina` | `area_prodep_original`, `disciplina` | Texto libre en el repo; hay 1 incongruencia área↔disciplina (UDG-CA-583) |
| `departamentoId` (obligatorio) | `departamento` | Igual que en Profesor |
| `anioRegistro` | `anio_registro` | — |
| `anioVencimiento` (obligatorio) | `proxima_evaluacion` | El Excel no trae año de vencimiento; *PRÓXIMA EVALUACIÓN* es lo más cercano. **Confirmar** con la Coordinación (D-226 asume que vence el 31/12 de ese año) |
| `liderId` | `lider_profesor_id` | Por código |
| `IntegranteCa` | `ca_integrantes` (estado `ACTIVO`) | **D-108**: el integrante debe ser de tiempo completo y estar activo. **D-109**: el primer integrante necesita PRODEP vigente. Los 15 integrantes que solo aparecen en el CA no tienen esos datos y el servicio los rechazaría |
| `Lgac` (por CA, con profesores M:N) | `ca_lgac` | Directo; asignar los profesores de cada LGAC no viene en el Excel |
| — | `ca_modificaciones` (ALTA/BAJA 2026), `redes_*`, `tramite_2026` | Sin lugar en el repo; D-252 (historial de CA) está pendiente. Guardarlo como nota o esperar a esa tabla |
| — | `profesor_lgac` (LGAC individuales de la Planta) | El repo solo tiene LGAC por CA. No cargar; proponer un issue si la Coordinación las necesita |

### 4.3 SNII

| Repo (`ReconocimientoSnii`) | Paquete | Conversión |
|---|---|---|
| `nivel` | `nivel` | `C→CANDIDATO`, `I→NIVEL_1`, `II→NIVEL_2` |
| `resultado` | `resultado_convocatoria` | Vigente → `APROBADO`. `NO_APROBADO` (4 casos) → el repo lo modela como **nivel** `NO_APROBADO`, que no otorga vigencia (D-104). Esos 4 conservan además su periodo anterior aprobado, que vence en 2026 |
| `tipoParticipacion` | derivado | `INGRESO` → `NUEVO_INGRESO`; `PROMOVIDO` o participó y se mantuvo → `RENOVACION`. Los 97 registros que se mantuvieron sin participar en 2026 (vigencias que empezaron entre 2022 y 2026) **no traen el tipo**: quedan sin dato o se pregunta. Comprobé que **ningún Candidato participante se mantuvo en C**, así que no choca con D-225 |
| `inicio`, `fin` | `fecha_inicio`, `fecha_fin` | Verifiqué los 21 pares 2026→2027 enlazados con `reemplazado_por_id`: **ninguno se traslapa**, así que se pueden cargar ambos como historial sin romper D-103 |
| `convocatoriaId` | — | Solo los resultados de la convocatoria 2026 (`Convocatoria{SNII, 2026}`); los demás quedan en `null` |
| (CVU obligatorio en el formulario) | `profesor.cvu` | 17 registros de SNII 2027 no tienen CVU (son ingresos nuevos que no están en la Planta 2026) |
| — | `area_snii`, `disciplina`, `subdisciplina`, `especialidad`, `campo`, `estatus_observacion` | Sin lugar en el repo |

### 4.4 PRODEP

| Repo (`ReconocimientoProdep`) | Paquete | Conversión |
|---|---|---|
| `inicio`, `fin` (obligatorios) | `fecha_inicio`, `fecha_fin` | **13 registros sin fechas no se pueden cargar** |
| `resultado` | `resultado_convocatoria_2026` | Vigente → `APROBADO` (todo el listado es de vigentes) |
| `tipoSolicitud` (obligatorio) | — | **No viene en el Excel.** Pista: los 8 de 6 años solo pueden ser `RENOVACION` consolidada (RF-010, D-232). Los de 3 años son ambiguos: preguntar, o cargarlos solo cuando se conozca el tipo |
| Requiere `TIEMPO_COMPLETO` (`validarContratacionProdep`) | `es_ptc` | 3 personas con Perfil vigente tienen nombramiento de asignatura, y el servicio las rechazaría. Es un caso para el cliente |

### 4.5 Catálogos y specs sin equivalente en el repo

`disciplinas_prodep` (1 089), `instituciones_otorgantes` (1 090), `areas_prodep`, `areas_snii` y `specs/formato_alta_ptc_f01.json` (CURP, RFC, datos de nacimiento) **no tienen RF ni tabla en el repo**. Sirven para validar `CuerpoAcademico.areaProdep/disciplina` contra el catálogo DGESUI, si el equipo lo decide en un issue. El F_01 pide datos muy sensibles (CURP, RFC, fecha de nacimiento) que el sistema hoy no guarda: no lo incorporaría sin una decisión explícita del equipo.

## 5. Ajustes que hice al paquete tras revisar el repo

- La ubicación recomendada pasa a ser `datos-reales/` (convención del repo, ignorada por git, que `leerCsvReales` comprueba).
- `CLAUDE.md` del paquete ahora advierte sobre §3.1–3.3 y remite a este documento.
- **No** cambié el esquema propio del paquete: el repo es la fuente de verdad, y cualquier cambio a `prisma/schema.prisma` se acuerda en el equipo (AGENTS.md).

## 6. Siguiente paso propuesto (según el flujo de AGENTS.md)

1. **Issue de M2 (I2):** "Completar pendientes de profesores reales con los listados SNII/PRODEP 2027". Sería un script `scripts/completar-profesores.ts` con modo `simular` / `aplicar -- --confirmo`, siguiendo el patrón de `importar-profesores.ts`. Cruzaría por nombre normalizado contra los `PEND####` y solo reemplazaría campos que estén en `PENDIENTE` o en `@pendiente.invalid`, sin tocar lo que alguien ya editó. Necesitaría lógica pura con pruebas de datos ficticios, incluida la de `H→M`/`M→F`.
2. **Decisión de divisiones** (§3.1) antes de cualquier reporte por división.
3. **Issue de M5 (I5):** ampliar `ENCABEZADOS` (§3.3).
4. **Issues de M3/M4** para cargar SNII, PRODEP y CA cuando estén resueltos `tipoSolicitud`, `tipoParticipacion` y `anioVencimiento`.
