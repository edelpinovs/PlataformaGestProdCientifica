# Prueba del PR #79: Registro y actualización de reconocimientos SNII (RF-007)

Registro de la revisión del [PR #79](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/79) de `Ared11` (rama `feat/M3-RF-007-registro-snii`, commit `d34fd74`). Cierra #12. El comentario de revisión está publicado en el propio PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/reconocimientos/snii.ts` | Esquema Zod (CVU, nivel, tipo, fechas) y `resultadoSnii` |
| `src/app/reconocimientos/snii/actions.ts` | Server Actions: registrar, editar y eliminar |
| `src/app/reconocimientos/snii/page.tsx`, `fila.tsx`, `formulario*.tsx` | Pantalla, formulario y listado |
| `src/app/reconocimientos/page.tsx` | Entrada al módulo |
| `.github/copilot-instructions.md`, `package-lock.json` | Ajenos a la tarea (ver hallazgo 1) |

Solo se tocan archivos del módulo `reconocimientos`, salvo los dos ajenos. No hay cambios en `prisma/schema.prisma`, `src/lib/` ni `src/components/`.

## 2. Chequeos automáticos

El PR estaba atrasado respecto de `main`. Se combinó `main` en una copia aislada (sin conflictos, no se subió) y se añadieron las pruebas de revisión:

| Chequeo | Resultado |
|---|---|
| `npm test` | 190 pruebas pasan (13 archivos), 21 son de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia (ver sección 7); el CI del PR sí lo corrió y pasó (`verificar`) |

## 3. Pruebas de revisión

El código está en la sección 9. Las pruebas marcadas "confirma el defecto" **pasan porque describen el comportamiento actual, que es el problema**: cuando se corrija deben invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| C1, C2 | El esquema acepta un CVU no numérico (`abc-xyz`) y con espacios y símbolos | Pasan (confirman el defecto, hallazgo 4) |
| C3, C4 | CVU de 30 caracteres pasa y de 31 se rechaza; vacío o de espacios se rechaza | Pasan |
| N1 | Con `profesorId` NaN el mensaje sale en inglés: "Invalid input: expected number, received NaN" | Pasa (confirma el defecto) |
| N2 | `profesorId` 0, negativo o decimal se rechaza con mensaje en español | Pasa |
| F1 | Rechaza `2026-02-29`, `2026-13-01` y formatos distintos | Pasa |
| F2 | Acepta el 29 de febrero de un año bisiesto | Pasa |
| F3, F4 | Fin igual al inicio se rechaza (error en `fechaFin`); un día después se acepta | Pasan |
| F5 | Una fecha inválida no produce además el error de orden | Pasa |
| F6 | No hay tope de fechas: acepta 1900 y 3000 | Pasa (decisión pendiente) |
| E1–E3 | Niveles y tipos coinciden con el esquema; los válidos pasan; los desconocidos dan mensaje en español | Pasan |
| R1–R3 | `resultadoSnii`: aprobado, no aprobado, y cualquier nivel con recurso queda en reconsideración | Pasan |
| R4 | Un registro en reconsideración reabre con la casilla marcada y se guarda igual | Pasa |
| P1, P2 | Regla propuesta: un registro con convocatoria no se edita (hallazgo 2) | Pasan |

Las pruebas P1 y P2 prueban una función escrita dentro de la propia prueba: sirven de especificación para la regla que falta, no verifican el código del PR.

## 4. Hallazgos (publicados en el PR)

1. **Archivos ajenos:** `.github/copilot-instructions.md` (vacío) y cambios en `package-lock.json`.
2. **Editar protege menos que eliminar:** un reconocimiento con `convocatoriaId` no se puede borrar, pero sí editar (por lectura del código; requiere la base para probarlo).
3. **Se pisa el CVU del profesor sin aviso** en cada alta o edición (por lectura del código).
4. **El CVU solo valida longitud** (C1, C2).
5. A verificar en navegador: el formulario de edición probablemente queda abierto tras guardar, porque la fila se identifica solo por `id`.
6. Preguntas al equipo: mensaje en español para `NaN` (N1), `claseBoton` en el enlace de entrada, título "SNII y PRODEP" y traslape de periodos SNII. La prueba F6 añade una duda: no hay tope de fechas.

## 5. Lo que el código cumple

- La página y las cuatro Server Actions empiezan con `requireModulo("reconocimientos")`.
- Las fechas se validan como días reales, incluidos los bisiestos (F1, F2), y el orden inicio/fin (F3, F4).
- Eliminar usa `deleteMany` con `convocatoriaId: null` y explica por qué no borra.
- Alta y edición usan `$transaction` y capturan `P2002`, `P2025` y `P2003`.
- El CVU es único: se comprueba en el servicio y está respaldado por `@unique`.
- El listado se apila en celular y los campos llevan `aria-invalid`.

## 6. Dictamen

**Solicitar cambios, ligeros.** Es obligatorio el hallazgo 1. Los hallazgos 2 y 3 se piden o quedan justificados por escrito; el 4 es una mejora razonable.

## 7. Lo que no se probó

- `npm run build` en mi copia (el enlace a `node_modules` no sirve para Turbopack); lo cubre el CI.
- La pantalla en el navegador: tema claro, tema oscuro y celular; si el formulario de edición queda abierto tras guardar.
- Las Server Actions contra la base real: la edición de un registro con convocatoria, el reemplazo del CVU y la transacción.
- El traslape de periodos SNII: no hay regla que probar, por eso es una pregunta.

## 8. Cómo repetirlo

```bash
git fetch origin pull/79/head:pr-79
git worktree add ../wt-pr79 pr-79
git -C ../wt-pr79 merge origin/main
# copiar el archivo de la sección 9 a src/modules/reconocimientos/revision-pr79.test.ts
npx vitest run src/modules/reconocimientos
```

## 9. Código de las pruebas

<details>
<summary><code>src/modules/reconocimientos/revision-pr79.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import {
  NIVELES_SNII,
  reconocimientoSnii,
  resultadoSnii,
  TIPOS_PARTICIPACION_SNII,
} from "./snii";

// Pruebas de revisión del PR #79 (no forman parte del PR).
const base = {
  profesorId: 1,
  cvu: "123456",
  nivel: "NIVEL_1",
  tipoParticipacion: "RENOVACION",
  fechaInicio: "2026-01-01",
  fechaFin: "2029-12-31",
  enRecursoReconsideracion: false,
} as const;

const mensaje = (entrada: unknown) => {
  const r = reconocimientoSnii.safeParse(entrada);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("revisión PR #79", () => {
  describe("hallazgo 4: CVU", () => {
    it("C1: el esquema acepta un CVU que no es numérico", () => {
      expect(reconocimientoSnii.safeParse({ ...base, cvu: "abc-xyz" }).success).toBe(true);
    });
    it("C2: acepta un CVU con espacios internos y símbolos", () => {
      expect(reconocimientoSnii.parse({ ...base, cvu: "12 34/56" }).cvu).toBe("12 34/56");
    });
    it("C3: 30 caracteres pasa y 31 se rechaza", () => {
      expect(reconocimientoSnii.safeParse({ ...base, cvu: "1".repeat(30) }).success).toBe(true);
      expect(mensaje({ ...base, cvu: "1".repeat(31) })).toContain("30 caracteres");
    });
    it("C4: un CVU vacío o de solo espacios se rechaza", () => {
      expect(mensaje({ ...base, cvu: "" })).toBe("El CVU es obligatorio.");
      expect(mensaje({ ...base, cvu: "   " })).toBe("El CVU es obligatorio.");
    });
  });

  describe("menor: mensaje cuando profesorId es NaN", () => {
    it("N1: el mensaje sale en inglés", () => {
      expect(mensaje({ ...base, profesorId: Number.NaN })).toBe("Invalid input: expected number, received NaN");
    });
    it("N2: 0, negativo y decimal se rechazan", () => {
      expect(mensaje({ ...base, profesorId: 0 })).toBe("Selecciona un profesor.");
      expect(mensaje({ ...base, profesorId: -3 })).toBe("Selecciona un profesor.");
      expect(reconocimientoSnii.safeParse({ ...base, profesorId: 1.5 }).success).toBe(false);
    });
  });

  describe("fechas (lo que el PR hace bien)", () => {
    it("F1: rechaza 2026-02-29, 2026-13-01 y el formato dd-mm-aaaa", () => {
      for (const fechaInicio of ["2026-02-29", "2026-13-01", "01-01-2026", "2026-1-1"]) {
        expect(reconocimientoSnii.safeParse({ ...base, fechaInicio }).success).toBe(false);
      }
    });
    it("F2: acepta el 29 de febrero de un año bisiesto", () => {
      expect(reconocimientoSnii.safeParse({ ...base, fechaInicio: "2028-02-29", fechaFin: "2028-03-01" }).success).toBe(true);
    });
    it("F3: fin igual al inicio se rechaza y el error queda en fechaFin", () => {
      const r = reconocimientoSnii.safeParse({ ...base, fechaInicio: "2026-05-05", fechaFin: "2026-05-05" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.path[0]).toBe("fechaFin");
    });
    it("F4: fin un día después del inicio se acepta", () => {
      expect(reconocimientoSnii.safeParse({ ...base, fechaInicio: "2026-05-05", fechaFin: "2026-05-06" }).success).toBe(true);
    });
    it("F5: una fecha inválida no produce además el error de orden", () => {
      const r = reconocimientoSnii.safeParse({ ...base, fechaInicio: "2026-13-01" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.map((i) => i.message)).not.toContain("La fecha de fin debe ser posterior a la fecha de inicio.");
    });
    it("F6: no hay tope de fechas: acepta una vigencia de 1900 o de 2999", () => {
      expect(reconocimientoSnii.safeParse({ ...base, fechaInicio: "1900-01-01", fechaFin: "1901-01-01" }).success).toBe(true);
      expect(reconocimientoSnii.safeParse({ ...base, fechaInicio: "2999-01-01", fechaFin: "3000-01-01" }).success).toBe(true);
    });
  });

  describe("enumeraciones", () => {
    it("E1: todos los niveles y tipos del PR existen en el esquema", () => {
      expect([...NIVELES_SNII]).toEqual(["CANDIDATO", "NIVEL_1", "NIVEL_2", "NIVEL_3", "EMERITO", "NO_APROBADO"]);
      expect([...TIPOS_PARTICIPACION_SNII]).toEqual(["NUEVO_INGRESO", "RENOVACION", "REINGRESO_NO_VIGENTE"]);
    });
    it("E2: cada nivel y cada tipo válidos pasan", () => {
      for (const nivel of NIVELES_SNII) expect(reconocimientoSnii.safeParse({ ...base, nivel }).success).toBe(true);
      for (const tipoParticipacion of TIPOS_PARTICIPACION_SNII) {
        expect(reconocimientoSnii.safeParse({ ...base, tipoParticipacion }).success).toBe(true);
      }
    });
    it("E3: un nivel o tipo desconocido da mensaje en español", () => {
      expect(mensaje({ ...base, nivel: "NIVEL_4" })).toBe("Selecciona un nivel SNII válido.");
      expect(mensaje({ ...base, tipoParticipacion: "OTRO" })).toBe("Selecciona un tipo de participación válido.");
    });
  });

  describe("resultadoSnii", () => {
    it("R1: sin recurso, todo nivel distinto de NO_APROBADO es APROBADO", () => {
      for (const nivel of NIVELES_SNII.filter((n) => n !== "NO_APROBADO")) {
        expect(resultadoSnii(nivel, false)).toBe("APROBADO");
      }
    });
    it("R2: NO_APROBADO sin recurso es NO_APROBADO", () => {
      expect(resultadoSnii("NO_APROBADO", false)).toBe("NO_APROBADO");
    });
    it("R3: con recurso, cualquier nivel queda EN_RECONSIDERACION (incluso un Nivel 3)", () => {
      for (const nivel of NIVELES_SNII) expect(resultadoSnii(nivel, true)).toBe("EN_RECONSIDERACION");
    });
    it("R4: ida y vuelta de edición: un registro EN_RECONSIDERACION reabre con la casilla marcada y se guarda igual", () => {
      // La pantalla de edición deriva la casilla de `resultado === "EN_RECONSIDERACION"`; al guardar de nuevo se recalcula igual.
      const guardado = resultadoSnii("NIVEL_3", true);
      expect(resultadoSnii("NIVEL_3", guardado === "EN_RECONSIDERACION")).toBe("EN_RECONSIDERACION");
    });
  });

  describe("hallazgo 2: regla propuesta para registros con convocatoria", () => {
    // Especificación de la regla que falta; hoy solo `eliminarReconocimientoSnii` la aplica.
    const puedeEditar = (r: { convocatoriaId: number | null }) => r.convocatoriaId === null;
    it("P1: un registro de resultado oficial no se edita", () => {
      expect(puedeEditar({ convocatoriaId: 7 })).toBe(false);
    });
    it("P2: un registro manual sí se edita", () => {
      expect(puedeEditar({ convocatoriaId: null })).toBe(true);
    });
  });
});
```

</details>
