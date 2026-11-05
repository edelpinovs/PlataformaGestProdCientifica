# Prueba del PR #88: Líder único del cuerpo académico (RF-014)

Registro de la revisión del [PR #88](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/88) de `marisleidysvazquez8293-arch` (rama `feat/M4-RF-014-lider-ca`, commit `0329509`). Cierra #19. El comentario de revisión está publicado en el propio PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/cuerpos-academicos/lider.ts` (+ prueba) | Esquema `designarLider`, `revisarDesignacionLider` y `mensajeTrasDesignar` |
| `src/app/cuerpos-academicos/[id]/actions.ts` | Server Action `guardarLider` |
| `src/app/cuerpos-academicos/[id]/page.tsx`, `formulario.tsx`, `fila.tsx` | Panel «Líder del cuerpo académico» y etiqueta «Líder» en la fila |
| `src/app/cuerpos-academicos/page.tsx`, `fila.tsx` | Columna «Líder» en el listado |
| `src/modules/cuerpos-academicos/integrantes.ts`, `README.md` | Texto de la nota al dejar de ser líder; documentación |

Solo se tocan archivos del módulo `cuerpos-academicos`.

## 2. Chequeos automáticos

El PR ya estaba al día con `main` (incluye el PR #80).

| Chequeo | Resultado |
|---|---|
| `npm test` | 257 pruebas pasan (17 archivos); 248 del PR y 9 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `tsc --noEmit` sin errores; no se ejecutó `next typegen` (se colgó en el equipo de revisión) |
| `npm run build` | no se ejecutó en la copia; el CI del PR sí lo corrió y pasó (`verificar`) |

## 3. Pruebas de revisión

El código está en la sección 8.

| Id | Qué comprueba | Resultado |
|---|---|---|
| P1 | `profesorId` vacío, espacios, texto, 0, negativo, 1.5, `NaN` e `Infinity` dan «Elige un integrante.» | Pasa |
| P2 | Un envío válido se convierte a número | Pasa |
| C1 | `cuerpoId` 0, -1 o 1.5 no muestran texto en inglés | Pasa |
| C2 | Un `cuerpoId` inválido dice «Elige un integrante.», que no corresponde al campo | Pasa (describe el comportamiento actual, menor) |
| R1 | Id inexistente, negativo o `NaN` | Pasa |
| R2 | CA vacío tiene prioridad sobre «no elegiste a nadie» | Pasa |
| R3 | Cualquier integrante es válido, también el que ya es líder | Pasa |
| R4 | La regla acepta a quien ya no es integrante si la lista leída está vieja | Pasa (limitación: es una prueba de especificación; la escritura debe condicionarse en la base) |
| M1 | Textos de `mensajeTrasDesignar` en español | Pasa |

## 4. Hallazgos (publicados en el PR)

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Obligatorio | `guardarLider` escribe `liderId` sin condicionar a que siga siendo integrante; si lo quitan entre la lectura y la escritura queda un líder ajeno al CA. Usar `where: { id, integrantes: { some: { profesorId } } }` |
| 2 | Solicitado | Descripción del PR sin la plantilla: «Test plan» sin marcar y sin `npm test`/`lint`/`typecheck` |
| 3 | Solicitado | El listado conserva `overflow-x-auto` y suma una columna (8) |
| 4 | Menor | Mensaje de `cuerpoId` inválido no corresponde al campo |
| 5 | Menor | No hay forma de quitar el cargo sin quitar al integrante (el issue no lo pide) |
| 6 | Menor | La escritura condicionada no puede probarse sin la base |

## 5. Lo que el código cumple

- La Server Action empieza con `requireModulo("cuerpos-academicos")`.
- La regla de negocio es una función pura con 9 pruebas del PR.
- Mensajes en español para `profesorId`, también con valores atípicos.
- Un solo líder queda garantizado por `CuerpoAcademico.liderId`.

## 6. Dictamen

**Solicitar cambios** (publicado como comentario, sin bloquear): un cambio obligatorio y dos solicitados.

## 7. Lo que no se probó

- La pantalla en el navegador: tema claro, oscuro, celular, designar/cambiar/quitar líder y mensaje de éxito.
- La Server Action contra la base real y con carrera entre quitar y designar.
- `npm run build` y `next typegen` en la copia (los cubre el CI).

### Cómo repetirlo

```bash
git fetch origin pull/88/head:pr-88-rev
git worktree add ../wt-pr88 pr-88-rev
# copiar src/generated y enlazar node_modules; añadir el archivo de la sección 8
npx vitest run src/modules/cuerpos-academicos
```

## 8. Código de las pruebas de revisión

<details>
<summary><code>src/modules/cuerpos-academicos/revision-pr88.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import { designarLider, mensajeTrasDesignar, revisarDesignacionLider } from "./lider";

// Pruebas de revisión del PR #88 (no forman parte del PR).
const ana = { profesorId: 1, nombre: "López Ana (TC01)" };
const luis = { profesorId: 2, nombre: "Pérez Luis (TC02)" };
const mensajes = (entrada: unknown) => {
  const r = designarLider.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};
const enIngles = (m: string) => /Invalid|expected|received|Too small|Too big/i.test(m);

describe("revisión PR #88", () => {
  describe("profesorId: mensajes en español", () => {
    it("P1: valores atípicos dan «Elige un integrante.»", () => {
      for (const profesorId of ["", " ", "abc", "0", "-3", "1.5", "NaN", "Infinity"]) {
        const m = mensajes({ cuerpoId: "1", profesorId });
        expect(m, profesorId).toEqual(["Elige un integrante."]);
      }
    });
    it("P2: un envío válido se convierte a número", () => {
      expect(designarLider.parse({ cuerpoId: "3", profesorId: "7" })).toEqual({ cuerpoId: 3, profesorId: 7 });
    });
  });

  describe("cuerpoId: mensajes (envío manipulado)", () => {
    it("C1: cuerpoId 0, -1 o 1.5 no muestran texto en inglés (el mensaje del campo cubre sus reglas)", () => {
      for (const cuerpoId of ["0", "-1", "1.5"]) {
        const m = mensajes({ cuerpoId, profesorId: "1" });
        expect(m.length, cuerpoId).toBeGreaterThan(0);
        expect(m.some(enIngles), cuerpoId + " -> " + m.join("|")).toBe(false);
      }
    });
    it("C2 (menor): un cuerpoId inválido dice «Elige un integrante.», que no corresponde al campo", () => {
      expect(mensajes({ cuerpoId: "abc", profesorId: "1" })).toEqual(["Elige un integrante."]);
    });
  });

  describe("revisarDesignacionLider", () => {
    it("R1: id inexistente, negativo o NaN", () => {
      expect(revisarDesignacionLider(9, [ana, luis])?.mensaje).toMatch(/no es integrante/);
      expect(revisarDesignacionLider(-1, [ana])?.mensaje).toMatch(/no es integrante/);
      expect(revisarDesignacionLider(Number.NaN, [ana])?.mensaje).toBe("Elige un integrante.");
    });
    it("R2: CA vacío tiene prioridad sobre profesor no elegido", () => {
      expect(revisarDesignacionLider(undefined, [])?.mensaje).toMatch(/Primero asigna integrantes/);
    });
    it("R3: cualquier integrante es válido, también el que ya es líder", () => {
      expect(revisarDesignacionLider(1, [ana, luis])).toBeNull();
      expect(revisarDesignacionLider(2, [ana, luis])).toBeNull();
    });
    it("R4 (limitación): la regla trabaja sobre la lista leída antes; con una lista vieja acepta a quien ya no es integrante", () => {
      const listaVieja = [ana, luis];
      expect(revisarDesignacionLider(2, listaVieja)).toBeNull(); // luis pudo ser quitado después de leer
      // Por eso la escritura debe condicionarse en la base (integrantes: { some: { profesorId } }).
    });
  });

  describe("mensajeTrasDesignar", () => {
    it("M1: textos en español, sin duplicar el nombre", () => {
      expect(mensajeTrasDesignar("X", false)).toBe("Se designó a X como líder.");
      expect(mensajeTrasDesignar("X", true)).toBe("X ya es el líder de este cuerpo académico.");
    });
  });
});
```

</details>
