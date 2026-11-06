# Prueba del PR #89: LGAC del cuerpo académico (RF-015)

Registro de la revisión del [PR #89](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/89) de `marisleidysvazquez8293-arch` (rama `feat/M4-RF-015-lgac`, commit `250bde6`). Cierra #20. El comentario de revisión está publicado en el propio PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/cuerpos-academicos/lgac.ts` (+ prueba) | Esquema `altaLgac` y `revisarLgac` (nombre sin duplicar, solo integrantes) |
| `src/app/cuerpos-academicos/[id]/actions.ts` | Server Actions `registrarLgac`, `editarLgac` y `eliminarLgac`; `desvincularDeLgacs` al quitar o cambiar un integrante |
| `src/app/cuerpos-academicos/[id]/formulario-lgac.tsx`, `fila-lgac.tsx`, `page.tsx` | Formulario, fila con editar y eliminar, y paneles de la pantalla |
| `src/app/cuerpos-academicos/fila.tsx`, `page.tsx` | Columna «LGAC» en el listado |
| `src/modules/cuerpos-academicos/README.md` | Documentación del RF-015 |

Solo se tocan archivos del módulo `cuerpos-academicos`. No hay cambios en `prisma/schema.prisma`, `src/lib/` ni `src/components/`.

## 2. Chequeos automáticos

El PR nació sobre el primer commit del #88 y está en conflicto con `main` (ver hallazgo 1). Se revisó el commit tal cual, sin combinar con `main`, y se comprobó por separado qué archivos entran en conflicto.

| Chequeo | Resultado |
|---|---|
| `npm test` | 267 pruebas pasan (18 archivos); 252 del PR y 15 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| Combinar con `main` | Conflictos en `[id]/actions.ts` y `page.tsx` del listado; `fila.tsx` se fusiona solo |
| `npm run build` | no se ejecutó en la copia; el CI del PR sí lo corrió y pasó (`verificar`) |

## 3. Pruebas de revisión

El código está en la sección 8. La prueba E4 **pasa porque describe el comportamiento actual, que es el problema**: al corregirlo debe invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| E1 | Valores atípicos de `cuerpoId`, `profesorIds`, nombre y descripción no muestran texto en inglés | Pasa |
| E2 | Nombre de 200 caracteres pasa; 201 se rechaza | Pasa |
| E3 | Descripción de 400 pasa; solo espacios queda en nulo | Pasa |
| E4 | `profesorIds` repetidos no se eliminan (`[1, 1, 2]`) | Pasa (confirma el defecto, hallazgo 3) |
| E5 | `idsDeProfesores` devuelve las cadenas tal cual llegan | Pasa |
| N1, N2 | El nombre duplicado ignora acentos, mayúsculas y espacios repetidos | Pasan |
| N3 | Un nombre distinto pasa | Pasa |
| N4 | Al editar, otra LGAC con el mismo nombre sí choca | Pasa |
| N5 | Prioridad de mensajes: sin integrantes, luego no integrante, luego nombre | Pasa |
| N6 | Con profesores repetidos la regla no los cuenta de más | Pasa |

## 4. Hallazgos (publicados en el PR)

| # | Gravedad | Hallazgo |
|---|---|---|
| 1 | Obligatorio | Conflictos con `main`: el PR nació sobre el primer commit del #88, que ya se integró con dos commits más. Hay que conservar `filtroLiderIntegrante`, `errorSiNoGuardoLider` y el listado apilado |
| 2 | Solicitado | El nombre de la LGAC no tiene respaldo en la base (`@@unique([cuerpoId, nombre])`); la regla del equipo pide `@unique` y capturar `P2002` |
| 3 | Solicitado | `profesorIds` no elimina repetidos (E4) |
| 4 | Solicitado | La tabla de LGAC repite `overflow-x-auto` |
| 5 | Solicitado | Descripción del PR con el «Test plan» sin marcar |
| 6 | Menor | Quitar un integrante puede dejar una LGAC sin integrantes (pregunta para el equipo, D-208) |
| 7 | Menor | El mensaje al quitar un integrante no dice que se desvinculó de LGAC |
| 8 | Menor | `?lgac=` y `?lgacEliminada=` con texto de la URL |
| 9 | Menor | Carrera al vincular si se quita a un integrante a la vez (sin filtro condicionado como en el #88) |
| 10 | Menor | El error de integrantes se muestra lejos de las casillas |

## 5. Lo que el código cumple

- Las tres Server Actions empiezan con `requireModulo("cuerpos-academicos")`.
- Editar y eliminar siguen #59, con confirmación en la fila.
- `editarLgac` y `eliminarLgac` filtran por `id` y `cuerpoId`: no se toca una línea de otro CA.
- La regla de negocio es una función pura con pruebas del PR.
- Mensajes en español con valores atípicos (E1).
- El borrado del CA ya protege el caso con LGAC (`motivoNoEliminable` y `lgacs: { none: {} }`).

## 6. Dictamen

**Solicitar cambios** (publicado como comentario, sin bloquear): un cambio obligatorio y cuatro solicitados.

## 7. Lo que no se probó

- La pantalla en el navegador: tema claro, oscuro, celular, registro, edición y eliminación de una LGAC, y quitar a un integrante vinculado.
- Las Server Actions contra la base real, incluidos el nombre duplicado en carrera y los integrantes repetidos.
- La resolución de los conflictos con `main` (la hace la autora).
- `npm run build` en la copia (lo cubre el CI).

### Cómo repetirlo

```bash
git fetch origin pull/89/head:pr-89-rev
git worktree add ../wt-pr89 pr-89-rev
# copiar src/generated y enlazar node_modules; añadir el archivo de la sección 8
npx vitest run src/modules/cuerpos-academicos
```

## 8. Código de las pruebas de revisión

<details>
<summary><code>src/modules/cuerpos-academicos/revision-pr89.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import { altaLgac, idsDeProfesores, revisarLgac } from "./lgac";

// Pruebas de revisión del PR #89 (no forman parte del PR).
const base = { cuerpoId: "4", nombre: "Gestión ambiental", descripcion: "", profesorIds: ["1"] };
const enIngles = (m: string) => /Invalid|expected|received|Too small|Too big/i.test(m);
const mensajes = (entrada: unknown) => {
  const r = altaLgac.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("revisión PR #89", () => {
  describe("esquema altaLgac", () => {
    it("E1: valores atípicos no muestran texto en inglés", () => {
      const casos: unknown[] = [
        { ...base, cuerpoId: "0" }, { ...base, cuerpoId: "abc" }, { ...base, cuerpoId: "1.5" },
        { ...base, profesorIds: [] }, { ...base, profesorIds: ["abc"] }, { ...base, profesorIds: ["0"] },
        { ...base, profesorIds: ["1.5"] }, { ...base, profesorIds: ["-2"] }, { ...base, nombre: "" },
        { ...base, nombre: "   " }, { ...base, nombre: "x".repeat(201) }, { ...base, descripcion: "x".repeat(401) },
      ];
      for (const c of casos) {
        const m = mensajes(c);
        expect(m.length, JSON.stringify(c)).toBeGreaterThan(0);
        expect(m.some(enIngles), JSON.stringify(c) + " -> " + m.join("|")).toBe(false);
      }
    });
    it("E2: nombre de 200 caracteres pasa; 201 se rechaza", () => {
      expect(altaLgac.safeParse({ ...base, nombre: "x".repeat(200) }).success).toBe(true);
      expect(altaLgac.safeParse({ ...base, nombre: "x".repeat(201) }).success).toBe(false);
    });
    it("E3: descripción de 400 pasa; solo espacios queda en nulo", () => {
      expect(altaLgac.safeParse({ ...base, descripcion: "x".repeat(400) }).success).toBe(true);
      const r = altaLgac.parse({ ...base, descripcion: " \n  " });
      expect(r.descripcion).toBeNull();
    });
    it("E4 (defecto): profesorIds repetidos no se eliminan", () => {
      const r = altaLgac.parse({ ...base, profesorIds: ["1", "1", "2"] });
      expect(r.profesorIds).toEqual([1, 1, 2]); // confirma el defecto: debería ser [1, 2]
    });
    it("E5: idsDeProfesores devuelve cadenas tal cual llegan", () => {
      const f = new FormData();
      f.append("profesorIds", "3");
      f.append("profesorIds", "3");
      expect(idsDeProfesores(f)).toEqual(["3", "3"]);
    });
  });

  describe("revisarLgac", () => {
    const integrantes = [{ profesorId: 1 }, { profesorId: 2 }];
    const datos = (nombre: string, profesorIds = [1]) => altaLgac.parse({ ...base, nombre, profesorIds: profesorIds.map(String) });

    it("N1: el duplicado ignora acentos y mayúsculas", () => {
      expect(revisarLgac(datos("GESTIÓN AMBIENTAL"), integrantes, [{ nombre: "gestion ambiental" }])?.campo).toBe("nombre");
    });
    it("N2: espacios repetidos se normalizan antes de comparar", () => {
      expect(revisarLgac(datos("Gestión   ambiental"), integrantes, [{ nombre: "Gestión ambiental" }])?.campo).toBe("nombre");
    });
    it("N3: un nombre distinto pasa", () => {
      expect(revisarLgac(datos("Otra línea"), integrantes, [{ nombre: "Gestión ambiental" }])).toBeNull();
    });
    it("N4: al editar, otra LGAC con el mismo nombre sí choca", () => {
      expect(revisarLgac(datos("Gestión ambiental"), integrantes, [{ id: 8, nombre: "Gestión ambiental" }], 9)?.campo).toBe("nombre");
    });
    it("N5: prioridad: sin integrantes, luego no integrante, luego nombre", () => {
      expect(revisarLgac(datos("A"), [], [])?.mensaje).toMatch(/Primero asigna integrantes/);
      expect(revisarLgac(datos("A", [9]), integrantes, [{ nombre: "A" }])?.mensaje).toMatch(/Solo se vinculan integrantes/);
    });
    it("N6: con profesores repetidos la regla no los cuenta de más", () => {
      expect(revisarLgac(datos("Nueva", [1, 1]), integrantes, [])).toBeNull();
    });
  });
});
```

</details>

## 9. Resolución de los conflictos con `main` (commit `43c39d2`, 5 de noviembre)

Para avanzar, I1 resolvió los conflictos del hallazgo 1 y subió un commit de fusión a la rama del PR, sin reescribir su historial (la autora no tenía que hacer nada). Se avisó en un comentario del PR.

### 9.1 Qué se hizo

| Archivo | Resolución |
|---|---|
| `src/app/cuerpos-academicos/[id]/actions.ts` | Conflicto de imports: se conservan los del #88 (`filtroLiderIntegrante`, `errorSiNoGuardoLider`) junto con los de LGAC. El resto del archivo se fusionó solo |
| `src/app/cuerpos-academicos/page.tsx` | Se queda el listado apilado del #88 (sin `overflow-x-auto`, columnas `hidden sm:table-cell`) y se agrega el encabezado «LGAC» con la misma clase |
| `src/app/cuerpos-academicos/fila.tsx` | Se fusionó solo pero quedaba mal: la celda de LGAC se oculta en celular (`hidden sm:table-cell`) y su dato pasa a la línea apilada del nombre («Sin LGAC» o «N LGAC») |

### 9.2 Chequeos sobre el resultado

| Chequeo | Resultado |
|---|---|
| Marcas de conflicto restantes | Ninguna |
| `npm test` | 283 pruebas pasan (18 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| Estado del PR en GitHub | Fusionable (`MERGEABLE`); el CI se vuelve a ejecutar con el commit nuevo |

### 9.3 Estado de los hallazgos

| Hallazgo | Estado |
|---|---|
| 1. Conflictos con `main` | Resuelto en `43c39d2` |
| 4. `overflow-x-auto` | Resuelto solo en el listado de CA; sigue abierto en la tabla de LGAC del detalle |
| 2, 3, 5 a 10 | Sin cambios; corresponden a la autora |

### 9.4 Lo que no se probó

- La pantalla en el navegador (tema claro, oscuro y celular del listado y del detalle).
- Las Server Actions contra la base real.

## 10. Arreglos aplicados: commit `edfacf8` (5 de noviembre)

Con el PR ya fusionable, I1 aplicó dos de los hallazgos solicitados y subió un commit a la rama del PR (sin reescribir su historial). Se avisó en un comentario del PR.

### 10.1 Qué se hizo

| Archivo | Cambio |
|---|---|
| `src/modules/cuerpos-academicos/lgac.ts` | `profesorIds` se deduplica en el esquema (`.transform((ids) => [...new Set(ids)])`) después de validar que haya al menos uno |
| `src/modules/cuerpos-academicos/lgac.test.ts` | Prueba nueva: elimina repetidos y conserva el orden |
| `src/app/cuerpos-academicos/[id]/page.tsx`, `fila-lgac.tsx` | Se quita el `overflow-x-auto` de la tabla de LGAC; descripción e integrantes se apilan bajo el nombre en celular (columnas `hidden sm:table-cell`) |

### 10.2 Chequeos

| Chequeo | Resultado |
|---|---|
| `npm test` | 296 pruebas pasan (19 archivos), incluidas las 17 de revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR lo corre |

La prueba E4 de la sección 3 **falló** al aplicar el arreglo, como se esperaba, y se invirtió (código en 10.5).

### 10.3 Estado de los hallazgos

| Hallazgo | Estado |
|---|---|
| 1. Conflictos con `main` | Resuelto (sección 9) |
| 3. Integrantes repetidos | Corregido en `edfacf8` (E4 y E4b) |
| 4. `overflow-x-auto` | Corregido en el listado (sección 9) y en la tabla de LGAC del detalle |
| 2. `@@unique` del nombre | Abierto: se acuerda en el chat (D-209) y puede ir en un PR aparte |
| 5. Descripción del PR | Abierto: la completa la autora |
| 6 a 10 (menores) | Sin cambios; D-208 sigue pendiente |

### 10.4 Lo que no se probó

- La pantalla en el navegador: tema claro, oscuro y celular del listado y del detalle, registro, edición y eliminación de una LGAC, y quitar a un integrante vinculado.
- Las Server Actions contra la base real.
- `npm run build` en la copia (lo cubre el CI).

### 10.5 Código de las pruebas de revisión y seguimiento

<details>
<summary><code>src/modules/cuerpos-academicos/revision-pr89.test.ts</code> (E4 invertida)</summary>

```ts
import { describe, expect, it } from "vitest";
import { altaLgac, idsDeProfesores, revisarLgac } from "./lgac";

// Pruebas de revisión y seguimiento del PR #89 (no forman parte del PR).
const base = { cuerpoId: "4", nombre: "Gestión ambiental", descripcion: "", profesorIds: ["1"] };
const enIngles = (m: string) => /Invalid|expected|received|Too small|Too big/i.test(m);
const mensajes = (entrada: unknown) => {
  const r = altaLgac.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("revisión PR #89", () => {
  describe("esquema altaLgac", () => {
    it("E1: valores atípicos no muestran texto en inglés", () => {
      const casos: unknown[] = [
        { ...base, cuerpoId: "0" }, { ...base, cuerpoId: "abc" }, { ...base, cuerpoId: "1.5" },
        { ...base, profesorIds: [] }, { ...base, profesorIds: ["abc"] }, { ...base, profesorIds: ["0"] },
        { ...base, profesorIds: ["1.5"] }, { ...base, profesorIds: ["-2"] }, { ...base, nombre: "" },
        { ...base, nombre: "   " }, { ...base, nombre: "x".repeat(201) }, { ...base, descripcion: "x".repeat(401) },
      ];
      for (const c of casos) {
        const m = mensajes(c);
        expect(m.length, JSON.stringify(c)).toBeGreaterThan(0);
        expect(m.some(enIngles), JSON.stringify(c) + " -> " + m.join("|")).toBe(false);
      }
    });
    it("E2: nombre de 200 caracteres pasa; 201 se rechaza", () => {
      expect(altaLgac.safeParse({ ...base, nombre: "x".repeat(200) }).success).toBe(true);
      expect(altaLgac.safeParse({ ...base, nombre: "x".repeat(201) }).success).toBe(false);
    });
    it("E3: descripción de 400 pasa; solo espacios queda en nulo", () => {
      expect(altaLgac.safeParse({ ...base, descripcion: "x".repeat(400) }).success).toBe(true);
      const r = altaLgac.parse({ ...base, descripcion: " \n  " });
      expect(r.descripcion).toBeNull();
    });
    it("E4 (corregido): profesorIds repetidos se eliminan y se conserva el orden", () => {
      expect(altaLgac.parse({ ...base, profesorIds: ["1", "1", "2"] }).profesorIds).toEqual([1, 2]);
      expect(altaLgac.parse({ ...base, profesorIds: ["3", "1", "3", "1"] }).profesorIds).toEqual([3, 1]);
    });
    it("E4b: eliminar repetidos no oculta los errores (vacío o inválido siguen dando su mensaje)", () => {
      expect(mensajes({ ...base, profesorIds: [] })).toEqual(["Elige al menos un integrante de esta línea."]);
      expect(mensajes({ ...base, profesorIds: ["x", "x"] }).length).toBeGreaterThan(0);
    });
    it("E5: idsDeProfesores devuelve cadenas tal cual llegan", () => {
      const f = new FormData();
      f.append("profesorIds", "3");
      f.append("profesorIds", "3");
      expect(idsDeProfesores(f)).toEqual(["3", "3"]);
    });
  });

  describe("revisarLgac", () => {
    const integrantes = [{ profesorId: 1 }, { profesorId: 2 }];
    const datos = (nombre: string, profesorIds = [1]) => altaLgac.parse({ ...base, nombre, profesorIds: profesorIds.map(String) });

    it("N1: el duplicado ignora acentos y mayúsculas", () => {
      expect(revisarLgac(datos("GESTIÓN AMBIENTAL"), integrantes, [{ nombre: "gestion ambiental" }])?.campo).toBe("nombre");
    });
    it("N2: espacios repetidos se normalizan antes de comparar", () => {
      expect(revisarLgac(datos("Gestión   ambiental"), integrantes, [{ nombre: "Gestión ambiental" }])?.campo).toBe("nombre");
    });
    it("N3: un nombre distinto pasa", () => {
      expect(revisarLgac(datos("Otra línea"), integrantes, [{ nombre: "Gestión ambiental" }])).toBeNull();
    });
    it("N4: al editar, otra LGAC con el mismo nombre sí choca", () => {
      expect(revisarLgac(datos("Gestión ambiental"), integrantes, [{ id: 8, nombre: "Gestión ambiental" }], 9)?.campo).toBe("nombre");
    });
    it("N5: prioridad: sin integrantes, luego no integrante, luego nombre", () => {
      expect(revisarLgac(datos("A"), [], [])?.mensaje).toMatch(/Primero asigna integrantes/);
      expect(revisarLgac(datos("A", [9]), integrantes, [{ nombre: "A" }])?.mensaje).toMatch(/Solo se vinculan integrantes/);
    });
    it("N6: con profesores repetidos la regla no los cuenta de más", () => {
      expect(revisarLgac(datos("Nueva", [1, 1]), integrantes, [])).toBeNull();
    });
  });
});
```

</details>
