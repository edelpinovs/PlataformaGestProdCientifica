# Prueba del PR #66: RF-004, registro de profesores investigadores

| Campo | Valor |
|---|---|
| PR | [#66](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/66) (corresponde al issue #9, pero el PR no lo enlaza) |
| Autor | @dpfuentes92 |
| Rama | `Gestprof` → `main` |
| Commit probado | `b367768` |
| Fecha de la prueba | 2026-10-28 |
| Probó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24.15.0), copias aisladas de la rama (`git worktree`): el PR tal cual y el PR combinado con `main` (`1fd2208`). Sin base de datos y sin `next dev`. |
| Resultado | **Cambios solicitados.** El PR solo pasa sus chequeos, pero combinado con `main` falla el CI, y 4 de las 11 pruebas de revisión fallan (sección 4). |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/modules/profesores/profesores.ts` | Nuevo: esquema Zod `registrarProfesor`, `buscarDuplicadoProfesor` y `generarNombreNormalizado` |
| `src/modules/profesores/profesores.test.ts` | Nuevo: 15 pruebas |
| `src/app/profesores/actions.ts` | Nuevo: Server Action `crearProfesor` con `requireModulo("profesores")` |
| `src/app/profesores/nuevo/page.tsx` y `formulario.tsx` | Nuevo: pantalla y formulario de alta (CU-004) |
| `src/app/profesores/page.tsx` | Directorio de profesores (antes `ModuloPendiente`) |
| `vitest.config.ts` | **Nuevo, en la raíz:** alias `@/` para Vitest (afecta a todo el equipo) |
| `.vitest/json/output.json` | **Archivo generado** por Vitest, subido por error |

No toca el esquema de Prisma: usa `Profesor`, que ya existía. Los enums `Genero`, `TipoContratacion` y `EstatusLaboral` del formulario coinciden con el esquema.

## 2. Verificaciones automáticas

| Verificación | PR solo (`b367768`) | PR + `main` actual (lo que prueba el CI) |
|---|---|---|
| `npm test` | Correcto: 8 archivos, 63 pruebas | **Falla:** 2 archivos no cargan (`TypeError: texto is not a function`); las otras 88 pasan |
| `npm run lint` | Correcto | Correcto |
| `npm run typecheck` | Correcto | **Falla:** 4 errores (abajo) |
| CI de GitHub (`verificar`) | — | **Falla** en `typecheck`, con los mismos 4 errores |

Errores de `typecheck` con `main` (reproducidos en local, iguales al CI):

```
src/modules/profesores/profesores.ts(2,31): error TS2305: Module '"@/modules/catalogos/comun"' has no exported member 'texto'.
src/app/profesores/actions.ts(84,7): error TS2322: ... Types of property 'gradoId' are incompatible.
src/modules/cuerpos-academicos/cuerpo.ts(2,38): error TS2305: Module '"../catalogos/comun"' has no exported member 'texto'.
src/app/cuerpos-academicos/actions.ts(77,43): error TS2322: ... missing the following properties ...: areaProdep, disciplina
```

### Causa: `main` está roto, y el PR depende de lo mismo

- El PR #61 (RF-003) quitó la función `texto` de `src/modules/catalogos/comun.ts`. El PR #65 (RF-012, cuerpos académicos), integrado justo antes, la usa. Desde la integración del #61, **el CI de `main` falla** con los dos errores de `cuerpos-academicos`. Eso no es culpa del PR #66.
- El PR #66 parte de un `main` viejo (`3f58045`), donde `texto` todavía existía, y también la usa. Los dos errores de `profesores` sí son del PR. El de `gradoId` sale en cadena: sin `texto`, los tipos de `nombres` y `apellidos` se vuelven `any`. En el PR solo, el typecheck pasa.
- **Solución:** primero arreglar `main` (devolver `texto` a `comun.ts` o pasar `cuerpos-academicos` a otra validación), y luego actualizar el PR #66 con `main`.

> **Actualización (2026-10-28).** `main` se corrigió en el PR #68 (`9d6b13e`), que devolvió `texto` a `catalogos/comun.ts`, y su CI pasa. El paso 1 del dictamen ya está hecho: al PR #66 le basta con actualizarse con `main` para que desaparezcan los errores de `texto` y el de `gradoId`, que sale en cadena. Los demás puntos de este registro siguen pendientes.

## 3. Suite del PR: 63 de 63 pasan (sobre `b367768`)

### Nuevas en este PR: `src/modules/profesores/profesores.test.ts` (15)

| # | Prueba | Resultado |
|---|---|---|
| 1 | `registrarProfesor` acepta datos mínimos válidos | ✓ |
| 2 | `registrarProfesor` exige código, nombres, apellidos, correo, género y tipo de contratación | ✓ |
| 3 | `registrarProfesor` transforma el código a mayúsculas y elimina espacios | ✓ |
| 4 | `registrarProfesor` rechaza código con espacios internos | ✓ |
| 5 | `registrarProfesor` transforma el correo a minúsculas | ✓ |
| 6 | `registrarProfesor` rechaza un correo sin formato válido | ✓ |
| 7 | `registrarProfesor` rechaza género distinto de M o F | ✓ |
| 8 | `registrarProfesor` acepta ORCID con formato correcto | ✓ |
| 9 | `registrarProfesor` rechaza ORCID con formato incorrecto | ✓ |
| 10 | `buscarDuplicadoProfesor` acepta un profesor completamente nuevo | ✓ |
| 11 | `buscarDuplicadoProfesor` detecta código duplicado | ✓ |
| 12 | `buscarDuplicadoProfesor` detecta correo duplicado sin importar mayúsculas ni acentos | ✓ |
| 13 | `buscarDuplicadoProfesor` detecta ORCID duplicado | ✓ |
| 14 | `buscarDuplicadoProfesor` detecta Scholar ID duplicado | ✓ |
| 15 | `generarNombreNormalizado` convierte a minúsculas sin acentos y combina apellidos y nombres | ✓ |

### Ya existentes (en la base vieja del PR)

| Archivo | Pruebas | Resultado |
|---|---|---|
| `src/components/pauta-visual.test.ts` | 6 | ✓ todas (cubre las pantallas nuevas de `profesores`) |
| `src/modules/catalogos/grados.test.ts` | 9 | ✓ todas |
| `src/modules/catalogos/divisiones.test.ts` | 9 | ✓ todas |
| `src/modules/catalogos/departamentos.test.ts` | 8 | ✓ todas |
| `src/lib/auth/siiau.test.ts` | 10 | ✓ todas |
| `src/lib/auth/enlace.test.ts` | 3 | ✓ todas |
| `src/modules/reportes/semaforo.test.ts` | 3 | ✓ todas |

`grados` tiene 9 pruebas y no 16 porque el PR no incluye los cambios integrados después en `main`.

**Lo que la suite no cubre.** Scopus ID y CVU no tienen prueba de duplicado, y la Server Action no tiene ninguna prueba.

## 4. Pruebas de revisión: 7 pasan, 4 fallan

Se corrieron sobre el PR solo (`b367768`), con su propio `vitest.config.ts`. Simulan `prisma`, la sesión y `next/cache` con `vi.mock`; no usan base de datos. Las 6 pruebas de **control** (casos que deben funcionar) pasan; eso confirma que las simulaciones son correctas y que los fallos vienen del código del PR.

| # | Prueba | Resultado | Salida de Vitest |
|---|---|---|---|
| V1 | Rechaza nombres y apellidos con números (`Ana123`, `12345`) | ✗ | `expected true to be false` (los acepta) |
| V2 | Un departamento inválido da un mensaje en español | ✗ | `expected 'Invalid input: expected number, recei…' not to match /Invalid\|expected/i` |
| V3 | Acepta el ORCID con `x` minúscula y lo guarda con `X` | ✗ | `expected false to be true` (lo rechaza) |
| C1 | *Control:* datos válidos con identificadores vacíos pasan | ✓ | — |
| D1 | El mismo ORCID con `x` minúscula no entra como profesor nuevo | ✓ | Pasa solo porque V3 lo rechaza antes; si se corrige V3, esta prueba confirma que también se detecta el duplicado |
| C2 | *Control:* detecta código repetido | ✓ | — |
| C3 | *Control:* la Server Action exige `requireModulo("profesores")` | ✓ | — |
| C4 | *Control:* registra un profesor válido | ✓ | — |
| C5 | *Control:* un código repetido no llega a la base | ✓ | — |
| C6 | *Control:* `P2002` da un mensaje legible | ✓ | — |
| A1 | `P2003` (departamento o grado borrado mientras se llenaba el formulario) da un mensaje legible y no lanza | ✗ | `expected { …(1) } to not have property "lanzo"` (la acción lanza la excepción) |

### Qué significa cada fallo

- **V1 (menor).** `texto()` solo exige que el campo no esté vacío y no pase del largo máximo. Acepta números y símbolos en nombres y apellidos. Los catálogos del equipo ya rechazan números en los nombres.
- **V2 (menor).** Con un `departamentoId` o `gradoId` que no es número, Zod devuelve su mensaje en inglés. AGENTS.md pide errores legibles en español.
- **V3 (menor).** El ORCID con `x` minúscula se rechaza. Conviene pasarlo a mayúscula antes de validar, igual que el código.
- **A1 (importante).** AGENTS.md pide capturar `P2003` en las relaciones. Si un departamento o grado se borra mientras alguien llena el formulario, la acción lanza la excepción y la persona ve un error genérico de la aplicación.

## 5. Hallazgos revisados solo leyendo el código

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | **CI en rojo:** usa `texto`, que ya no existe en `main` (sección 2). Hay que actualizar la rama con `main` cuando se arregle. | Bloqueante |
| 2 | **Listado sin *Editar* ni *Eliminar* (#59).** El directorio es un listado de registros que el administrador da de alta, así que la regla aplica. *Eliminar* debe revisar `Autoria`, `ReconocimientoSnii`, etc., que son relaciones obligatorias (`P2003`). | Bloqueante (regla del equipo) |
| 3 | **`vitest.config.ts` en la raíz** es un cambio para todo el equipo, fuera del módulo: hay que acordarlo antes (AGENTS.md). Es útil: sin el alias `@/`, las Server Actions no se pueden probar. Se recomienda proponerlo en un PR propio. | Regla del equipo |
| 4 | **`.vitest/json/output.json`** es un archivo generado. Hay que quitarlo del PR y agregar `.vitest/` a `.gitignore`. | Regla del equipo |
| 5 | **Forma del PR:** no tiene `Cierra #9`, la rama `Gestprof` no sigue `feat/M2-RF-004-…`, el commit `RF004` no sigue `RF-004: <qué hace>` y la descripción ("Add prof") no explica el cambio. | Regla del equipo |
| 6 | La tabla de 7 columnas usa `overflow-x-auto`: en celular se desplaza a lo ancho. La pauta pide columnas que se apilen. | Menor |
| 7 | Para revisar duplicados, la acción carga **todos** los profesores. Funciona con cientos; con `findFirst` y `OR` sobre los campos únicos bastaría una consulta. | Menor |
| 8 | Scopus ID y CVU no validan formato (aceptan letras). | Menor |

