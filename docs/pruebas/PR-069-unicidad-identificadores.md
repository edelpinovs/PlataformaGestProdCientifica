# Prueba del PR #69: RF-005, unicidad de identificadores del profesor (incluye RF-004)

| Campo | Valor |
|---|---|
| PR | [#69](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/69) (issue #10; también trae RF-004, issue #9, del [#66](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/66)) |
| Autor | @dpfuentes92 |
| Rama | `feat/M2-RF-005-unicidad-identificadores` → `main` |
| Commit probado | `33f6803` |
| Fecha de la prueba | 2026-10-29 |
| Probó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24.15.0), copia aislada de la rama (`git worktree`) combinada con `main` (`8dc3e53`), con `prisma generate` y variables de relleno. Sin base de datos y sin `next dev`. |
| Resultado | **Aprobable con un cambio.** Pasan los chequeos y las 11 pruebas de revisión del #66. Falla 1 prueba nueva: el mensaje de `P2002` (sección 4). |

## 1. Relación con el PR #66

El #69 contiene los 4 commits del #66 (`b367768`, `abf3533`, `e02177d`, `d638ac2`) más `33f6803` (RF-005). Si se integra el #69, el #66 queda incluido y se puede cerrar sin integrar. Cerrarlo lo decide una persona.

Estado de lo pedido en la revisión del #66:

| Pedido en el #66 | Estado en el #69 |
|---|---|
| Capturar `P2003` en el alta | Resuelto: `errorPrisma` lo traduce a «El departamento o el grado elegido ya no existe» |
| *Editar* y *Eliminar* en cada fila (#59) | Resuelto con `<FilaEditable>`. Eliminar revisa las 10 relaciones de `Profesor` y repite la condición dentro de `deleteMany` |
| V1: números en nombres y apellidos | Resuelto |
| V2: mensaje en inglés con un departamento inválido | Resuelto |
| V3: ORCID con `x` minúscula | Resuelto: se guarda en mayúscula |
| Quitar `.vitest/json/output.json` | Resuelto; además `.vitest/` va a `.gitignore` |
| Acordar `vitest.config.ts` en el equipo | **Pendiente:** sigue en la raíz |
| `Cierra #9`, rama y commits con formato | **En parte:** la rama y 3 commits ya siguen el formato; faltan `Cierra #9` y `Cierra #10`, y siguen los commits `RF004` / `Add prof` |

## 2. Alcance del cambio (contra `main`)

| Archivo | Cambio |
|---|---|
| `src/modules/profesores/profesores.ts` | Esquema `registrarProfesor`, `buscarDuplicadoProfesor` (código, correo, ORCID, Scholar, Scopus, CVU), `filtroCandidatosDuplicado`, `mensajeUnicidadPrisma`, `motivoProfesorNoEliminable` |
| `src/modules/profesores/profesores.test.ts` | 34 pruebas |
| `src/modules/profesores/revision-pr66.test.ts` | 11 pruebas: las de revisión del #66, adaptadas |
| `src/app/profesores/actions.ts` | `crearProfesor`, `editarProfesor`, `eliminarProfesor`, todas con `requireModulo("profesores")` |
| `src/app/profesores/page.tsx`, `nuevo/` | Directorio con filas editables y pantalla de alta |
| `src/components/fila-editable.tsx` | **Compartido:** agrega `opcional` y `placeholder` a `CampoFila`. Es compatible: los listados que no lo usan no cambian |
| `vitest.config.ts` | **Compartido:** alias `@/` para Vitest |
| `.gitignore` | **Compartido:** ignora `.vitest/` |
| `package-lock.json` | **Compartido:** corrige `name` (`pgpc` → el de `package.json`) y quita 48 bloques `libc` por usar otra versión de npm |

## 3. Verificaciones automáticas

| Verificación | PR + `main` (`8dc3e53`) |
|---|---|
| `npm test` | Correcto: 12 archivos, 154 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) y Vercel | Correcto en `33f6803` |

Aviso no bloqueante de Vitest: `ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1)`. Se quita renombrando el archivo a `vitest.config.mts`.

## 4. Pruebas de revisión

**Las 11 del #66, sin cambios, sobre el código del #69: pasan las 11.** Antes fallaban 4: V1, V2, V3 y A1.

**Nueva, R1 (P2002 con el adaptador pg): falla.**

La app usa `@prisma/adapter-pg`. Con el adaptador, un `P2002` **no trae `meta.target`**: trae `meta.driverAdapterError.cause.constraint.index` (por ejemplo `"Profesor_orcid_key"`) y `meta.table`. Está verificado en `node_modules/@prisma/adapter-pg/dist/index.js` (caso `23505`) y en el runtime de `@prisma/client`. `mensajeUnicidadPrisma(e.meta?.target)` siempre recibe `undefined`.

