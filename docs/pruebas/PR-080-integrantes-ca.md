# Prueba del PR #80: Integrantes de tiempo completo con PRODEP activo (RF-013)

Registro de la revisión del [PR #80](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/80) de `marisleidysvazquez8293-arch` (rama `feat/M4-RF-013-integrantes-ca`, commit `9445b22`). Cierra #18. El comentario de revisión está publicado en el propio PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/cuerpos-academicos/integrantes.ts` | Reglas de alta, baja y cambio de integrante, `tieneProdepActivo`, esquema Zod |
| `src/app/cuerpos-academicos/[id]/actions.ts` | Server Actions: asignar, cambiar y quitar integrante |
| `src/app/cuerpos-academicos/[id]/page.tsx`, `fila.tsx`, `formulario.tsx` | Pantalla del cuerpo académico y sus integrantes |
| `src/app/cuerpos-academicos/page.tsx`, `fila.tsx` | Columna "Integrantes" y enlace al detalle |

Solo se tocan archivos del módulo `cuerpos-academicos`: no hay cambios en `prisma/schema.prisma`, `src/lib/` ni `src/components/`.

## 2. Chequeos automáticos

Sobre el commit `9445b22` (ya incluye `main`), en una copia aislada con las pruebas de revisión añadidas:

| Chequeo | Resultado |
|---|---|
| `npm test` | 201 pruebas pasan (13 archivos), 19 son de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia (ver sección 7); el CI del PR sí lo corrió y pasó (`verificar`) |

## 3. Pruebas de revisión

El código está en la sección 9. Las pruebas marcadas "confirma el defecto" **pasan porque describen el comportamiento actual, que es el problema**: cuando se corrija deben invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| B1 | CA con A (PRODEP vencido) y B (sin PRODEP): no se puede quitar a A | Pasa (confirma el defecto) |
| B2 | Lo mismo al quitar a B | Pasa (confirma el defecto) |
| B3 | No se puede cambiar a A por otra persona sin PRODEP | Pasa (confirma el defecto) |
| B4 | Ni siquiera se puede editar a A conservándose a sí mismo | Pasa (confirma el defecto) |
| B5 | Tampoco se puede agregar a alguien más sin PRODEP | Pasa (confirma el defecto) |
| B6 | La única salida es agregar a alguien con PRODEP vigente | Pasa |
| B7 | Con un solo integrante sin PRODEP sí se puede quitar | Pasa |
| N1, N2 | Regla propuesta: bloquear solo si el cambio empeora la situación | Pasan |
| S1 | La regla acepta a un profesor de tiempo completo dado de baja | Pasa (confirma el defecto) |
| S2 | Un profesor de asignatura sigue rechazado | Pasa |
| V1, V2, V4 | Bordes de `tieneProdepActivo`: un dictamen vigente basta; último día; periodo invertido | Pasan |
| V3 | A las 20:00 de México del último día, el día UTC ya es el siguiente y se considera vencido | Pasa (confirma el borde) |
| A1–A4 | Reglas del alta y del cambio con PRODEP | Pasan |

Las pruebas N1 y N2 prueban una función escrita dentro de la propia prueba: sirven de especificación para corregir `sinProdepEn`, no verifican el código del PR.

## 4. Hallazgos (publicados en el PR)

1. **CA bloqueado cuando el PRODEP vence** (B1–B5): la regla se evalúa sobre el conjunto resultante sin comparar con el estado anterior. Un CA sin PRODEP vigente no permite quitar, cambiar ni editar a nadie, y tampoco borrar el CA (RF-012 no borra uno con integrantes). Solo sale agregando a alguien con PRODEP vigente (B6).
2. **El servidor no exige estatus activo** (S1): la lista lo filtra, pero `revisarAltaIntegrante` no.
3. **`quitarIntegrante` no es atómica**: borra el vínculo y limpia `liderId` en consultas separadas. Por lectura del código; no hay prueba porque requiere la base.
4. **Se borra el líder en silencio** al editar o quitar al líder.
5. **La regla PRODEP está duplicada** respecto de `src/lib/inicio.ts` y de la futura `tiene_prodep_activo()` de I3.
6. Menores: mensajes por la URL (`?editado=`), `hoyUtc()` repetido y el borde de huso horario (V3).

## 5. Lo que el código cumple

- La página y las tres Server Actions empiezan con `requireModulo("cuerpos-academicos")`.
- Captura `P2002` (ya es integrante) y `P2003` (profesor o CA borrado).
- `cambiarIntegrante` usa `$transaction` y no choca consigo mismo.
- Solo tiempo completo, sin duplicados, y el primer integrante debe tener PRODEP (A1–A4, S2).
- Quitar al último integrante deja el CA vacío (B7).

## 6. Dictamen

**Solicitar cambios.** Son obligatorios los hallazgos 1 y 2. Los hallazgos 3 a 5 se piden, pero se pueden acordar con el equipo.

## 7. Lo que no se probó

- `npm run build` en mi copia (el enlace a `node_modules` no sirve para Turbopack); lo cubre el CI.
- La pantalla en el navegador: tema claro, tema oscuro y celular; si la fila queda abierta al editar con el mismo profesor; el desplazamiento horizontal de la tabla en celular.
- Las Server Actions contra la base real, la atomicidad del hallazgo 3 y el comportamiento con dos personas editando a la vez.
- Datos reales: el alta completa no se probó porque no hay un PRODEP vigente en la base.

## 8. Cómo repetirlo

```bash
git fetch origin pull/80/head:pr-80
git worktree add ../wt-pr80 pr-80
# copiar el archivo de la sección 9 a src/modules/cuerpos-academicos/revision-pr80.test.ts
npx vitest run src/modules/cuerpos-academicos
```

## 9. Código de las pruebas

<details>
<summary><code>src/modules/cuerpos-academicos/revision-pr80.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import {
  revisarAltaIntegrante,
  revisarBajaIntegrante,
  revisarCambioIntegrante,
  tieneProdepActivo,
  type IntegranteResumen,
  type ProfesorParaCa,
} from "./integrantes";

// Pruebas de revisión del PR #80 (no forman parte del PR).
const profesor = (id: number, prodepActivo: boolean): ProfesorParaCa => ({
  id,
  nombres: `Nombre${id}`,
  apellidos: `Apellido${id}`,
  codigo: `TC${id}`,
  tipoContratacion: "TIEMPO_COMPLETO",
  prodepActivo,
});
const integrante = (id: number, prodepActivo: boolean): IntegranteResumen => ({
  profesorId: id,
  nombre: `Apellido${id} Nombre${id} (TC${id})`,
  prodepActivo,
});

describe("revisión PR #80", () => {
  describe("hallazgo 1: CA sin PRODEP vigente queda bloqueado", () => {
    // A tuvo PRODEP y venció; B nunca lo tuvo.
    const atascado = [integrante(1, false), integrante(2, false)];

    it("B1: no se puede quitar a A", () => {
      expect(revisarBajaIntegrante(1, atascado)).toMatch(/se quedaría sin un integrante con PRODEP/);
    });
    it("B2: no se puede quitar a B", () => {
      expect(revisarBajaIntegrante(2, atascado)).toMatch(/se quedaría sin un integrante con PRODEP/);
    });
    it("B3: no se puede cambiar a A por otra persona sin PRODEP", () => {
      expect(revisarCambioIntegrante(1, profesor(3, false), atascado)?.mensaje).toMatch(/PRODEP activo/);
    });
    it("B4: ni siquiera se puede editar a A conservándose a sí mismo", () => {
      expect(revisarCambioIntegrante(1, profesor(1, false), atascado)?.mensaje).toMatch(/PRODEP activo/);
    });
    it("B5: tampoco se puede agregar a alguien más sin PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(3, false), atascado)?.mensaje).toMatch(/PRODEP activo/);
    });
    it("B6: la única salida es agregar a alguien con PRODEP vigente", () => {
      expect(revisarAltaIntegrante(profesor(3, true), atascado)).toBeNull();
    });
    it("B7: con un solo integrante sin PRODEP sí se puede quitar (CA vacío)", () => {
      expect(revisarBajaIntegrante(1, [integrante(1, false)])).toBeNull();
    });
  });

  describe("hallazgo 1: regla propuesta (solo bloquea si empeora)", () => {
    const hayProdep = (l: IntegranteResumen[]) => l.some((i) => i.prodepActivo);
    const bajaPropuesta = (id: number, l: IntegranteResumen[]) => {
      const restantes = l.filter((i) => i.profesorId !== id);
      return hayProdep(l) && restantes.length > 0 && !hayProdep(restantes) ? "bloqueado" : null;
    };

    it("N1: sin PRODEP desde antes, quitar a cualquiera se permite", () => {
      const atascado = [integrante(1, false), integrante(2, false)];
      expect(bajaPropuesta(1, atascado)).toBeNull();
      expect(bajaPropuesta(2, atascado)).toBeNull();
    });
    it("N2: con un único PRODEP y otros integrantes, quitarlo sigue bloqueado", () => {
      const dos = [integrante(1, true), integrante(2, false)];
      expect(bajaPropuesta(1, dos)).toBe("bloqueado");
      expect(bajaPropuesta(2, dos)).toBeNull();
    });
  });

  describe("hallazgo 2: estatus laboral", () => {
    it("S1: la regla acepta a un profesor de tiempo completo aunque esté dado de baja", () => {
      const dadoDeBaja = { ...profesor(5, true), estatusLaboral: "BAJA" } as ProfesorParaCa;
      expect(revisarAltaIntegrante(dadoDeBaja, [])).toBeNull();
    });
    it("S2: un profesor de asignatura sigue rechazado", () => {
      const asignatura: ProfesorParaCa = { ...profesor(6, true), tipoContratacion: "ASIGNATURA" };
      expect(revisarAltaIntegrante(asignatura, [])?.mensaje).toMatch(/no es de tiempo completo/);
    });
  });

  describe("tieneProdepActivo: bordes", () => {
    const aprobado = (inicio: string, fin: string) => ({
      resultado: "APROBADO",
      inicio: new Date(inicio),
      fin: new Date(fin),
    });

    it("V1: basta un dictamen vigente aunque otros hayan vencido", () => {
      const hoy = new Date("2026-11-04T12:00:00Z");
      expect(
        tieneProdepActivo([aprobado("2018-01-01", "2020-12-31"), aprobado("2025-01-01", "2028-12-31")], hoy),
      ).toBe(true);
    });
    it("V2: el último día de vigencia cuenta, también a las 23:59 UTC", () => {
      expect(tieneProdepActivo([aprobado("2025-01-01", "2026-11-04")], new Date("2026-11-04T23:59:00Z"))).toBe(true);
    });
    it("V3: en México (UTC-6) a las 20:00 del último día, el día UTC ya es el siguiente y se considera vencido", () => {
      // 2026-11-04 20:00 en México = 2026-11-05 02:00 UTC
      expect(tieneProdepActivo([aprobado("2025-01-01", "2026-11-04")], new Date("2026-11-05T02:00:00Z"))).toBe(false);
    });
    it("V4: un periodo con fin anterior al inicio nunca está vigente", () => {
      expect(tieneProdepActivo([aprobado("2027-01-01", "2026-01-01")], new Date("2026-11-04T12:00:00Z"))).toBe(false);
    });
  });

  describe("RF-013: reglas del alta", () => {
    it("A1: el primer integrante debe tener PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(1, false), [])?.mensaje).toMatch(/PRODEP activo/);
    });
    it("A2: con PRODEP en el conjunto se puede sumar a alguien sin PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(2, false), [integrante(1, true)])).toBeNull();
    });
    it("A3: cambiar al único PRODEP por otro con PRODEP es válido", () => {
      expect(revisarCambioIntegrante(1, profesor(3, true), [integrante(1, true), integrante(2, false)])).toBeNull();
    });
    it("A4: cambiar al único PRODEP por alguien sin PRODEP se rechaza", () => {
      expect(
        revisarCambioIntegrante(1, profesor(3, false), [integrante(1, true), integrante(2, false)])?.mensaje,
      ).toMatch(/PRODEP activo/);
    });
  });
});
```

</details>

## 10. Seguimiento: commit `a3ba897` (5 de noviembre)

Tras la revisión, la autora subió seis commits (`f3a9780` a `a3ba897`). Se repitió la prueba sobre el PR combinado con `main` en una copia aislada. Las pruebas B1–B5 y S1 de la sección 3 **fallan ahora**, como se esperaba (los defectos se corrigieron), y se reescribieron en positivo.

### 10.1 Chequeos automáticos

| Chequeo | Resultado |
|---|---|
| `npm test` | 262 pruebas pasan (16 archivos); 23 son de este seguimiento |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR sí lo corrió y pasó (`verificar`) |

### 10.2 Estado de los hallazgos de la sección 4

| Hallazgo | Estado | Cómo se verificó |
|---|---|---|
| 1. CA bloqueado al vencer el PRODEP | Corregido: `pierdeProdepVigente` solo bloquea si el cambio deja al CA sin el último PRODEP vigente | B1–B7 en positivo; N1–N7 comprueban que sigue protegido el único PRODEP y el primer integrante |
| 2. Estatus laboral | Corregido en el alta y en el cambio | S1–S5 |
| 3. `quitarIntegrante` no atómica | Corregido con `$transaction` | Lectura del código (requiere base) |
| 4. Líder borrado en silencio | Corregido: aviso con código fijo `?lider=1` | L1, L2 |
| 5. Regla duplicada | Anotada en el README del módulo | Lectura |
| 6. Menores | Sin cambios (ver 10.3) | Lectura |

### 10.3 Puntos abiertos

1. **Editar sin cambiar de persona** se rechaza si el integrante ya no está activo (S4). Omitir la revisión cuando el profesor nuevo es el mismo.
2. **Un CA sin PRODEP vigente puede crecer sin PRODEP** (D1). Consecuencia de la regla nueva; decisión del equipo.
3. **Menores abiertos:** `?editado=` y `?eliminado=` con texto de la URL, `hoyUtc()` repetido y borde de huso horario (V3), y `overflow-x-auto` en la tabla en celular.

### 10.4 Pruebas de seguimiento

S4 y D1 describen el comportamiento actual (puntos abiertos 1 y 2): si se decide cambiarlo, deben invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| B1–B7 | CA sin PRODEP vigente: se puede quitar, cambiar, editar y agregar; un solo integrante se puede quitar | Pasan |
| N1–N7 | Se protege al único PRODEP vigente (baja y cambio), el primer integrante exige PRODEP y se permite sumar sin PRODEP si hay uno vigente | Pasan |
| S1–S3, S5 | Los cuatro estatus no activos y asignatura se rechazan en alta y cambio; cadena en minúsculas no pasa | Pasan |
| S4 | Editar sin cambiar a un integrante no activo se rechaza | Pasa (punto abierto 1) |
| L1, L2 | `notaSiDejaDeSerLider` | Pasan |
| D1 | Un CA sin PRODEP vigente admite a alguien sin PRODEP | Pasa (punto abierto 2) |
| V1–V4 | Bordes de `tieneProdepActivo` (sin cambios) | Pasan |

### 10.5 Lo que no se probó

- La pantalla en el navegador: tema claro, oscuro, celular, cierre de la fila al editar sin cambios y aviso al dejar de ser líder.
- Las Server Actions contra la base real (transacción de `quitarIntegrante`).
- `npm run build` en la copia (lo cubre el CI).

### 10.6 Dictamen del seguimiento

**Aprobable con comentarios.** Los hallazgos obligatorios y solicitados están resueltos; los puntos abiertos son menores.

### 10.7 Código de las pruebas de seguimiento

<details>
<summary><code>src/modules/cuerpos-academicos/revision-pr80-seguimiento.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import {
  notaSiDejaDeSerLider,
  revisarAltaIntegrante,
  revisarBajaIntegrante,
  revisarCambioIntegrante,
  tieneProdepActivo,
  type IntegranteResumen,
  type ProfesorParaCa,
} from "./integrantes";

// Pruebas de seguimiento del PR #80, commit a3ba897 (no forman parte del PR).
const profesor = (
  id: number,
  prodepActivo: boolean,
  extra: Partial<ProfesorParaCa> = {},
): ProfesorParaCa => ({
  id,
  nombres: `Nombre${id}`,
  apellidos: `Apellido${id}`,
  codigo: `TC${id}`,
  tipoContratacion: "TIEMPO_COMPLETO",
  estatusLaboral: "ACTIVO",
  prodepActivo,
  ...extra,
});
const integrante = (id: number, prodepActivo: boolean): IntegranteResumen => ({
  profesorId: id,
  nombre: `Apellido${id} Nombre${id} (TC${id})`,
  prodepActivo,
});

describe("seguimiento PR #80", () => {
  describe("hallazgo 1 corregido: CA sin PRODEP vigente ya no queda bloqueado", () => {
    const sinProdep = [integrante(1, false), integrante(2, false)];

    it("B1, B2: se puede quitar a cualquiera", () => {
      expect(revisarBajaIntegrante(1, sinProdep)).toBeNull();
      expect(revisarBajaIntegrante(2, sinProdep)).toBeNull();
    });
    it("B3, B4: se puede cambiar o editar a un integrante", () => {
      expect(revisarCambioIntegrante(1, profesor(3, false), sinProdep)).toBeNull();
      expect(revisarCambioIntegrante(1, profesor(1, false), sinProdep)).toBeNull();
    });
    it("B5, B6: se puede agregar a alguien con o sin PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(3, false), sinProdep)).toBeNull();
      expect(revisarAltaIntegrante(profesor(3, true), sinProdep)).toBeNull();
    });
    it("B7: con un solo integrante sin PRODEP se puede quitar", () => {
      expect(revisarBajaIntegrante(1, [integrante(1, false)])).toBeNull();
    });
  });

  describe("la regla sigue protegiendo el último PRODEP vigente", () => {
    const conProdep = [integrante(1, true), integrante(2, false)];

    it("N1: no se quita al único con PRODEP si quedan otros", () => {
      expect(revisarBajaIntegrante(1, conProdep)).toMatch(/se quedaría sin un integrante con PRODEP/);
    });
    it("N2: se quita al que no tiene PRODEP", () => {
      expect(revisarBajaIntegrante(2, conProdep)).toBeNull();
    });
    it("N3: si el único con PRODEP es el único integrante, se puede quitar (CA vacío)", () => {
      expect(revisarBajaIntegrante(1, [integrante(1, true)])).toBeNull();
    });
    it("N4: no se cambia al único con PRODEP por alguien sin PRODEP", () => {
      expect(revisarCambioIntegrante(1, profesor(3, false), conProdep)?.mensaje).toMatch(/PRODEP activo/);
    });
    it("N5: se cambia al único con PRODEP por otro con PRODEP", () => {
      expect(revisarCambioIntegrante(1, profesor(3, true), conProdep)).toBeNull();
    });
    it("N6: el primer integrante debe tener PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(1, false), [])?.mensaje).toMatch(/PRODEP activo/);
      expect(revisarAltaIntegrante(profesor(1, true), [])).toBeNull();
    });
    it("N7: con PRODEP vigente en el CA se suma a alguien sin PRODEP", () => {
      expect(revisarAltaIntegrante(profesor(3, false), conProdep)).toBeNull();
    });
  });

  describe("hallazgo 2 corregido: estatus laboral", () => {
    const base = [integrante(1, true)];

    it("S1: se rechaza en el alta a quien no está ACTIVO", () => {
      for (const estatusLaboral of ["LICENCIA", "BAJA_TEMPORAL", "BAJA_POSDOCTORAL", "TRASLADADO"]) {
        expect(revisarAltaIntegrante(profesor(3, true, { estatusLaboral }), base)?.mensaje).toMatch(
          /no está en estatus laboral activo/,
        );
      }
    });
    it("S2: asignatura sigue rechazado", () => {
      expect(revisarAltaIntegrante(profesor(3, true, { tipoContratacion: "ASIGNATURA" }), base)?.mensaje).toMatch(
        /no es de tiempo completo/,
      );
    });
    it("S3: el cambio también exige estatus activo", () => {
      expect(revisarCambioIntegrante(1, profesor(3, true, { estatusLaboral: "LICENCIA" }), base)?.mensaje).toMatch(
        /no está en estatus laboral activo/,
      );
    });
    it("S4 (observación): editar sin cambiar de persona a un integrante que ya no está activo se rechaza", () => {
      expect(revisarCambioIntegrante(1, profesor(1, true, { estatusLaboral: "LICENCIA" }), base)?.mensaje).toMatch(
        /no está en estatus laboral activo/,
      );
    });
    it("S5: el servidor no confía en una cadena distinta (minúsculas)", () => {
      expect(revisarAltaIntegrante(profesor(3, true, { estatusLaboral: "activo" }), base)).not.toBeNull();
    });
  });

  describe("hallazgo 4: aviso al dejar de ser líder", () => {
    it("L1: sin ser líder no agrega texto", () => {
      expect(notaSiDejaDeSerLider(false)).toBe("");
    });
    it("L2: siendo líder avisa en español y nombra RF-014", () => {
      expect(notaSiDejaDeSerLider(true)).toBe(
        " Ya no es líder de este cuerpo académico. Designar un líder único corresponde a RF-014.",
      );
    });
  });

  describe("decisión de diseño", () => {
    it("D1: con integrantes sin PRODEP vigente el CA puede crecer sin PRODEP (la regla no obliga a recuperarlo)", () => {
      const sinProdep = [integrante(1, false)];
      expect(revisarAltaIntegrante(profesor(3, false), sinProdep)).toBeNull();
    });
  });

  describe("tieneProdepActivo: bordes", () => {
    const aprobado = (inicio: string, fin: string) => ({
      resultado: "APROBADO",
      inicio: new Date(inicio),
      fin: new Date(fin),
    });

    it("V1: basta un dictamen vigente aunque otros hayan vencido", () => {
      const hoy = new Date("2026-11-04T12:00:00Z");
      expect(
        tieneProdepActivo([aprobado("2018-01-01", "2020-12-31"), aprobado("2025-01-01", "2028-12-31")], hoy),
      ).toBe(true);
    });
    it("V2: el último día de vigencia cuenta, también a las 23:59 UTC", () => {
      expect(tieneProdepActivo([aprobado("2025-01-01", "2026-11-04")], new Date("2026-11-04T23:59:00Z"))).toBe(true);
    });
    it("V3: en México (UTC-6) a las 20:00 del último día, el día UTC ya es el siguiente y se considera vencido", () => {
      // 2026-11-04 20:00 en México = 2026-11-05 02:00 UTC
      expect(tieneProdepActivo([aprobado("2025-01-01", "2026-11-04")], new Date("2026-11-05T02:00:00Z"))).toBe(false);
    });
    it("V4: un periodo con fin anterior al inicio nunca está vigente", () => {
      expect(tieneProdepActivo([aprobado("2027-01-01", "2026-01-01")], new Date("2026-11-04T12:00:00Z"))).toBe(false);
    });
  });

});
```

</details>
