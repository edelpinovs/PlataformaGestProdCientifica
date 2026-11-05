# Prueba del PR #74: Validación de producción científica (RF-023, RF-024, RF-025)

Registro de la revisión del [PR #74](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/74) de `yanetzijimeno8297` (rama `feat/M6-validacion`, commit `5f31884`). Cierra #28, #29 y #30. El comentario de revisión está publicado en el propio PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/validacion/manual.ts` | Esquema Zod de la captura manual, normalizadores, duplicados, regla de eliminación |
| `src/modules/validacion/bandeja.ts` | Transiciones de estado de la autoría, conteo oficial, esquema de edición |
| `src/app/validacion/actions.ts` | Server Actions: alta manual, editar, eliminar, confirmar, rechazar |
| `src/app/validacion/page.tsx`, `fila-bandeja.tsx`, `formulario-manual.tsx` | Pantalla, bandeja y formulario |

Solo se tocan archivos del módulo `validacion`: no hay cambios en `prisma/schema.prisma`, `src/lib/` ni `src/components/`.

## 2. Chequeos automáticos

Sobre el commit `5f31884` (ya incluye `main`), en una copia aislada con las pruebas de revisión añadidas:

| Chequeo | Resultado |
|---|---|
| `npm test` | 167 pruebas pasan (13 archivos), 27 son de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia (ver sección 7); el CI del PR sí lo corrió y pasó (`verificar`) |

Nota: la primera ejecución de `typecheck` falló por falta de `src/generated/` en mi copia, no por el PR. Con el cliente de Prisma copiado pasó.

## 3. Pruebas de revisión

Archivo de prueba al final de este documento (sección 9). Las pruebas de hallazgo (F1, F2, U1) **pasan porque describen el comportamiento actual, que es el defecto**: cuando se corrija deben invertirse.

| Id | Qué comprueba | Resultado |
|---|---|---|
| F1 | La fecha `2026-13-45` pasa el esquema y produce `Invalid Date` | Pasa (confirma el defecto) |
| F2 | Una fecha futura (`2999-01-01`) pasa el esquema | Pasa (decisión pendiente) |
| F3 | Una fecha real produce una fecha válida | Pasa |
| C1 | `calcularConteoOficial` calcula bien por profesor y por departamento | Pasa |
| C2 | Quien no tiene departamento cuenta en el total pero no en un departamento | Pasa |
| T (9) | Las 9 combinaciones de transición de estado | Pasan |
| T10 | La transición inválida da un motivo legible | Pasa |
| D1 | Detecta DOI repetido aunque llegue como URL y en otra capitalización | Pasa |
| D2, D3, D4 | Sin conflicto; publicación sin autorías; DOI en blanco | Pasan |
| E1, E2 | Edición de la bandeja rechaza DOI y tipo inválidos | Pasan |
| U1 | `evidenciaUrl` acepta `javascript:alert(1)` | Pasa (confirma el hallazgo) |
| X1, X2 | Reglas de eliminación | Pasan |
| P1–P3 | Regla de permisos propuesta (especificación del hallazgo 5) | Pasan |

Las pruebas P1–P3 prueban una función que está escrita dentro de la propia prueba: sirven de especificación para extraerla al módulo, no verifican el código del PR.

## 4. Hallazgos (publicados en el PR)

1. **Fecha inexistente rompe el servidor** (F1): `new Date("2026-13-45")` es inválida y Prisma lanza una excepción en `registrarPublicacionManual`.
2. **RF-025 incompleto**: `porProfesor` y `porDepartamento` se calculan (C1) pero la pantalla solo muestra tres totales.
3. **La captura manual nace `VALIDADA`** sin decisión escrita sobre la nota del issue #28.
4. **Carga toda la tabla** en cada alta y edición (`findMany` sin `where`).
5. **Condición de permisos repetida 5 veces** y sin prueba.
6. **Mensajes por la URL** (`?error=…`) sin códigos fijos.
7. Menores: `<p role="alert">` en lugar de `Aviso`, faltan `aria-invalid`, `evidenciaUrl` con `javascript:` (U1), dos acciones de edición casi iguales, descripción sin acentos.

## 5. Lo que el código cumple

- Cada Server Action empieza con `requireModulo("validacion")`.
- Captura `P2002` (DOI repetido) y `P2025` (registro borrado) con mensajes legibles.
- Las reglas de negocio están en funciones puras con pruebas.
- La unicidad se comprueba en el servicio y se respalda con `doi @unique`.
- Eliminar solo permite publicaciones manuales con un autor.

## 6. Dictamen

**Solicitar cambios.** Son obligatorios los hallazgos 1 a 3. Los hallazgos 4 a 6 se piden, pero se pueden acordar con el equipo.

## 7. Lo que no se probó

- `npm run build` en mi copia (el enlace a `node_modules` no sirve para Turbopack); lo cubre el CI.
- La pantalla en el navegador: tema claro, tema oscuro y celular. En particular si el formulario de edición de la bandeja se cierra tras guardar, y el desplazamiento horizontal de las tablas en celular.
- Las Server Actions contra la base real y con cada rol (administrador, coordinador, docente con y sin perfil de profesor).

## 8. Cómo repetirlo

```bash
git fetch origin pull/74/head:pr-74
git worktree add ../wt-pr74 pr-74
# copiar el archivo de la sección 9 a src/modules/validacion/revision-pr74.test.ts
npx vitest run src/modules/validacion
```

## 9. Código de las pruebas

<details>
<summary><code>src/modules/validacion/revision-pr74.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import {
  calcularConteoOficial,
  edicionMetadatosBandejaEsquema,
  ESTADOS_AUTORIA,
  validarTransicionAutoria,
} from "./bandeja";
import {
  motivoNoEliminablePublicacion,
  normalizarDoi,
  publicacionManualEsquema,
  revisarPublicacionManual,
} from "./manual";

// Pruebas de revisión del PR #74 (no forman parte del PR).
const base = {
  tipo: "ARTICULO",
  titulo: "Aprendizaje automático aplicado",
  autoresTexto: "García, J.",
  profesorId: 10,
};

describe("revisión PR #74", () => {
  describe("hallazgo 1: fecha", () => {
    it("F1: el esquema acepta una fecha con forma válida pero inexistente (2026-13-45)", () => {
      const res = publicacionManualEsquema.safeParse({ ...base, fechaPublicacion: "2026-13-45" });
      expect(res.success).toBe(true);
      if (res.success) {
        // Es lo que llega a `new Date(...)` en la Server Action y Prisma rechaza.
        expect(Number.isNaN(new Date(res.data.fechaPublicacion!).getTime())).toBe(true);
      }
    });

    it("F2: una fecha futura también pasa el esquema", () => {
      const res = publicacionManualEsquema.safeParse({ ...base, fechaPublicacion: "2999-01-01" });
      expect(res.success).toBe(true);
    });

    it("F3: una fecha real se convierte en una fecha válida", () => {
      const res = publicacionManualEsquema.safeParse({ ...base, fechaPublicacion: "2026-05-15" });
      expect(res.success).toBe(true);
      if (res.success) expect(Number.isNaN(new Date(res.data.fechaPublicacion!).getTime())).toBe(false);
    });
  });

  describe("hallazgo 2: conteo", () => {
    const autorias = [
      { estado: "VALIDADA", profesorId: 1, departamentoId: 100 },
      { estado: "VALIDADA", profesorId: 2, departamentoId: null },
      { estado: "VALIDADA", profesorId: 3 },
      { estado: "PENDIENTE", profesorId: 1, departamentoId: 100 },
    ] as const;

    it("C1: el cálculo por profesor y por departamento existe y es correcto", () => {
      const c = calcularConteoOficial([...autorias]);
      expect(c.porProfesor).toEqual({ 1: 1, 2: 1, 3: 1 });
      expect(c.porDepartamento).toEqual({ 100: 1 });
    });

    it("C2: profesores sin departamento cuentan en el total pero no en ningún departamento", () => {
      const c = calcularConteoOficial([...autorias]);
      expect(c.totalValidadas).toBe(3);
      expect(Object.values(c.porDepartamento).reduce((a, b) => a + b, 0)).toBe(1);
    });
  });

  describe("RF-024: transiciones", () => {
    const esperado: Record<string, boolean> = {
      "PENDIENTE>PENDIENTE": true,
      "PENDIENTE>VALIDADA": true,
      "PENDIENTE>RECHAZADA": true,
      "VALIDADA>VALIDADA": true,
      "VALIDADA>RECHAZADA": true,
      "VALIDADA>PENDIENTE": false,
      "RECHAZADA>RECHAZADA": true,
      "RECHAZADA>VALIDADA": true,
      "RECHAZADA>PENDIENTE": false,
    };
    for (const de of ESTADOS_AUTORIA) {
      for (const a of ESTADOS_AUTORIA) {
        it(`T: ${de} → ${a}`, () => {
          expect(validarTransicionAutoria(de, a).valida).toBe(esperado[`${de}>${a}`]);
        });
      }
    }

    it("T10: la transición inválida explica el motivo", () => {
      expect(validarTransicionAutoria("VALIDADA", "PENDIENTE").motivo).toContain("No se puede cambiar");
    });
  });

  describe("RF-023: duplicados", () => {
    const contexto = {
      profesores: [{ id: 10, nombres: "Juan", apellidos: "García" }],
      publicacionesExistentes: [
        { id: 1, doi: "10.1000/ABC", tituloNormalizado: "otro titulo", autorias: [{ profesorId: 10 }] },
      ],
    };

    it("D1: detecta el DOI aunque en la base esté con mayúsculas y llegue en URL", () => {
      const datos = publicacionManualEsquema.parse({ ...base, doi: "https://doi.org/10.1000/abc" });
      expect(revisarPublicacionManual(datos, contexto)?.campo).toBe("doi");
    });

    it("D2: sin DOI ni título repetido no hay problema", () => {
      const datos = publicacionManualEsquema.parse(base);
      expect(revisarPublicacionManual(datos, contexto)).toBeNull();
    });

    it("D3: una publicación sin autorías no bloquea el mismo título", () => {
      const ctx = {
        ...contexto,
        publicacionesExistentes: [{ id: 2, doi: null, tituloNormalizado: "aprendizaje automatico aplicado" }],
      };
      expect(revisarPublicacionManual(publicacionManualEsquema.parse(base), ctx)).toBeNull();
    });

    it("D4: el DOI en blanco se normaliza a null", () => {
      expect(normalizarDoi("   ")).toBeNull();
    });
  });

  describe("RF-024: edición desde la bandeja", () => {
    it("E1: rechaza un DOI con formato inválido", () => {
      const res = edicionMetadatosBandejaEsquema.safeParse({
        publicacionId: 5,
        tipo: "LIBRO",
        titulo: "Un título",
        autoresTexto: "Autor Uno",
        doi: "no-es-doi",
      });
      expect(res.success).toBe(false);
    });

    it("E2: rechaza un tipo desconocido", () => {
      const res = edicionMetadatosBandejaEsquema.safeParse({
        publicacionId: 5,
        tipo: "X",
        titulo: "Un título",
        autoresTexto: "Autor Uno",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("hallazgo: evidenciaUrl", () => {
    it("U1: el esquema acepta una URL con protocolo javascript:", () => {
      const res = publicacionManualEsquema.safeParse({ ...base, evidenciaUrl: "javascript:alert(1)" });
      expect(res.success).toBe(true);
    });
  });

  describe("eliminar", () => {
    it("X1: una publicación manual sin autorías se puede eliminar", () => {
      expect(motivoNoEliminablePublicacion("T", 0, true)).toBeNull();
    });
    it("X2: una publicación manual validada con un autor se elimina sin aviso de que baja el conteo", () => {
      expect(motivoNoEliminablePublicacion("T", 1, true)).toBeNull();
    });
  });

  // Especificación de la función propuesta en el hallazgo 5 (la condición hoy está repetida en las acciones).
  describe("hallazgo 5: regla de permisos propuesta", () => {
    type Perfil = { rol: "ADMINISTRADOR" | "COORDINADOR" | "DOCENTE"; profesorId: number | null };
    const puedeGestionarAutoria = (perfil: Perfil, profesorIds: number[]) =>
      perfil.rol !== "DOCENTE" || (perfil.profesorId !== null && profesorIds.includes(perfil.profesorId));

    it("P1: administrador y coordinador gestionan cualquier autoría", () => {
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR", profesorId: null }, [7])).toBe(true);
      expect(puedeGestionarAutoria({ rol: "COORDINADOR", profesorId: null }, [7])).toBe(true);
    });
    it("P2: el docente gestiona solo la suya", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 7 }, [7, 8])).toBe(true);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 9 }, [7, 8])).toBe(false);
    });
    it("P3: el docente sin perfil de profesor no gestiona nada", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: null }, [7])).toBe(false);
    });
  });
});
```

</details>


## 10. Seguimiento: commit `4e5c8c1` (4 de noviembre)

Tras publicar la revisión, la autora subió el commit `4e5c8c1` («atiende observaciones de revisión»). Se repitió la prueba sobre el PR combinado con `main` en una copia aislada.

### 10.1 Chequeos automáticos

| Chequeo | Resultado |
|---|---|
| `npm test` | 230 pruebas pasan (15 archivos); 43 son del PR en `validacion` y 18 de este seguimiento |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR sí lo corrió y pasó (`verificar`) |

Nota: en una primera ejecución, dos pruebas de `pauta-visual.test.ts` fallaron por tiempo de espera mientras corría otro proceso pesado; en aislado pasan las 6, y en la ejecución completa final pasan todas. Fue del entorno, no del PR.

### 10.2 Estado de los hallazgos de la sección 4

| Hallazgo | Estado | Cómo se verificó |
|---|---|---|
| 1. Fecha inexistente rompe el servidor | Corregido: `esFechaCalendarioValida` y `esFechaFutura` en el esquema | Las pruebas F1 y F2 de la sección 3 **fallan ahora**, como se esperaba; F1–F7 del seguimiento comprueban la corrección |
| 2. RF-025 incompleto | Corregido: tablas de conteo oficial por profesor y por departamento, filtradas por rol | Lectura de `page.tsx`; el cálculo ya tenía prueba (C1, C2) |
| 3. Captura manual nace `VALIDADA` | Resuelto con una decisión escrita: nace `VALIDADA` si la registra el propio docente y `PENDIENTE` si la registra administración o coordinación | D1 y D2 |
| 4. Carga toda la tabla | Corregido en `registrar`, `editar` y bandeja: consulta por DOI o título con `OR`; queda un punto abierto (10.3, punto 2) | Lectura de `actions.ts`; Q1 y Q2 sobre un modelo de la consulta |
| 5. Permisos repetidos y sin prueba | Corregido: `puedeGestionarAutoria` con 6 pruebas del PR y G1–G3 del seguimiento | G1–G3 |
| 6. Mensajes por la URL | Corregido: códigos fijos traducidos en la página; queda un detalle menor (10.3, punto 3) | Lectura de `page.tsx`; A1 |
| 7. Menores | Corregidos: `Aviso`, `aria-invalid`, `javascript:` rechazado (U1, U2), `.min(1)` redundantes quitados | U1, U2 |
| A verificar: celular | Mejorado: se quitó `overflow-x-auto` y se ocultan columnas apilando su contenido en la primera celda | Solo lectura; falta verlo en el navegador |
| A verificar: formulario de edición abierto | Probablemente resuelto: `editarMetadatosBandeja` ya no redirige y devuelve `{}` | Solo lectura; falta verlo en el navegador |

### 10.3 Puntos abiertos (menores)

1. **El administrador puede confirmar lo que capturó.** La captura de administración nace `PENDIENTE` para que el docente la confirme, pero `puedeGestionarAutoria` también permite confirmarla al administrador y al coordinador (D3). Pregunta para el equipo: ¿solo el docente debe confirmar?
2. **DOI con igualdad exacta.** La consulta usa `where: { doi: doiNorm }`, sensible a mayúsculas en Postgres. Lo que guarda este módulo va en minúsculas, pero un DOI con mayúsculas que llegue del escaneo no se detectaría como repetido (Q2). Normalizar al guardar o usar `mode: "insensitive"`.
3. **Código inexistente en la URL.** `?accion=constructor` busca una propiedad heredada del objeto de avisos y deja un `Aviso` vacío (A1). Usar `Object.hasOwn(AVISOS_URL, codigo)`.

### 10.4 Pruebas de seguimiento

Las pruebas Q2 y A1 describen el comportamiento actual (el punto abierto): al corregirlo deben invertirse. Q1 y Q2 prueban un modelo de la consulta de Prisma, no la consulta real; D3 documenta una decisión pendiente.

| Id | Qué comprueba | Resultado |
|---|---|---|
| F1–F7 | Fecha inexistente y futura rechazadas con mensaje en español; hoy aceptada; bisiestos; piso en 1900; fecha vacía opcional | Pasan |
| U1, U2 | `javascript:`, `data:` y `ftp:` rechazados; `http` y `https` aceptados, también en mayúsculas | Pasan |
| G1–G3 | Matriz de roles de `puedeGestionarAutoria`, docente sin autorías, administrador sin autorías | Pasan |
| D1, D2 | Estado inicial según quién captura | Pasan |
| D3 | Administración y coordinación pueden confirmar la autoría pendiente | Pasa (punto abierto 1) |
| Q1 | DOI en minúsculas se detecta aunque llegue como URL | Pasa |
| Q2 | DOI guardado con mayúsculas no se detecta | Pasa (confirma el punto abierto 2) |
| A1 | Un código inexistente puede devolver una propiedad heredada | Pasa (confirma el punto abierto 3) |

### 10.5 Lo que no se probó en el seguimiento

- La pantalla en el navegador: tema claro, tema oscuro y celular; en particular el cierre del formulario de edición de la bandeja y las columnas apiladas.
- Las Server Actions contra la base real y con cada rol, incluido el punto abierto 2.
- `npm run build` en mi copia (lo cubre el CI).

### 10.6 Dictamen del seguimiento

**Aprobable con comentarios.** Los hallazgos obligatorios (1 a 3) están resueltos; los puntos abiertos son menores y pueden resolverse en un PR posterior.

### 10.7 Código de las pruebas de seguimiento

<details>
<summary><code>src/modules/validacion/revision-pr74-seguimiento.test.ts</code></summary>

```ts
import { describe, expect, it } from "vitest";
import { puedeGestionarAutoria } from "./bandeja";
import {
  determinarEstadoInicialAutoria,
  esFechaCalendarioValida,
  esFechaFutura,
  normalizarDoi,
  publicacionManualEsquema,
  revisarPublicacionManual,
} from "./manual";