```
× R1: ORCID duplicado en carrera señala el ORCID
- Expected:  { campo: "orcid",  mensaje: "Ese ORCID ya está registrado." }
+ Received:  { campo: "codigo", mensaje: "Algunos de los identificadores ingresados ya están registrados." }
✓ control: con `target` (motor sin adaptador) sí funciona
```

**Efecto:** solo ocurre si dos altas chocan al mismo tiempo, porque la búsqueda previa atrapa los duplicados normales. La persona ve un mensaje genérico, y el campo que se marca con error es *Código*, aunque esté bien. La prueba del PR (`control: P2002 … da un mensaje legible`) pasa porque simula el error con `target`, que en producción no llega.

**Corrección sugerida:** leer el índice que manda el adaptador, sin quitar `target`:

```ts
// actions.ts, en errorPrisma: "Profesor_orcid_key" → ["orcid"]
const adaptador = e.meta?.driverAdapterError as { cause?: { constraint?: { index?: string } } } | undefined;
const campo = adaptador?.cause?.constraint?.index?.match(/^Profesor_(.+)_key$/)?.[1];
const duplicado = mensajeUnicidadPrisma(campo ? [campo] : e.meta?.target);
```

## 5. Hallazgos revisados leyendo el código

1. **Archivos compartidos** (`fila-editable.tsx`, `vitest.config.ts`, `.gitignore`, `package-lock.json`): según `AGENTS.md`, se acuerdan en el chat del equipo antes de integrar. El cambio a `fila-editable.tsx` es pequeño y compatible. En `package-lock.json`, el `name` corregido está bien, pero quitar los `libc` es ruido de otra versión de npm.
2. **`revision-pr66.test.ts`:** el nombre habla de la revisión y no del requisito. Conviene pasar sus pruebas a `profesores.test.ts`. Además mockea `@/lib/prisma` y `../../lib/prisma` a la vez; con el alias basta uno.
3. **Descripción y título:** faltan `Cierra #9` y `Cierra #10`. El título es el que GitHub generó a partir de la rama. El commit `d638ac2` dice RF-005 pero contiene RF-004. Si se integra con *squash*, queda limpio.
4. **Bien resuelto:**
   - La búsqueda de duplicados ya no trae todo el directorio: `filtroCandidatosDuplicado` consulta solo a quien podría chocar.
   - Editar pasa el `id` propio para que el profesor no choque consigo mismo.
   - Eliminar da el motivo con conteos y repite la condición en el borrado.
   - La pauta visual pasa: la tabla ya no usa `overflow-x-auto`.

## 6. Lo que no se probó

- La pantalla en el navegador: tema claro, tema oscuro y vista de celular.
- Altas, ediciones y borrados contra la base real, incluido el `P2002` real; R1 reproduce la forma del error a partir del código del adaptador.
- El acceso con rol *coordinador*.

## 7. Dictamen

**Aprobable cuando se corrija R1** y el equipo acuerde los archivos compartidos. Lo demás (pasar las pruebas a `profesores.test.ts`, `Cierra #9` y `Cierra #10`, `vitest.config.mts`) puede ir en el mismo ajuste. Al integrar el #69, el #66 queda incluido y se puede cerrar.

## 8. Código de la prueba de revisión

<details>
<summary><code>src/modules/profesores/revision-pr69.test.ts</code></summary>

```ts
// Revisión del PR #69: forma real de `meta` en un P2002 con @prisma/adapter-pg.
import { describe, expect, it } from "vitest";
import { mensajeUnicidadPrisma } from "./profesores";

// Lo que arma @prisma/client (runtime) a partir de adapter-pg ante un 23505.
const metaAdaptador = (indice: string) => ({
  driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { index: indice } } },
  table: "Profesor",
});

describe("P2002 con el adaptador pg", () => {
  it("R1: ORCID duplicado en carrera señala el ORCID", () => {
    const meta = metaAdaptador("Profesor_orcid_key") as { target?: unknown };
    expect(mensajeUnicidadPrisma(meta.target)).toEqual({ campo: "orcid", mensaje: "Ese ORCID ya está registrado." });
  });
  it("control: con `target` (motor sin adaptador) sí funciona", () => {
    expect(mensajeUnicidadPrisma(["orcid"]).campo).toBe("orcid");
  });
});
```

</details>

Las 11 pruebas de revisión del #66 están en la sección 8 de [PR-066-registro-profesores.md](PR-066-registro-profesores.md).
