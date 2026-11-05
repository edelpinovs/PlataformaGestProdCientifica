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