**Lo que está bien:** el permiso está en la página y en la acción. La unicidad se revisa en el servicio y además se captura `P2002`. Los campos tienen `<label>` y `aria-invalid`, y el formulario conserva los valores cuando hay error. Respeta la pauta visual: la prueba de pauta pasa.

## 6. Lo que no se probó

- Las pantallas `/profesores` y `/profesores/nuevo` en el navegador (tema claro, oscuro y celular).
- Un registro real en la base de desarrollo.
- El rol `COORDINADOR` (el registro le da acceso al módulo; el RF habla del administrador).

## 7. Dictamen

**No se aprueba todavía.** Orden sugerido:

1. ~~Arreglar `main` (fuera de este PR): devolver `texto` a `catalogos/comun.ts` o cambiar `cuerpos-academicos`.~~ Hecho en el PR #68.
2. En el PR #66: actualizar con `main`, quitar `.vitest/json/output.json`, agregar *Editar* y *Eliminar* (#59), capturar `P2003` (A1) y enlazar `Cierra #9`.
3. Acordar `vitest.config.ts` con el equipo, o moverlo a su propio PR.
4. Corregir V1, V2 y V3, y sumar las pruebas de la sección 8; deben pasar las 11.

## 8. Código de las pruebas de revisión

Para correrlas: copiar el archivo a `src/modules/profesores/revision-pr66.test.ts` en la rama del PR. Usan el `vitest.config.ts` del propio PR.

