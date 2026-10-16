# Prueba del PR #52: RF-001, registro de grados científicos

| Campo | Valor |
|---|---|
| PR | [#52](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/52) (cierra #6) |
| Autor | @edelpinovs |
| Rama | `feat/M1-RF-001-grado-cientifico` → `main` |
| Commit probado | `3c63e47` más la validación de formato agregada en la prueba (sección 4) |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado con cambios** (sección 4). Falta la aprobación en GitHub de otra persona del equipo, porque el autor no puede aprobar su propio PR. |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/app/catalogos/page.tsx` | Deja de ser página "pendiente" y enlaza a cada catálogo. Divisiones (RF-002) y Departamentos (RF-003) aparecen como "En desarrollo". |
| `src/app/catalogos/grados/page.tsx` | Nuevo: lista de grados y formulario de registro. |
| `src/app/catalogos/grados/actions.ts` | Nuevo: Server Action `registrarGrado` (CU-001). |
| `src/app/catalogos/grados/formulario.tsx` | Nuevo: formulario con errores por campo. |
| `src/modules/catalogos/grados.ts` | Nuevo: validación y búsqueda de duplicados. |
| `src/modules/catalogos/grados.test.ts` | Nuevo: pruebas de las reglas. |

No toca el esquema de Prisma. `GradoCientifico` ya tenía `nombre` y `nomenclatura` con `@unique`.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| CI de GitHub (`verificar`) y vista previa de Vercel, sobre `3c63e47` | Correcto |
| `npm run lint` y `npm run typecheck` (local, con la validación nueva) | Correcto |
| `npm test` (local, con la validación nueva) | Correcto: 3 archivos, 15 pruebas (9 de grados) |
| Conflictos con `main` (tras integrar #49 y #51) | Ninguno |

## 3. Pruebas manuales

Todas como `ADMINISTRADOR`.

| # | Caso | Resultado |
|---|---|---|
| 1 | `/catalogos` muestra 3 tarjetas; solo Grados científicos es enlace | Correcto |
| 2 | Registrar un grado nuevo lo agrega a la tabla y vacía el formulario | Correcto |
| 3 | Nombre repetido con otras mayúsculas o sin acento (`doctorado`) → error de nombre duplicado | Correcto |
| 4 | Nomenclatura repetida en minúsculas (`dr`) → error de nomenclatura duplicada | Correcto |
| 5 | Espacios sobrantes (`  Maestría   en  Ciencias `) se guardan colapsados | Correcto |
| 6 | Vista de celular: campos apilados, sin desplazamiento horizontal | Correcto |
| 7 | **Hallazgo:** se aceptaban textos sin formato, como `Nombre 1` / `d` y `Maestría en Ciencias` / `mmmm` | Corregido (sección 4) |
| 8 | Tras la corrección: `Nombre 1` se rechaza; `d` se rechaza; `esp` se guarda como `ESP` | Correcto |

## 4. Cambios hechos durante la prueba

El caso 7 mostró que el PR solo exigía que los campos no estuvieran vacíos. Se agregó validación de formato en `src/modules/catalogos/grados.ts`:

| Campo | Regla | Ejemplos rechazados |
|---|---|---|
| Nombre | Letras (con acentos), espacios y puntos; empieza con letra; de 3 a 100 caracteres | `Nombre 1`, `123`, `-- Doctorado`, `Dr` |
| Nomenclatura | Solo letras, de 2 a 10; se guarda en mayúsculas | `d`, `D1`, `M C`, `M.C.`, `ABCDEFGHIJK` |

El formulario limita la nomenclatura a 10 caracteres (antes 20), y se agregaron 4 pruebas.

La validación revisa el formato, no el significado: un texto como `mmmm` tiene formato válido y se guarda como `MMMM`. Evitarlo exigiría una lista cerrada de grados.

**Datos de prueba eliminados.** Los registros `Nombre 1 / d` y `Maestría en Ciencias / mmmm` se borraron de la base de desarrollo. No tenían profesores ligados. El catálogo quedó con `Doctorado / DR`, `Licenciatura / LIC` y `Maestría / MTRO`.

## 5. Limitación conocida

La comparación de duplicados ignora mayúsculas y acentos, pero el `@unique` de la base compara el texto exacto. Si dos administradores registran `Maestría` y `maestria` en el mismo instante, ambos pasan la revisión y la base acepta los dos. Con uno o dos administradores es muy improbable. La solución completa sería un índice único sobre el texto normalizado en Postgres.

El catálogo no permite editar ni borrar grados; RF-001 solo pide el registro.

## 6. Dictamen

Se aprueba la integración del PR #52 a `main` con la validación de la sección 4, una vez que otra persona del equipo lo apruebe en GitHub.
