# Revisión del PR #271: Validación, control único de vistas y conteo con SQL `COUNT` (RF-024, #115)

Revisión independiente del [PR #271](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/271) de `yanetzijimeno8297` (I7). El PR trae su propio registro (`PR-271-revision-vistas-validacion.md`), que es la prueba de quien lo preparó; este documento es la revisión aparte.

| Campo | Valor |
|---|---|
| PR | #271 (refs #115; no lo cierra) |
| Autor | @yanetzijimeno8297 (I7, dueña del módulo Validación) |
| Rama | `feat/M7-RF-024-revision-vistas-validacion` → `main` |
| Commit revisado | `c78ea1a` |
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24), copia aislada de la rama (`git worktree`) con `npm ci`, `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Hay un conflicto con `main` en `docs/SEGUIMIENTO.md` y ocho puntos menores; ninguno es de código roto |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/validacion/listados.ts` (+ prueba) | Nueva función pura `enlaceCambioVista`: arma el enlace de cada pestaña conservando `q`, el orden y los filtros compatibles |
| `src/modules/validacion/bandeja.ts` (+ prueba) | Nueva función pura `mapearConteosEstado` para el resultado de `groupBy` |
| `src/app/validacion/page.tsx` | La barra de pestañas es el único control de vista; las tarjetas de conteo salen de `prisma.autoria.groupBy`; campo oculto `vista` en el formulario de búsqueda |
| `src/modules/validacion/README.md` | Estructura de vistas, `enlaceCambioVista`, conteo con SQL y las excepciones a la regla #59 |
| `docs/pruebas/ISSUE-115-listados-validacion.md`, `PR-271-revision-vistas-validacion.md`, `docs/SEGUIMIENTO.md` | Seguimiento y registro de prueba del autor |

No hay cambios de esquema, migración ni dependencias.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `prisma validate` | Correcto |
| `npm test` | Correcto: 100 archivos, 1098 pruebas (como dice el PR) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

### Conflicto con `main` y mezcla de prueba

El PR está en conflicto con `main` (`DIRTY`), **solo en `docs/SEGUIMIENTO.md`**: el PR cambia la fila del #160 y agrega la del #271, y `main` avanzó en esas filas. El código se mezcla sin conflicto.

Mezcla local de prueba con `main` (22 commits adelante), con el archivo conflictivo resuelto a favor de `main` y mis pruebas de revisión incluidas: 111 archivos y 1231 pruebas, lint, typecheck y build correctos. Esa mezcla no se subió.