```bash
npx vitest run revision-pr66
```

<details>
<summary><code>src/modules/profesores/revision-pr66.test.ts</code></summary>

```ts
// Pruebas de la revisión del PR #66 (ver docs/pruebas/PR-066-registro-profesores.md).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { buscarDuplicadoProfesor, registrarProfesor } from "./profesores";

const prismaFalso = vi.hoisted(() => ({
  profesor: { findMany: vi.fn(), create: vi.fn() },
}));
const sesionFalsa = vi.hoisted(() => ({ requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })) }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => sesionFalsa);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const valido = {
  codigo: "PRUEBA01",
  nombres: "Ana María",
  apellidos: "Pérez Ruiz",
  correo: "ana.perez@academicos.udg.mx",
  genero: "F",
  tipoContratacion: "TIEMPO_COMPLETO",
  estatusLaboral: "ACTIVO",
  departamentoId: "",
  gradoId: "",
  cvu: "",
  orcid: "",
  scholarId: "",
  scopusId: "",
};

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

function errorPrisma(code: string) {
  return new Prisma.PrismaClientKnownRequestError("falla simulada", { code, clientVersion: "7.10.0" });
}

describe("Validación del formulario (registrarProfesor)", () => {
  it("V1. rechaza nombres y apellidos con números", () => {
    expect(registrarProfesor.safeParse({ ...valido, nombres: "Ana123" }).success).toBe(false);
    expect(registrarProfesor.safeParse({ ...valido, apellidos: "12345" }).success).toBe(false);
  });

  it("V2. un departamento inválido da un mensaje en español", () => {
    const r = registrarProfesor.safeParse({ ...valido, departamentoId: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).not.toMatch(/Invalid|expected/i);
  });

  it("V3. acepta el ORCID con x minúscula y lo guarda con X mayúscula", () => {
    const r = registrarProfesor.safeParse({ ...valido, orcid: "0000-0001-2345-678x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.orcid).toBe("0000-0001-2345-678X");
  });

  it("control: datos válidos con identificadores vacíos pasan", () => {
    const r = registrarProfesor.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.orcid).toBeUndefined();
  });
});

describe("Duplicados (buscarDuplicadoProfesor)", () => {
  const existente = [{ codigo: "PRUEBA01", correo: "otro@academicos.udg.mx", orcid: "0000-0001-2345-678X" }];

  it("D1. detecta el mismo ORCID escrito con x minúscula", () => {
    const r = registrarProfesor.safeParse({ ...valido, codigo: "NUEVO02", orcid: "0000-0001-2345-678x" });
    // Si el formulario lo rechaza (V3), tampoco se registra un duplicado; si lo acepta, debe detectarlo.
    if (r.success) expect(buscarDuplicadoProfesor(r.data, existente)?.campo).toBe("orcid");
    else expect(r.success).toBe(false);
  });

  it("control: detecta código repetido", () => {
    const r = registrarProfesor.safeParse(valido);
    expect(r.success && buscarDuplicadoProfesor(r.data, existente)?.campo).toBe("codigo");
  });
});

describe("Server Action crearProfesor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.profesor.findMany.mockResolvedValue([]);
    prismaFalso.profesor.create.mockResolvedValue({ id: 1 });
  });

  it("control: exige el permiso del módulo antes de todo", async () => {
    const { crearProfesor } = await import("@/app/profesores/actions");
    await crearProfesor({}, formulario(valido));
    expect(sesionFalsa.requireModulo).toHaveBeenCalledWith("profesores");
  });

  it("control: registra un profesor válido", async () => {
    const { crearProfesor } = await import("@/app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.registrado).toBe("Ana María Pérez Ruiz");
    expect(prismaFalso.profesor.create).toHaveBeenCalledOnce();
  });

  it("control: un código repetido no llega a la base", async () => {
    prismaFalso.profesor.findMany.mockResolvedValue([{ codigo: "PRUEBA01", correo: "x@udg.mx" }]);
    const { crearProfesor } = await import("@/app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.campo).toBe("codigo");
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
  });

  it("control: P2002 (otro registro al mismo tiempo) da un mensaje legible", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2002"));
    const { crearProfesor } = await import("@/app/profesores/actions");
    const r = await crearProfesor({}, formulario(valido));
    expect(r.error).toBeDefined();
  });

  it("A1. P2003 (departamento o grado borrado mientras se llenaba) da un mensaje legible y no lanza", async () => {
    prismaFalso.profesor.create.mockRejectedValue(errorPrisma("P2003"));
    const { crearProfesor } = await import("@/app/profesores/actions");
    const r = await crearProfesor({}, formulario({ ...valido, departamentoId: "99" })).catch((e) => ({ lanzo: e }));
    expect(r).not.toHaveProperty("lanzo");
    expect(r).toHaveProperty("error");
  });
});
```

</details>
