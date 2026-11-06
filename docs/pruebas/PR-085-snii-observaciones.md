# Prueba del PR #85: Observaciones de revisión al registro SNII (RF-007)

Registro de la revisión del [PR #85](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/85) de `Ared11` (rama `feat/M3-RF-007-registro-snii`, commit `e245410`). Aplica las observaciones y preguntas al equipo del [PR #79](../pruebas/PR-079-snii.md). El comentario de revisión está publicado en el propio PR. Referencia el issue #12, ya cerrado por el #79.

## 1. Alcance revisado

| Archivo | Qué cambia |
|---|---|
| `src/modules/reconocimientos/snii.ts` | `profesorId` con mensaje en español; CVU solo dígitos |
| `src/modules/reconocimientos/vigencia.ts` (+ prueba) | Nueva función pura `hayTraslape` |
| `src/app/reconocimientos/snii/actions.ts` | Revisión de traslape, confirmación de cambio de CVU, edición protegida con convocatoria |
| `src/app/reconocimientos/snii/formulario-campos.tsx`, `fila.tsx` | Casilla de confirmación del CVU; se oculta Editar con convocatoria |
| `src/app/reconocimientos/page.tsx` | `claseBoton` y panel PRODEP «Próximamente» |
| `.github/copilot-instructions.md` | Eliminado (archivo vacío, como se pidió) |
| `package-lock.json` | Cambio ajeno (ver hallazgo 1) |

Solo se tocan archivos del módulo `reconocimientos`, salvo el `package-lock.json`.

## 2. Chequeos automáticos

| Chequeo | Resultado |
|---|---|
| `npm test` | 225 pruebas pasan (16 archivos); 218 del PR y 7 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia (junction de `node_modules`); el CI del PR sí lo corrió y pasó (`verificar`) |

El PR ya estaba al día con `main`.

## 3. Pruebas de revisión

El código está en la sección 8. La prueba D1 **pasa porque describe el comportamiento actual, que es el problema**: al corregirlo debe invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| M1 | `profesorId` con `NaN`, 1.5, 0, negativo, `undefined`, `null`, texto e `Infinity` da «Selecciona un profesor.» | Pasa |
| M2 | CVU con espacios internos, signos, `e`, dígitos de ancho completo o árabes se rechaza; `"  000123  "` se acepta recortado | Pasa |
| M3 | Mensajes del CVU en español (no numérico, vacío, más de 30) | Pasa |
| M4 | Con cadenas (lo que envía la acción) ningún campo muestra texto en inglés | Pasa |
| T1 | `hayTraslape`: id 0, día compartido inclusivo, día siguiente, lista vacía | Pasa |
| T2 | Ignora el registro propio y devuelve otro que choque | Pasa |
| D1 | La guarda usa el nivel, no el resultado: «No aprobado» con reconsideración se guarda como `EN_RECONSIDERACION` sin revisar traslape | Pasa (confirma el defecto, hallazgo 3) |

## 4. Hallazgos (publicados en el PR)

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Obligatorio | `package-lock.json` cambia `name` a `pgpc` y quita `hasInstallScript`, sin coincidir con `package.json`; restaurar desde `main` |
| 2 | Solicitado | Cuerpo del PR con `Closes #` vacío; usar `Refs #12` o quitarlo |
| 3 | Solicitado | La revisión de traslape se omite según el nivel y no según el resultado; usar `resultadoSnii(...) !== "NO_APROBADO"` |
| 4 | Menor | Confirmación del CVU y protección por convocatoria sin prueba (extraer función pura) |
| 5 | Menor | Archivos nuevos sin salto de línea final |
| 6 | Menor | Traslape sin respaldo en la base (pendiente de acordar) |

Resuelto correctamente: mensajes en español, CVU numérico, `hayTraslape`, edición protegida con `updateMany` condicionado, confirmación del CVU en servidor y formulario, panel PRODEP y `claseBoton`.

## 5. Dictamen

**Solicitar cambios** (publicado como comentario, sin bloquear): un cambio obligatorio (lockfile) y dos solicitados.

## 6. Lo que no se probó

- La pantalla en el navegador: tema claro, oscuro, celular, casilla de confirmación del CVU, mensaje de traslape y fila con convocatoria.
- Las Server Actions contra la base real.
- `npm run build` en la copia (lo cubre el CI).

## 7. Cómo repetir

```bash
git fetch origin pull/85/head:pr-85-rev
git worktree add ../wt-pr85 pr-85-rev
# copiar src/generated y enlazar node_modules; añadir el archivo de la sección 8
npx vitest run src/modules/reconocimientos
```

## 8. Código de las pruebas de revisión

<details>
<summary><code>src/modules/reconocimientos/revision-pr85.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import { reconocimientoSnii, resultadoSnii } from "./snii";
import { hayTraslape } from "./vigencia";

const base = {
  profesorId: 1, cvu: "123456", nivel: "NIVEL_1", tipoParticipacion: "RENOVACION",
  fechaInicio: "2026-01-01", fechaFin: "2027-01-01", enRecursoReconsideracion: false,
} as const;
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("Revisión PR #85", () => {
  it("M1: profesorId atípico siempre da el mensaje en español", () => {
    for (const profesorId of [Number.NaN, 1.5, 0, -2, undefined, null, "3", Infinity]) {
      const r = reconocimientoSnii.safeParse({ ...base, profesorId });
      expect(r.success).toBe(false);
      if (!r.success) {
        const m = r.error.issues.find((i) => i.path[0] === "profesorId")?.message;
        expect(m, String(profesorId)).toBe("Selecciona un profesor.");
      }
    }
  });

  it("M2: CVU solo dígitos ASCII; espacios internos, signos y dígitos de ancho completo se rechazan", () => {
    for (const cvu of ["12 34", "12-34", "1.5", "+123", "１２３", "12e3", "١٢٣"]) {
      const r = reconocimientoSnii.safeParse({ ...base, cvu });
      expect(r.success, cvu).toBe(false);
    }
    const ok = reconocimientoSnii.safeParse({ ...base, cvu: "  000123  " });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.cvu).toBe("000123");
  });

  it("M3: mensajes de CVU en español", () => {
    const msg = (cvu: string) => {
      const r = reconocimientoSnii.safeParse({ ...base, cvu });
      return r.success ? null : r.error.issues[0]?.message;
    };
    expect(msg("abc")).toBe("El CVU solo puede contener números.");
    expect(msg("")).toBe("El CVU es obligatorio.");
    expect(msg("1".repeat(31))).toBe("El CVU no puede superar 30 caracteres.");
  });

  it("M4: con lo que realmente envía la acción (cadenas), ningún campo muestra texto en inglés", () => {
    const campos = ["nivel", "tipoParticipacion", "fechaInicio", "fechaFin"] as const;
    for (const c of campos) {
      for (const v of ["", "x", "2026-02-30"]) {
        const r = reconocimientoSnii.safeParse({ ...base, [c]: v });
        if (!r.success) {
          const m = r.error.issues[0]?.message ?? "";
          expect(/Invalid|expected|received/i.test(m), `${c}=${String(v)} -> ${m}`).toBe(false);
        }
      }
    }
  });

  it("T1: hayTraslape con id 0 y extremos", () => {
    const nuevo = { inicio: d("2026-03-01"), fin: d("2026-03-10") };
    expect(hayTraslape([{ id: 0, ...nuevo }], nuevo, 0)).toBeNull();
    expect(hayTraslape([{ id: 1, inicio: d("2026-03-10"), fin: d("2026-03-20") }], nuevo)).not.toBeNull();
    expect(hayTraslape([{ id: 1, inicio: d("2026-03-11"), fin: d("2026-03-20") }], nuevo)).toBeNull();
    expect(hayTraslape([], nuevo)).toBeNull();
  });

  it("T2: devuelve el primero; ignora el propio y detecta otro", () => {
    const nuevo = { inicio: d("2026-03-01"), fin: d("2026-03-10") };
    const propio = { id: 7, ...nuevo };
    const otro = { id: 8, inicio: d("2026-03-05"), fin: d("2026-03-06") };
    expect(hayTraslape([propio, otro], nuevo, 7)).toBe(otro);
  });

  it("D1 (defecto): la guarda de traslape usa el nivel, no el resultado; NO_APROBADO + reconsideración queda sin revisar", () => {
    // En actions.ts: `if (datos.nivel !== "NO_APROBADO")` revisa; el resultado guardado puede ser otro.
    const resultado = resultadoSnii("NO_APROBADO", true);
    expect(resultado).toBe("EN_RECONSIDERACION"); // se guarda con resultado distinto de NO_APROBADO
    const seRevisaHoy = "NO_APROBADO" !== "NO_APROBADO"; // lo que evalúa la guarda actual
    const deberiaRevisarse = resultado !== "NO_APROBADO";
    expect(seRevisaHoy).toBe(false);
    expect(deberiaRevisarse).toBe(true); // confirma el defecto: invertir al corregir
  });
});
```

</details>

## 9. Cambios aplicados por I1: commit `260e1c4` (5 de noviembre)

La rama del PR no tenía cambios nuevos de la autora desde `e245410` (el mismo commit de la revisión). Para avanzar, I1 aplicó los cambios pendientes y subió un commit a la rama sin reescribir su historial. Se avisó en un comentario del PR.

### 9.1 Qué se hizo

| Hallazgo | Cambio |
|---|---|
| 1. `package-lock.json` | Restaurado al de `main` |
| 2. `Closes #` vacío | La descripción pasa a `Refs #12` (el #79 ya cerró el issue) |
| 3. Traslape por nivel y no por resultado | `resultadoSnii(...) !== "NO_APROBADO"` decide si se revisa el traslape; la acción usa el mismo `resultado` para guardar |
| 5. Sin salto de línea final | Agregado en los 7 archivos del PR que lo necesitaban |
| 4 (parcial). Sin prueba de la acción | Nueva `actions.test.ts` con 4 pruebas (código en 9.4) |