**Resuelto el 2026-11-23** (commit `be42497` en la rama del PR): se mezcló `main`, que ya incluía el panel de administración (#263 a #269), conservando las filas de `main` y la del #271 en `docs/SEGUIMIENTO.md`. Sobre ese resultado pasan `prisma validate`, 110 archivos y 1221 pruebas, lint, typecheck y build. La fila del #271 es la misma en el PR y en la rama de este registro, para que integrar los dos en cualquier orden no choque.

## 3. Lo que se leyó y está bien

- **Control único de vista:** la barra de pestañas (`<nav aria-label="Listados de validación">`, con `aria-current` en la activa) es el único control; el selector duplicado de `BarraListado` se quitó.
- **Búsqueda y filtros entre vistas:** `enlaceCambioVista` conserva `q`, el orden si la columna existe en el destino y los filtros que existen en la vista de destino; nunca arrastra `pagina` (X1, X2, X4, X5).
- **Sin errores de validación al cambiar:** de cualquier vista a cualquier otra, el enlace vuelve a leerse con `consultarVista` sin errores y con la misma `q` (X4: 16 combinaciones).
- **El campo oculto** `vista` mantiene la vista activa al buscar o filtrar en las vistas que no son la bandeja.
- **Conteo con SQL:** el `groupBy` conserva el alcance por profesor del docente (`profesorPermitido`), así que un docente sigue viendo solo lo suyo; los totales coinciden con los de la función anterior (X10: 200 autorías mezcladas).
- **Permisos:** la página mantiene `requireModulo("validacion")`; no se tocaron las Server Actions.
- **Texto y estilo:** mensajes en español y colores solo por nombre (`bg-marca-suave`, `text-marca`); `claseBotonSecundario` para las pestañas inactivas.
- **README:** corresponde con el código (vistas, `enlaceCambioVista`, conteo, excepciones a #59 con su motivo).

## 4. Pruebas de revisión

Archivo `src/modules/validacion/revision-pr271.test.ts` (código en la sección 7). Diez pruebas, todas correctas contra la rama; no forman parte del PR.

| # | Prueba | Resultado |
|---|---|---|
| X1 | Bandeja a manuales conserva `q`, `tipo` y el orden compatible; descarta estado, fuente y página | ✓ |
| X2 | Ningún enlace arrastra `pagina`; el enlace de la bandeja sale como `/validacion?estado=PENDIENTE` | ✓ (hallazgo 4) |
| X3 | Un texto con `&`, `=`, `#` y `%` viaja codificado y vuelve igual | ✓ |
| X4 | De cada vista a cada vista (16 combinaciones), el enlace se vuelve a leer sin errores y con la misma `q` | ✓ |
| X5 | El filtro `departamento` solo pasa a la vista de profesores | ✓ |
| X6 | Desde otra vista, volver a la bandeja abre en pendientes | ✓ |
| X7 | `mapearConteosEstado` sin grupos da ceros | ✓ |
| X8 | Un estado ausente cuenta cero y uno desconocido se ignora | ✓ |
| X9 | Dos grupos del mismo estado: el último pisa al primero, no se suman | ✓ (hallazgo 3) |
| X10 | Mismos totales que `calcularConteoOficial` con 200 autorías mezcladas | ✓ |

Con estas pruebas la suite de la rama queda en 101 archivos y 1108 pruebas, todas correctas.

## 5. Hallazgos

1. **`calcularConteoOficial` ya no se usa en la aplicación.** Solo lo llaman `bandeja.test.ts` y `src/app/produccion/integracion.test.ts`. Las pruebas de la regla de conteo oficial (RF-025) prueban una función que la pantalla ya no ejecuta, y el camino real (`groupBy` con su `where` de alcance por profesor) no tiene prueba; solo la tiene su mapeo. Conviene quitar la función vieja o dejarla con un comentario, y probar la consulta con un `prisma` simulado.
2. **La «aprobación de I7» no es una revisión independiente.** La descripción, `ISSUE-115-listados-validacion.md` y el README dicen que la dueña del módulo «aprueba formalmente» su propio cambio. Está bien que el módulo lo acepte, pero no sustituye la aprobación de otra persona; la fila nueva de `SEGUIMIENTO.md` ya lo dice («asignado a edelpinovs»). Conviene quitar la palabra «aprobación» de la descripción y del README, que no deben llevar decisiones de revisión.
3. **`mapearConteosEstado` sobrescribe en lugar de sumar** si llegaran dos grupos del mismo estado (X9). Con `groupBy` por `estado` no ocurre, pero la función es pura y su contrato no lo dice.
4. **El enlace de la pestaña «Bandeja» sale como `/validacion?estado=PENDIENTE`** y no `/validacion` (X2), porque `consultarVista` inyecta ese estado por omisión en la consulta. Es inofensivo, pero ensucia la URL y cambia la dirección que ya se compartía.
5. **El campo oculto `vista` entra como un filtro falso** (`clave: "vista"`, `opciones: []`, `contenido`). Funciona y compila, pero es una solución poco obvia; un comentario o una propiedad propia de `BarraListado` la haría explícita.
6. **El diff de `page.tsx` es mayor de lo necesario** (117 líneas añadidas, 27 quitadas): se reformateó en varias líneas el arreglo de filtros, que no cambió. Dificulta ver el cambio real.
7. **La revisión visual del registro se hizo leyendo clases CSS.** `PR-271-revision-vistas-validacion.md` afirma el cumplimiento de la pauta visual, pero nadie vio la pantalla en claro, oscuro y celular (la pauta lo pide antes de entregar una pantalla).
8. **Los números de pruebas del PR (1098 y 100 archivos) son los de la rama sola.** Con `main` mezclado son 111 archivos y 1231 pruebas; conviene actualizarlos al resolver el conflicto.

## 6. Lo que no se probó

- **La pantalla `/validacion` en el navegador** (tema claro, oscuro y celular): pestaña activa, `q` y filtros al cambiar de vista, el campo oculto al buscar en vistas distintas de la bandeja y el apilado de las pestañas en celular.
- **El `groupBy` contra la base real**, incluido el alcance del docente (`profesorPermitido`).
- **La vista como docente** (solo lo suyo) y como coordinador o administrador.
- **El conteo por profesor y por departamento** (vistas `profesores` y `departamentos`): no cambiaron en este PR y solo se comprobó que el enlace llega a ellas.

## 7. Código de la prueba de revisión

<details>
<summary><code>src/modules/validacion/revision-pr271.test.ts</code></summary>

```ts
// Revisión del PR #271: casos que las pruebas del PR no cubren.
import { describe, expect, it } from "vitest";
import { calcularConteoOficial, mapearConteosEstado, type AutoriaParaConteo } from "./bandeja";
import { consultarVista, enlaceCambioVista, VISTAS, type Vista } from "./listados";

const DEPARTAMENTOS = ["DCS", "DIN"];
const consultaDe = (parametros: Record<string, string>) => consultarVista(parametros, DEPARTAMENTOS).consulta;
const parametrosDe = (enlace: string) => Object.fromEntries(new URLSearchParams(enlace.split("?")[1] ?? ""));

describe("enlaceCambioVista", () => {
  const rica = consultaDe({ q: "redes", tipo: "ARTICULO", estado: "TODOS", fuente: "SCOPUS", orden: "profesor", dir: "desc", pagina: "4" });

  it("X1: de la bandeja a manuales conserva q, tipo y el orden compatible; descarta estado, fuente y página", () => {
    const p = parametrosDe(enlaceCambioVista("manuales", rica, DEPARTAMENTOS));
    expect(p).toEqual({ vista: "manuales", q: "redes", tipo: "ARTICULO", orden: "profesor", dir: "desc" });
  });

  it("X2: ningún enlace arrastra la página, y volver a la bandeja no escribe `vista`", () => {
    for (const v of VISTAS) expect(parametrosDe(enlaceCambioVista(v, rica, DEPARTAMENTOS))).not.toHaveProperty("pagina");
    expect(enlaceCambioVista("bandeja", consultaDe({}), DEPARTAMENTOS)).toBe("/validacion?estado=PENDIENTE");
  });

  it("X3: un texto con &, =, # y % viaja codificado y vuelve igual", () => {
    const q = "a&vista=profesores #1 100%";
    const p = parametrosDe(enlaceCambioVista("manuales", consultaDe({ q }), DEPARTAMENTOS));
    expect(p.q).toBe(q);
    expect(p.vista).toBe("manuales");
  });

  it("X4: de cualquier vista a cualquier otra, el enlace se vuelve a leer sin errores de validación", () => {
    const origenes: Record<Vista, Record<string, string>> = {
      bandeja: { q: "redes", tipo: "ARTICULO", estado: "VALIDADA", fuente: "SCOPUS", orden: "estado", dir: "desc" },
      manuales: { vista: "manuales", q: "redes", tipo: "LIBRO", orden: "revista", dir: "asc" },
      profesores: { vista: "profesores", q: "ana", departamento: "DCS", orden: "nombre", dir: "asc" },
      departamentos: { vista: "departamentos", q: "ing", orden: "nombre", dir: "asc" },
    };
    for (const desde of VISTAS) {
      for (const hacia of VISTAS) {
        const enlace = enlaceCambioVista(hacia, consultaDe(origenes[desde]), DEPARTAMENTOS);
        const leido = consultarVista(parametrosDe(enlace), DEPARTAMENTOS);
        expect(Object.keys(leido.errores), `${desde} → ${hacia}: ${enlace}`).toEqual([]);
        expect(leido.vista).toBe(hacia);
        expect(leido.consulta.q).toBe(origenes[desde].q);
      }
    }
  });

  it("X5: el filtro de departamento solo pasa a la vista de profesores", () => {
    const c = consultaDe({ vista: "profesores", departamento: "DIN" });
    expect(parametrosDe(enlaceCambioVista("profesores", c, DEPARTAMENTOS)).departamento).toBe("DIN");
    expect(parametrosDe(enlaceCambioVista("departamentos", c, DEPARTAMENTOS))).not.toHaveProperty("departamento");
    expect(parametrosDe(enlaceCambioVista("bandeja", c, DEPARTAMENTOS))).not.toHaveProperty("departamento");
  });

  it("X6: la bandeja abre en pendientes; al cambiar desde otra vista, el estado explícito sigue siendo PENDIENTE", () => {
    expect(consultaDe({ vista: "manuales" }).filtros.estado).toBeUndefined();
    expect(consultarVista(parametrosDe(enlaceCambioVista("bandeja", consultaDe({ vista: "manuales" }), DEPARTAMENTOS)), DEPARTAMENTOS).consulta.filtros.estado).toBe("PENDIENTE");
  });
});

describe("mapearConteosEstado", () => {
  it("X7: sin grupos todo es cero", () => {
    expect(mapearConteosEstado([])).toEqual({ totalValidadas: 0, totalPendientes: 0, totalRechazadas: 0 });
  });

  it("X8: un estado ausente cuenta cero y uno desconocido se ignora", () => {
    const grupos = [
      { estado: "VALIDADA", _count: { _all: 7 } },
      { estado: "OTRO", _count: { _all: 99 } },
    ] as unknown as Parameters<typeof mapearConteosEstado>[0];
    expect(mapearConteosEstado(grupos)).toEqual({ totalValidadas: 7, totalPendientes: 0, totalRechazadas: 0 });
  });

  it("X9: si llegaran dos grupos del mismo estado, el último pisa al primero en lugar de sumarse", () => {
    const grupos = [
      { estado: "PENDIENTE", _count: { _all: 3 } },
      { estado: "PENDIENTE", _count: { _all: 4 } },
    ] as Parameters<typeof mapearConteosEstado>[0];
    expect(mapearConteosEstado(grupos).totalPendientes).toBe(4);
  });

  it("X10: da los mismos totales que la función anterior, `calcularConteoOficial`, con datos mezclados", () => {
    const estados = ["VALIDADA", "PENDIENTE", "RECHAZADA"] as const;
    const autorias: AutoriaParaConteo[] = Array.from({ length: 200 }, (_, i) => ({
      estado: estados[(i * 7) % 3],
      profesorId: (i % 9) + 1,
      departamentoId: i % 4 === 0 ? null : (i % 3) + 1,
    }));
    const grupos = estados.map((estado) => ({ estado, _count: { _all: autorias.filter((a) => a.estado === estado).length } }));
    const anterior = calcularConteoOficial(autorias);
    expect(mapearConteosEstado(grupos)).toEqual({
      totalValidadas: anterior.totalValidadas,
      totalPendientes: anterior.totalPendientes,
      totalRechazadas: anterior.totalRechazadas,
    });
  });
});
```

</details>

## 8. Dictamen

**Aprobable con comentarios.** Pasa todas las verificaciones, también mezclado con `main`, y el comportamiento de `enlaceCambioVista` es correcto en las 16 combinaciones de vistas. Antes de integrar: resolver el conflicto de `docs/SEGUIMIENTO.md`, decidir qué hacer con `calcularConteoOficial` y su cobertura (1) y quitar la «aprobación» de la descripción (2); el resto puede ir en un ajuste posterior. Queda pendiente ver la pantalla en los tres modos y que otra persona lo apruebe.