// Pruebas de seguimiento del PR #74 tras el commit 4e5c8c1 (no forman parte del PR).
const base = {
  tipo: "ARTICULO",
  titulo: "Aprendizaje automático aplicado",
  autoresTexto: "García, J.",
  profesorId: 10,
};
const mensaje = (entrada: unknown) => {
  const r = publicacionManualEsquema.safeParse(entrada);
  return r.success ? null : r.error.issues[0]?.message;
};
const hoyLocal = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

describe("seguimiento PR #74", () => {
  describe("hallazgo 1 corregido: fecha", () => {
    it("F1: 2026-13-45 y 2026-02-30 se rechazan con mensaje en español", () => {
      expect(mensaje({ ...base, fechaPublicacion: "2026-13-45" })).toBe("La fecha de publicación no existe en el calendario.");
      expect(mensaje({ ...base, fechaPublicacion: "2026-02-30" })).toBe("La fecha de publicación no existe en el calendario.");
    });
    it("F2: una fecha futura se rechaza", () => {
      expect(mensaje({ ...base, fechaPublicacion: "2999-01-01" })).toBe(
        "La fecha de publicación no puede ser posterior a la fecha actual.",
      );
    });
    it("F3: la fecha de hoy se acepta", () => {
      expect(publicacionManualEsquema.safeParse({ ...base, fechaPublicacion: hoyLocal() }).success).toBe(true);
    });
    it("F4: bisiestos: 2024-02-29 existe, 2023-02-29 y 1900-02-29 no; el 2000 sí fue bisiesto", () => {
      expect(esFechaCalendarioValida("2024-02-29")).toBe(true);
      expect(esFechaCalendarioValida("2023-02-29")).toBe(false);
      expect(esFechaCalendarioValida("1900-02-29")).toBe(false);
      expect(esFechaCalendarioValida("2000-02-29")).toBe(true);
    });
    it("F5: el piso es 1900: una obra de 1899 se rechaza", () => {
      expect(esFechaCalendarioValida("1899-12-31")).toBe(false);
    });
    it("F6: esFechaFutura compara por día con la referencia", () => {
      const ref = new Date(2026, 10, 4, 12, 0, 0);
      expect(esFechaFutura("2026-11-04", ref)).toBe(false);
      expect(esFechaFutura("2026-11-05", ref)).toBe(true);
    });
    it("F7: una fecha vacía sigue siendo opcional", () => {
      expect(publicacionManualEsquema.safeParse({ ...base, fechaPublicacion: "" }).success).toBe(true);
    });
  });

  describe("menor corregido: evidenciaUrl", () => {
    it("U1: javascript:, data: y ftp: se rechazan", () => {
      for (const evidenciaUrl of ["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://servidor.udg.mx/a.pdf"]) {
        expect(mensaje({ ...base, evidenciaUrl })).toBe("La URL de evidencia debe iniciar con http:// o https://.");
      }
    });
    it("U2: http y https se aceptan, también en mayúsculas", () => {
      for (const evidenciaUrl of ["http://repositorio.udg.mx/a", "https://repositorio.udg.mx/a", "HTTPS://REPOSITORIO.UDG.MX/A"]) {
        expect(publicacionManualEsquema.safeParse({ ...base, evidenciaUrl }).success).toBe(true);
      }
    });
  });

  describe("hallazgo 5 corregido: permisos", () => {
    it("G1: matriz de roles", () => {
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR" }, 7)).toBe(true);
      expect(puedeGestionarAutoria({ rol: "COORDINADOR" }, [7, 8])).toBe(true);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 7 }, [7, 8])).toBe(true);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 9 }, [7, 8])).toBe(false);
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: null }, 7)).toBe(false);
      expect(puedeGestionarAutoria({ rol: "DESCONOCIDO", profesorId: 7 }, 7)).toBe(false);
    });
    it("G2: un docente no gestiona una publicación sin autorías", () => {
      expect(puedeGestionarAutoria({ rol: "DOCENTE", profesorId: 7 }, [])).toBe(false);
    });
    it("G3: administrador y coordinador gestionan incluso sin autorías", () => {
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR" }, [])).toBe(true);
    });
  });

  describe("hallazgo 3: decisión de la captura manual", () => {
    it("D1: el docente que registra su obra nace VALIDADA con fecha de revisión", () => {
      const ahora = new Date("2026-11-04T10:00:00Z");
      expect(determinarEstadoInicialAutoria(true, ahora)).toEqual({ estado: "VALIDADA", revisadaEn: ahora });
    });
    it("D2: la captura de administrador o coordinador nace PENDIENTE, sin fecha de revisión", () => {
      expect(determinarEstadoInicialAutoria(false)).toEqual({ estado: "PENDIENTE", revisadaEn: null });
    });
    it("D3: pero administrador y coordinador sí pueden confirmar esa autoría pendiente (la decisión no lo impide)", () => {
      expect(puedeGestionarAutoria({ rol: "ADMINISTRADOR" }, 42)).toBe(true);
      expect(puedeGestionarAutoria({ rol: "COORDINADOR" }, 42)).toBe(true);
    });
  });

  describe("hallazgo 4: consulta puntual por DOI (modelo de la consulta de Prisma)", () => {
    // El PR consulta con `where: { doi: doiNorm }` (igualdad exacta, sensible a mayúsculas en Postgres).
    // Este modelo reproduce ese filtro sobre filas de ejemplo.
    const filas = [
      { id: 1, doi: "10.1000/abc", tituloNormalizado: "otro", autorias: [{ profesorId: 10 }] },
      { id: 2, doi: "10.1000/XYZ", tituloNormalizado: "otro 2", autorias: [{ profesorId: 10 }] },
    ];
    const contexto = (doi: string) => ({
      profesores: [{ id: 10, nombres: "Juan", apellidos: "García" }],
      publicacionesExistentes: filas.filter((f) => f.doi === normalizarDoi(doi)),
    });
    it("Q1: un DOI guardado en minúsculas se detecta aunque llegue como URL", () => {
      const datos = publicacionManualEsquema.parse({ ...base, doi: "https://doi.org/10.1000/ABC" });
      expect(revisarPublicacionManual(datos, contexto("https://doi.org/10.1000/ABC"))?.campo).toBe("doi");
    });
    it("Q2: un DOI guardado con mayúsculas (por ejemplo, desde un escaneo futuro) NO se detecta", () => {
      const datos = publicacionManualEsquema.parse({ ...base, doi: "10.1000/xyz" });
      expect(revisarPublicacionManual(datos, contexto("10.1000/xyz"))).toBeNull();
    });
  });

  describe("menor: aviso por código en la URL", () => {
    it("A1: buscar un código inexistente en un objeto literal puede devolver una propiedad heredada", () => {
      const avisos: Record<string, { mensaje: string }> = { editado: { mensaje: "ok" } };
      // `?accion=constructor` o `?error=toString` dejan `avisoAccion` con un valor que no es un aviso.
      expect(typeof avisos["constructor"]).toBe("function");
      expect(Object.hasOwn(avisos, "constructor")).toBe(false);
    });
  });
});
```

</details>