Además se integró `main` en la rama (71 commits, sin conflictos). El #63, el #98 y el #100 ya estaban integrados.

### 9.2 Chequeos

| Chequeo | Resultado |
|---|---|
| `npm test` | 485 pruebas pasan (37 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR lo corre |

La prueba del caso de reconsideración **falla con el código anterior** (se comprobó restaurando la guarda por nivel) y pasa con el arreglo. La D1 de la sección 3, que solo simulaba la guarda, queda reemplazada por esta prueba.

### 9.3 Estado de los hallazgos

| # | Estado |
|---|---|
| 1, 2, 3, 5 | Corregidos en `260e1c4` |
| 4 | Parcial: traslape y permiso cubiertos; la confirmación del CVU y la protección por convocatoria siguen sin prueba |
| 6 | Abierto: respaldo del traslape en la base (D-201) |

### 9.4 Código de la prueba nueva

<details>
<summary><code>src/app/reconocimientos/snii/actions.test.ts</code></summary>

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarReconocimientoSnii } from "./actions";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  profesor: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  reconocimientoSnii: { findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), RedirectType: { replace: "replace" } }));

function formulario(extra: Record<string, string> = {}) {
  const datos = new FormData();
  const base: Record<string, string> = {
    profesorId: "7", cvu: "123456", nivel: "NIVEL_1", tipoParticipacion: "RENOVACION",
    fechaInicio: "2026-01-01", fechaFin: "2026-12-31", ...extra,
  };
  for (const [clave, valor] of Object.entries(base)) datos.set(clave, valor);
  return datos;
}

