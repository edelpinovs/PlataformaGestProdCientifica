# Prueba del PR #72: RF-006, contratación y estatus laboral (incluye RF-004 y RF-005)

| Campo | Valor |
|---|---|
| PR | [#72](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/72) (issue #11; también trae RF-005, issue #10, del [#69](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/69), y RF-004, issue #9, del [#66](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/66)) |
| Autor | @dpfuentes92 |
| Rama | `feat/M2-RF-006-contratacion-estatus` → `main` |
| Commit probado | `dbd105a` |
| Fecha de la prueba | 2026-10-29 |
| Probó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 11, Node 24.15.0), copia aislada de la rama (`git worktree`) combinada con `main` (`ed3164d`) y `prisma generate`. Sin base de datos y sin `next dev`. |
| Resultado | **Aprobable cuando se reordene el PR.** El código de RF-006 pasa todo y corrige el hallazgo R1 del #69. Lo pendiente es cómo está armado (sección 6). |

## 1. Relación con el #66 y el #69

La rama del #72 incluye el código del #66 (cerrado) y del #69 (abierto, con cambios pedidos) más tres commits:

| Commit | Contenido |
|---|---|
| `cd99188` | RF-005: traduce el P2002 del adaptador pg al campo duplicado (el R1 del #69) |
| `dbd105a` | RF-005: restaura los bloques `libc` del lockfile |
| `1a9bcd3` | RF-006: asigna contratación y estatus laboral al profesor |

El #69 trae sus propios commits `99ff051` y `46b070c` con el mismo contenido que `cd99188` y `dbd105a`, con otro hash. Contra el #69, el #72 solo agrega RF-006: unas 79 líneas netas en `src`. Si se integra el #72 tal cual, el #69 y el #66 quedan incluidos. Cerrarlos lo decide una persona.

## 2. Alcance del cambio (contra `main`)

10 archivos, +1436 −9 (la mayoría es el código ya revisado del #66 y el #69).

| Archivo | Cambio |
|---|---|
| `src/modules/profesores/profesores.ts` | **RF-006:** `asignacionLaboral`, `TIPOS_CONTRATACION`, `ESTATUS_LABORALES`, `ETIQUETA_CONTRATACION`, `ETIQUETA_ESTATUS`; `registrarProfesor` las extiende |
| `src/modules/profesores/profesores.test.ts` | Pruebas de `asignacionLaboral` |
| `src/app/profesores/nuevo/formulario.tsx` | Listas de contratación y estatus en el alta |
| `src/app/profesores/page.tsx` | Contratación bajo el nombre; estatus como etiqueta; ambas listas al editar |
| `src/app/profesores/actions.ts` | `crearProfesor`, `editarProfesor` y `eliminarProfesor`, todas con `requireModulo("profesores")` |
| `src/components/fila-editable.tsx` | **Compartido:** agrega `opcional` y `placeholder` a `CampoFila`. Es compatible: el valor por omisión mantiene `required` |
| `vitest.config.mts` | **Compartido:** alias `@/` para Vitest |
| `.gitignore` | **Compartido:** ignora `.vitest/` |
| `package-lock.json` | **Compartido:** corrige `name` (`pgpc` → el de `package.json`) |

## 3. Verificaciones automáticas

| Verificación | PR + `main` (`ed3164d`) |
|---|---|
| `npm test` | Correcto: 11 archivos, 155 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| Merge con `main` | Sin conflictos |
| CI de GitHub (`verificar`, que incluye `npm run build`) y Vercel | Correcto en `dbd105a` |

El `build` no se corrió en la copia aislada: un enlace de `node_modules` que usé para ahorrar la instalación lo rechaza Turbopack. Es un problema de la copia, no del PR; el CI sí lo ejecutó.

## 4. Pruebas de revisión

12 pruebas nuevas (código en la sección 9): **pasan las 12.**

| # | Qué comprueba | Resultado |
|---|---|---|
| S1 | Las listas del módulo coinciden con los enums `TipoContratacion` y `EstatusLaboral` de Prisma | Pasa |
| S2 | Cada valor tiene etiqueta en español | Pasa |
| A1 | Alta sin contratación: error «Selecciona el tipo de contratación.», marca el campo y no escribe | Pasa |
| A2 | Alta sin estatus: error «Selecciona el estatus laboral.», marca el campo | Pasa |
| A3 | Un valor fuera de la lista se rechaza en español (`JUBILADO`, `HONORARIOS`) | Pasa |
| A4 | Se guardan los 10 pares contratación × estatus | Pasa |
| E1 | Editar cambia contratación y estatus con las reglas del alta | Pasa |
| E2 | Editar con un estatus inválido no escribe | Pasa |
| P1 | Sin permiso del módulo, las acciones no consultan ni escriben (RNF-005) | Pasa |
| R1a–c | El P2002 del adaptador pg señala ORCID o correo, no el código | Pasa |

**R1 del #69, resuelto.** En la revisión del #69, un duplicado en carrera marcaba el campo *Código* aunque el error fuera del ORCID. El commit `cd99188` del #72 lee `meta.driverAdapterError.cause.constraint.index` y lo corrige.

## 5. Hallazgos revisados leyendo el código

1. **El alta preselecciona «Activo».** `formulario.tsx` usa `defaultValue={v.estatusLaboral ?? "ACTIVO"}`, y el comentario de `profesores.ts` dice «no hay valor implícito». Así, al registrar no puede darse el error «falta el estatus». Hay que decidir si debe partir vacío, como la contratación, o ajustar el comentario.
2. **Archivos compartidos** (`fila-editable.tsx`, `vitest.config.mts`, `.gitignore`, `package-lock.json`): según `AGENTS.md`, se avisan en el chat del equipo. Los cambios son pequeños y compatibles.
3. **`key` de `FilaEditable`** en `page.tsx`: concatena 14 campos. Funciona, pero es frágil.
4. **Bien resuelto:**
   - Contratación bajo el nombre y estatus como etiqueta, con tipo `exito`, `aviso` o `error` según el valor.
   - Editar usa los mismos esquemas del alta.
   - Las tres acciones empiezan con `requireModulo`.

## 6. Lo que se pidió en la revisión del PR

Comentario publicado en el [#72](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/72#issuecomment-6514744281):

1. El PR trae más que RF-006 (RF-004, RF-005 y #59), pero la descripción solo habla de RF-006. Resolver primero el #69 y actualizar el #72 sobre `main`.
2. No cierra ningún issue: falta `Closes #11`, o también `#9` y `#10`.
3. El título es el de la rama; debería ser `RF-006: …`.
4. Avisar de los archivos compartidos en la descripción.
5. La duda del estatus «Activo» por omisión (hallazgo 1).
6. La `key` larga (hallazgo 3).

## 7. Lo que no se probó

- La pantalla en el navegador: tema claro, tema oscuro y vista de celular.
- Altas, ediciones y borrados contra la base real.
- El acceso con rol *coordinador*. Las acciones piden el módulo `profesores`, que según `src/modules/registry.ts` admite Administrador y Coordinador.
- Las 11 pruebas de revisión del #66.

## 8. Dictamen

**Aprobable con cambios de armado.** El código de RF-006 cumple el issue #11 y pasa las 12 pruebas de revisión y los chequeos. Antes de integrar: reordenar el PR para que no repita el #69, agregar `Closes #…` y decidir el estatus por omisión. La vista previa de Vercel debe revisarse en los tres modos antes de aprobar.

## 9. Código de la prueba de revisión

<details>
<summary><code>src/modules/profesores/revision-pr72.test.ts</code></summary>

```ts
// Revisión del PR #72 (RF-006): contratación y estatus laboral, y el P2002 del adaptador pg.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EstatusLaboral, TipoContratacion } from "../../generated/prisma/client";
import { Prisma } from "../../generated/prisma/client";
import {
  ESTATUS_LABORALES,
  ETIQUETA_CONTRATACION,
  ETIQUETA_ESTATUS,
  TIPOS_CONTRATACION,
  mensajeUnicidadPrisma,
} from "./profesores";

const prismaFalso = vi.hoisted(() => ({
  profesor: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
}));
const sesion = vi.hoisted(() => ({ requireModulo: vi.fn() }));
const nav = vi.hoisted(() => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }) }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => sesion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: nav.redirect, RedirectType: { replace: "replace" } }));

import { crearProfesor, editarProfesor } from "@/app/profesores/actions";

const formulario = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  const base: Record<string, string> = {
    codigo: "ABC123", nombres: "Juan", apellidos: "García López", correo: "juan@cuvalles.udg.mx",
    genero: "M", tipoContratacion: "TIEMPO_COMPLETO", estatusLaboral: "ACTIVO", ...extra,
  };
  for (const [k, v] of Object.entries(base)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  sesion.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
  prismaFalso.profesor.findMany.mockResolvedValue([]);
  prismaFalso.profesor.create.mockResolvedValue({});
  prismaFalso.profesor.update.mockResolvedValue({});
  prismaFalso.profesor.findUnique.mockResolvedValue({ id: 7 });
});

describe("RF-006: valores contra la base", () => {
  it("S1: las listas del módulo coinciden con los enums de Prisma", () => {
    expect([...TIPOS_CONTRATACION].sort()).toEqual(Object.values(TipoContratacion).sort());
    expect([...ESTATUS_LABORALES].sort()).toEqual(Object.values(EstatusLaboral).sort());
  });
  it("S2: cada valor tiene su etiqueta en español", () => {
    expect(Object.keys(ETIQUETA_CONTRATACION).sort()).toEqual([...TIPOS_CONTRATACION].sort());
    expect(Object.keys(ETIQUETA_ESTATUS).sort()).toEqual([...ESTATUS_LABORALES].sort());
  });
});

describe("RF-006: alta", () => {
  it("A1: sin tipo de contratación, rechaza, marca el campo y no escribe", async () => {
    const r = await crearProfesor({}, formulario({ tipoContratacion: "" }));
    expect(r).toMatchObject({ error: "Selecciona el tipo de contratación.", campo: "tipoContratacion" });
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
  });
  it("A2: sin estatus, rechaza y marca el campo", async () => {
    const r = await crearProfesor({}, formulario({ estatusLaboral: "" }));
    expect(r).toMatchObject({ error: "Selecciona el estatus laboral.", campo: "estatusLaboral" });
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
  });
  it("A3: un valor fuera de la lista se rechaza con mensaje en español", async () => {
    const r = await crearProfesor({}, formulario({ estatusLaboral: "JUBILADO" }));
    expect(r.error).toBe("Selecciona el estatus laboral.");
    const c = await crearProfesor({}, formulario({ tipoContratacion: "HONORARIOS" }));
    expect(c.error).toBe("Selecciona el tipo de contratación.");
  });
  it("A4: guarda contratación y estatus elegidos (los 10 pares)", async () => {
    for (const t of TIPOS_CONTRATACION) {
      for (const e of ESTATUS_LABORALES) {
        prismaFalso.profesor.create.mockClear();
        const r = await crearProfesor({}, formulario({ tipoContratacion: t, estatusLaboral: e }));
        expect(r.error).toBeUndefined();
        expect(prismaFalso.profesor.create.mock.calls[0][0].data).toMatchObject({ tipoContratacion: t, estatusLaboral: e });
      }
    }
  });
});

describe("RF-006: edición", () => {
  it("E1: edita contratación y estatus con las mismas reglas", async () => {
    await expect(editarProfesor({}, formulario({ id: "7", tipoContratacion: "ASIGNATURA", estatusLaboral: "LICENCIA" })))
      .rejects.toThrow("REDIRECT /profesores?editado=");
    expect(prismaFalso.profesor.update.mock.calls[0][0].data).toMatchObject({ tipoContratacion: "ASIGNATURA", estatusLaboral: "LICENCIA" });
  });
  it("E2: en edición, un estatus inválido no escribe", async () => {
    const r = await editarProfesor({}, formulario({ id: "7", estatusLaboral: "" }));
    expect(r).toMatchObject({ error: "Selecciona el estatus laboral.", campo: "estatusLaboral" });
    expect(prismaFalso.profesor.update).not.toHaveBeenCalled();
  });
});

describe("RNF-005: permisos", () => {
  it("P1: sin permiso del módulo, las acciones ni consultan la base", async () => {
    sesion.requireModulo.mockRejectedValue(new Error("NO AUTORIZADO"));
    await expect(crearProfesor({}, formulario())).rejects.toThrow("NO AUTORIZADO");
    await expect(editarProfesor({}, formulario({ id: "7" }))).rejects.toThrow("NO AUTORIZADO");
    expect(prismaFalso.profesor.findMany).not.toHaveBeenCalled();
    expect(prismaFalso.profesor.create).not.toHaveBeenCalled();
    expect(prismaFalso.profesor.update).not.toHaveBeenCalled();
  });
});

describe("R1 del #69: P2002 con el adaptador pg (¿lo corrige el #72?)", () => {
  const p2002 = (indice: string) =>
    new Prisma.PrismaClientKnownRequestError("duplicado", {
      code: "P2002",
      clientVersion: "7",
      meta: { driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { index: indice } } }, table: "Profesor" },
    });
  it("R1a: mensajeUnicidadPrisma lee el índice del adaptador", () => {
    expect(mensajeUnicidadPrisma(p2002("Profesor_orcid_key").meta)).toEqual({ campo: "orcid", mensaje: "Ese ORCID ya está registrado." });
  });
  it("R1b: un alta que choca en carrera señala el ORCID, no el código", async () => {
    prismaFalso.profesor.create.mockRejectedValue(p2002("Profesor_orcid_key"));
    const r = await crearProfesor({}, formulario({ orcid: "0000-0001-2345-6789" }));
    expect(r).toMatchObject({ campo: "orcid", error: "Ese ORCID ya está registrado." });
  });
  it("R1c: un alta que choca en carrera por correo señala el correo", async () => {
    prismaFalso.profesor.create.mockRejectedValue(p2002("Profesor_correo_key"));
    const r = await crearProfesor({}, formulario());
    expect(r).toMatchObject({ campo: "correo" });
  });
});
```

</details>
