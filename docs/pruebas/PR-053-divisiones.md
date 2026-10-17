# Prueba del PR #53: RF-002, registro de divisiones académicas

| Campo | Valor |
|---|---|
| PR | [#53](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/53) (cierra #7) |
| Autor | @edelpinovs |
| Rama | `feat/M1-RF-002-division` → `main` |
| Commits probados | `88be347`, `ac2f7c1`, más la integración de `main` y la validación agregada en la prueba (sección 4) |
| Fecha de la prueba | 2026-10-16 |
| Probó | Edel Pino |
| Entorno | Local (Windows 11, Node 24.15.0), `next dev` en el puerto 3001, base de datos de desarrollo (Supabase) |
| Resultado | **Aprobado con cambios** (sección 4). Falta la aprobación en GitHub de otra persona del equipo, porque el autor no puede aprobar su propio PR. |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/app/catalogos/divisiones/page.tsx` | Nuevo: lista de divisiones con su número de departamentos y formulario de registro. |
| `src/app/catalogos/divisiones/actions.ts` | Nuevo: Server Action `registrarDivision` (CU-002), protegida con `requireModulo("catalogos")`. |
| `src/app/catalogos/divisiones/formulario.tsx` | Nuevo: formulario con errores por campo. |
| `src/modules/catalogos/divisiones.ts` | Nuevo: validación y búsqueda de duplicados por clave y por nombre. |
| `src/modules/catalogos/comun.ts` | Nuevo: utilidades compartidas por los catálogos. |
| `src/modules/catalogos/grados.ts` | Usa las utilidades compartidas. |
| `src/app/catalogos/page.tsx` | La tarjeta *Divisiones académicas* queda activa. |

No toca el esquema de Prisma. `Division.clave` ya era `@unique`; `nombre` no lo es, y su unicidad se valida en el servicio.

## 2. Conflicto con `main`

El PR partía de la versión original del #52. Al integrarse el #52 con la validación de formato, ambos habían cambiado `grados.ts`: el #53 movió el auxiliar `texto()` a `comun.ts` y el #52 lo había reemplazado. Se resolvió conservando los dos cambios: la validación de formato del #52 y el módulo compartido del #53.

## 3. Verificaciones

### Automáticas

| Verificación | Resultado |
|---|---|
| CI de GitHub (`verificar`) y vista previa de Vercel, sobre `ac2f7c1` | Correcto |
| `npm run lint` y `npm run typecheck` (local, con los cambios de la sección 4) | Correcto |
| `npm test` (local, con los cambios de la sección 4) | Correcto: 5 archivos, 34 pruebas (9 de divisiones) |

### Manuales

Todas como `ADMINISTRADOR`. La columna *Evidencia* indica cómo se comprobó cada caso.

| # | Caso | Resultado | Evidencia |
|---|---|---|---|
| 1 | La tarjeta *Divisiones académicas* de `/catalogos` es un enlace | Correcto | Confirmado por el revisor |
| 2 | Registrar una división la agrega a la tabla sin recargar, con 0 departamentos | Correcto | Captura de pantalla y registro del servidor |
| 3 | **Hallazgo:** se aceptaban nombres y claves sin formato | Corregido (sección 4) | Registro `de Ejemplo C` / `DADAD` |
| 4 | Tras la corrección, el nombre se guarda con la primera letra en mayúscula y la clave en mayúsculas | Correcto | Registro `Dada a dad…` / `OK` en la base |
| 5 | Clave repetida en minúsculas (`div-a`) → error de clave duplicada | Correcto | Confirmado por el revisor; prueba automática |
| 6 | Nombre repetido sin acento (`division de ejemplo a`) → error de nombre duplicado | Correcto | Confirmado por el revisor; prueba automática |
| 7 | Nombre con números (`División 1`) → error de formato | Correcto | Confirmado por el revisor; prueba automática |
| 8 | Vista de celular: campos apilados, sin desplazamiento horizontal | Correcto | Confirmado por el revisor |

## 4. Cambios hechos durante la prueba

Se aplicó a divisiones la misma validación de formato que a grados (PR #52), y una regla común para los nombres:

| Campo | Regla | Ejemplos rechazados |
|---|---|---|
| Nombre (divisiones y grados) | Letras (con acentos), espacios y puntos; empieza con letra; de 3 a 150 caracteres en divisiones y de 3 a 100 en grados. La primera letra se guarda en mayúscula. | `División 1`, `123`, `-- División`, `Di` |
| Clave institucional | Letras, números y guiones; empieza con letra; de 2 a 20 caracteres; se guarda en mayúsculas | `d`, `1DIV`, `DIV A`, `DIV.A`, `DIV_A` |

La regla del nombre vive en `nombreCatalogo()` de `src/modules/catalogos/comun.ts`, lista para Departamentos (RF-003). Se agregaron 4 pruebas.

**Efecto secundario positivo.** Como la clave se guarda siempre en mayúsculas, el `@unique` de la base impide `div-a` y `DIV-A` aunque se registren en el mismo instante.

**Datos de prueba eliminados.** Se borraron de la base de desarrollo las divisiones `de Ejemplo C` / `DADAD` y `Dada a dad ada dad ad ad` / `OK`. No tenían departamentos. El catálogo quedó con `DIV-A`, `DIV-B` y `DIV-C`, de la semilla.

## 5. Limitaciones conocidas

- La validación revisa el formato, no el significado. Un nombre como `De Ejemplo C`, casi igual a `División de Ejemplo C`, es válido.
- El nombre no tiene `@unique` en la base. Dos registros simultáneos con el mismo nombre pasarían la revisión del servicio.
- El catálogo no permite editar ni borrar divisiones; RF-002 solo pide el registro.

## 6. Dictamen

Se aprueba la integración del PR #53 a `main` con los cambios de la sección 4, una vez que otra persona del equipo lo apruebe en GitHub.