const existente = { id: 1, inicio: new Date("2026-06-01T00:00:00.000Z"), fin: new Date("2027-05-31T00:00:00.000Z") };

describe("RF-007: traslape de periodos SNII según el resultado guardado", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dobles.requireModulo.mockResolvedValue({ rol: "ADMINISTRADOR" });
    dobles.profesor.findUnique.mockResolvedValue({ id: 7, cvu: "123456" });
    dobles.profesor.findFirst.mockResolvedValue(null);
    dobles.reconocimientoSnii.findMany.mockResolvedValue([existente]);
    dobles.$transaction.mockResolvedValue({ error: null });
  });

  it("un nivel aprobado que choca con otro periodo se rechaza", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario());
    expect(estado.error).toMatch(/se traslapa/);
    expect(dobles.$transaction).not.toHaveBeenCalled();
  });

  it("NO_APROBADO en reconsideración se guarda como EN_RECONSIDERACION y también revisa el traslape", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario({ nivel: "NO_APROBADO", enRecursoReconsideracion: "on" }));
    expect(dobles.reconocimientoSnii.findMany).toHaveBeenCalledOnce();
    expect(estado.error).toMatch(/se traslapa/);
    expect(dobles.$transaction).not.toHaveBeenCalled();
  });

  it("NO_APROBADO sin reconsideración no revisa el traslape", async () => {
    const estado = await registrarReconocimientoSnii({}, formulario({ nivel: "NO_APROBADO" }));
    expect(dobles.reconocimientoSnii.findMany).not.toHaveBeenCalled();
    expect(estado.error).toBeUndefined();
    expect(dobles.$transaction).toHaveBeenCalledOnce();
  });

  it("exige permiso antes de leer la base", async () => {
    dobles.requireModulo.mockRejectedValue(new Error("Sin permiso"));
    await expect(registrarReconocimientoSnii({}, formulario())).rejects.toThrow("Sin permiso");
    expect(dobles.profesor.findUnique).not.toHaveBeenCalled();
  });
});
```

</details>

### 9.5 Lo que no se probó

- La pantalla en el navegador (claro, oscuro, celular, casilla del CVU, mensaje de traslape, fila con convocatoria).
- Las Server Actions contra la base real.
- `npm run build` en la copia.

### 9.6 Dictamen

**Aprobable con comentarios** tras los cambios. Falta ver la pantalla y acordar D-201.
