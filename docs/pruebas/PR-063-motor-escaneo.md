# Prueba del PR #63: RF-020 a RF-022, motor de escaneo y deduplicación

| Campo | Valor |
|---|---|
| PR | [#63](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/63) (cierra #25, #26 y #27) |
| Autor | @irybyron |
| Rama | `feat/M6-RF-021-deduplicacion` → `main` |
| Commits probados | `1c0a4aa`, `5c0fd39` |
| Fecha de la prueba | 2026-10-19 |
| Probó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24.15.0), copia aislada de la rama (`git worktree`). Sin base de datos, sin `next dev` y sin llamadas reales a Scopus, OpenAlex ni ORCID. |
| Segunda revisión | 2026-11-03, sobre `c2aa5b7` (sección 9) |
| Resultado | **Cambios solicitados.** La suite del PR pasa completa (91 de 91), pero 9 de las 11 pruebas de revisión fallan (sección 4). |

## 1. Alcance del cambio

| Archivo | Cambio |
|---|---|
| `src/modules/produccion/normalizacion.ts` | Nuevo: limpieza de DOI, título e ISSN/ISBN, y similitud de trigramas |
| `src/modules/produccion/deduplicacion.ts` | Nuevo: deduplicación por DOI y por título, fusión de fuentes y coautorías |
| `src/modules/produccion/conectores/` | Nuevo: cliente HTTP con reintentos, conectores de Scopus, OpenAlex y ORCID |
| `src/modules/produccion/escaneo.ts` | Nuevo: orquestador que consulta las fuentes y guarda en la base (importa `prisma`) |
| `src/modules/produccion/tipos.ts` | Nuevo: tipos y esquema Zod de la publicación candidata |
| `src/app/produccion/page.tsx` | Pantalla con métricas, formulario de escaneo y listado de publicaciones |
| `src/app/produccion/actions.ts` | Nuevo: Server Action `iniciarEscaneoAction` con `requireModulo("produccion")` |
| `src/app/produccion/formulario-escaneo.tsx` | Nuevo: formulario con `useActionState` |
| `src/app/api/cron/escaneo/route.ts` | El cron diario ejecuta el escaneo completo del año en curso |
| Tres archivos `.test.ts` | 36 pruebas nuevas |

No toca el esquema de Prisma: usa `Publicacion`, `Autoria` y `Job`, que ya existían.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 10 archivos, 91 pruebas (36 nuevas) |
| `npm run lint` | Correcto: sin errores ni advertencias |
| `npm run typecheck` | Correcto |
| CI de GitHub (`verificar`) | En cola al momento de la prueba; sin resultado |
| Vista previa de Vercel | Correcto (comentario de vista previa publicado) |

## 3. Suite del PR: 91 de 91 pasan

Salida de `npx vitest run --reporter=verbose` sobre `5c0fd39`.

### Nuevas en este PR

**`src/modules/produccion/normalizacion.test.ts`** (17)

| # | Prueba | Resultado |
|---|---|---|
| 1 | `limpiarTexto` elimina espacios iniciales, finales y colapsa internos | ✓ |
| 2 | `normalizarTitulo` elimina acentos, mayúsculas y caracteres de puntuación | ✓ |
| 3 | `normalizarTitulo` trata igual títulos con acentos o variantes diacríticas | ✓ |
| 4 | `normalizarTitulo` maneja cadenas vacías o nulas | ✓ |
| 5 | `limpiarDoi` extrae el DOI estándar de URLs https://doi.org/ | ✓ |
| 6 | `limpiarDoi` extrae el DOI de URLs dx.doi.org y con http | ✓ |
| 7 | `limpiarDoi` limpia prefijos como doi: y mayúsculas | ✓ |
| 8 | `limpiarDoi` elimina puntos o comas finales accidentales | ✓ |
| 9 | `limpiarDoi` devuelve null si no hay DOI válido o está vacío | ✓ |
| 10 | `normalizarIssnIsbn` elimina guiones y espacios en ISSN e ISBN | ✓ |
| 11 | `normalizarIssnIsbn` preserva la letra X mayúscula final de los ISSN | ✓ |
| 12 | `normalizarIssnIsbn` devuelve null para valores vacíos | ✓ |
| 13 | `calcularSimilitudTrigramas` devuelve 1.0 para títulos idénticos | ✓ |
| 14 | `calcularSimilitudTrigramas` devuelve 1.0 para títulos que difieren solo en mayúsculas o acentos | ✓ |
| 15 | `calcularSimilitudTrigramas` alcanza >= 0.90 de similitud para variaciones menores o errores tipográficos | ✓ |
| 16 | `calcularSimilitudTrigramas` devuelve una similitud baja (< 0.40) para títulos diferentes | ✓ |
| 17 | `extraerTrigramas` extrae trigramas correctamente con padding | ✓ |

**`src/modules/produccion/deduplicacion.test.ts`** (12)

| # | Prueba | Resultado |
|---|---|---|
| 1 | `sonDuplicadosPorDoi` identifica como duplicados dos DOIs idénticos con formatos distintos | ✓ |
| 2 | `sonDuplicadosPorDoi` no marca como duplicados DOIs diferentes | ✓ |
| 3 | `sonDuplicadosPorDoi` devuelve false si alguno o ambos DOIs son nulos o vacíos | ✓ |
| 4 | `sonDuplicadosPorTitulo` detecta títulos idénticos como duplicado con similitud 1.0 | ✓ |
| 5 | `sonDuplicadosPorTitulo` detecta duplicados por similitud alta con pequeñas diferencias ortográficas | ✓ |
| 6 | `sonDuplicadosPorTitulo` rechaza duplicación si la diferencia de años es mayor a 1 año | ✓ |
| 7 | `sonDuplicadosPorTitulo` acepta diferencia de 1 año (prepublicación / online first vs print) | ✓ |
| 8 | `compararConExistente` da prioridad al DOI exacto sobre el título | ✓ |
| 9 | `deduplicarLote` fusiona la misma publicación encontrada en Scopus y ORCID | ✓ |
| 10 | `deduplicarLote` RF-022: consolida coautoría institucional sin duplicar la obra | ✓ |
| 11 | `deduplicarLote` deduplica por título cuando ninguna de las fuentes provee DOI | ✓ |
| 12 | `deduplicarLote` no fusiona publicaciones independientes | ✓ |

**`src/modules/produccion/conectores/conectores.test.ts`** (7)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Scopus: mapea tipos de documento adecuadamente | ✓ |
| 2 | Scopus: transforma una entrada típica a `PublicacionCandidata` | ✓ |
| 3 | Scopus: descarta entradas sin título | ✓ |
| 4 | OpenAlex: mapea tipos adecuadamente | ✓ |
| 5 | OpenAlex: transforma una obra a `PublicacionCandidata` | ✓ |
| 6 | ORCID: mapea tipos adecuadamente | ✓ |
| 7 | ORCID: transforma un resumen de obra a `PublicacionCandidata` | ✓ |

### Ya existentes (sin cambios en este PR)

| Archivo | Pruebas | Resultado |
|---|---|---|
| `src/components/pauta-visual.test.ts` | 6 | ✓ todas (cubre las pantallas nuevas de `produccion`) |
| `src/modules/catalogos/grados.test.ts` | 16 | ✓ todas |
| `src/modules/catalogos/divisiones.test.ts` | 9 | ✓ todas |
| `src/modules/catalogos/departamentos.test.ts` | 8 | ✓ todas |
| `src/lib/auth/siiau.test.ts` | 10 | ✓ todas |
| `src/lib/auth/enlace.test.ts` | 3 | ✓ todas |
| `src/modules/reportes/semaforo.test.ts` | 3 | ✓ todas |

**Lo que la suite no cubre.** Las pruebas del PR prueban casos que funcionan bien y no buscan casos límite. `escaneo.ts`, `actions.ts` y la ruta del cron no tienen ninguna prueba.

## 4. Pruebas de revisión: 2 pasan, 9 fallan

Se escribieron para comprobar los hallazgos de la revisión del código. No usan base de datos: simulan `prisma`, `fetch` y `ejecutarEscaneo` con `vi.mock` y `vi.stubGlobal`. Las dos pruebas de **control** (casos que deben funcionar) pasan; eso confirma que las simulaciones son correctas y que los fallos vienen del código del PR.

| # | Prueba | Resultado | Salida de Vitest |
|---|---|---|---|
| 1a | Mismo título exacto ("Editorial") de 2019 y 2024, con DOI distinto, son dos obras | ✗ | `expected [...] to have a length of 2 but got 1` |
| 1b | Títulos casi iguales del mismo año con DOI distinto son dos obras | ✗ | `expected [...] to have a length of 2 but got 1` |
| C1 | *Control:* la misma obra en dos fuentes, una sin DOI, se fusiona | ✓ | — |
| 3a | OpenAlex: un profesor con 150 obras devuelve las 150 | ✗ | `expected [...] to have a length of 150 but got 100` |
| 3b | Scopus: un profesor con 150 obras devuelve las 150 | ✗ | `expected [...] to have a length of 150 but got 100` |
| M1 | ORCID con filtro de año no incluye obras sin año | ✗ | `expected [ 'Obra de 2024', 'Obra sin fecha' ] to deeply equal [ 'Obra de 2024' ]` |
| C2 | *Control:* un escaneo correcto responde con éxito | ✓ | — |
| 2b | Si el escaneo lanza una excepción, el `Job` queda `FALLIDO` | ✗ | `expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]` (nunca se actualiza; queda `EN_PROCESO`) |
| 6a | No muestra a la persona el mensaje técnico de la excepción | ✗ | `expected 'Error al ejecutar el escaneo: Connect…' not to contain 'Connection terminated'` |
| 6b | Si todas las fuentes fallan, no responde con éxito | ✗ | `expected true not to be true` |
| 6c | Rechaza un año fuera de rango en vez de escanear todos los años | ✗ | `expected undefined to be defined` (ignora `1500` y escanea sin filtro) |

### Qué significa cada fallo

- **1a y 1b (bloqueante).** `deduplicarLote` une obras distintas. Con título exacto toma la primera coincidencia sin revisar el año, y nunca revisa que los DOI sean distintos. Se pierden publicaciones reales, por ejemplo editoriales o fe de erratas. Corrección: si ambos DOI existen y difieren, no son duplicados; el año se revisa también con título exacto. Aplica igual a `persistirPublicacion` en `escaneo.ts`.
- **3a y 3b (bloqueante).** Solo se pide la primera página (100 resultados). Un profesor con más obras queda incompleto sin aviso. OpenAlex pagina con `cursor`; Scopus con `start` y `opensearch:totalResults`.
- **M1 (menor).** En ORCID, el filtro `if (anio && pub.anio && pub.anio !== anio)` deja pasar las obras sin año.
- **2b (bloqueante).** Si `ejecutarEscaneo` lanza, el `catch` de la acción no actualiza el `Job`, que queda `EN_PROCESO` para siempre. Lo mismo en la ruta del cron, que ni siquiera tiene `catch`.
- **6a, 6b y 6c.** La acción no valida con Zod (AGENTS.md lo exige), muestra el mensaje técnico de la excepción y responde "Escaneo finalizado" aunque todas las fuentes hayan fallado.

## 5. Hallazgos revisados solo leyendo el código

Requieren base de datos, Vercel o las API reales, así que no tienen prueba automática:

| # | Hallazgo | Gravedad |
|---|---|---|
| 2a | El cron y la acción escanean a todos los profesores en una sola petición (3 fuentes × hasta 3 intentos de 20 s cada uno). Con decenas de profesores excede el tiempo máximo de la función en Vercel. El TODO original pedía procesar por lotes. | Bloqueante |
| 3c | No usa `CorteEscaneo`: el escaneo no es incremental. El cron solo filtra el año en curso, así que se pierden obras de diciembre indexadas en enero. | Bloqueante |
| 4 | Contra la base solo busca título normalizado **exacto**; la similitud ≥ 0.90 de RF-021 nunca se aplica a lo ya guardado. Falta una consulta con `similarity()` que use el índice GIN `gin_trgm_ops`. | Bloqueante |
| 5 | `src/modules/produccion/escaneo.ts` importa `prisma`; esa carpeta es solo para lógica pura (CLAUDE.md). | Regla del equipo |
| 7 | El listado no tiene *Editar* ni *Eliminar* (#59). Puede justificarse, pero debe quedar escrito en el issue. | Regla del equipo |
| 8 | `SCOPUS_API_KEY` y `OPENALEX_API_KEY` no están en `.env.example`. | Regla del equipo |
| 9 | La tabla usa `overflow-x-auto` (desplazamiento horizontal en celular); `departamentos` también lo usa, conviene acordarlo. | Menor |
| 10 | Sin control de tasa entre peticiones (solo reintento tras 429); OpenAlex pide `mailto`. | Menor |
| 11 | El panel dice "Publicaciones (N)" con el total, pero muestra 50. | Menor |

## 6. Lo que no se probó

- La pantalla `/produccion` en el navegador (tema claro, oscuro y celular).
- Un escaneo real contra Scopus, OpenAlex u ORCID.
- La escritura en la base de desarrollo y el comportamiento del cron en Vercel.

## 7. Dictamen

**No se aprueba todavía.** Antes de integrar hay que corregir los hallazgos bloqueantes (1a, 1b, 2a, 2b, 3a, 3b, 3c y 4) y los de reglas del equipo (5 a 8). Al corregir, conviene sumar las pruebas de la sección 8 al PR; deben pasar las 11.

## 8. Código de las pruebas de revisión

Para correrlas: copiar el archivo a `src/modules/produccion/revision-pr63.test.ts` en la rama del PR. Las de la Server Action necesitan el alias `@/`, que el proyecto no tiene configurado en Vitest; para ellas se usa la configuración de abajo:

```bash
npx vitest run revision-pr63 --config vitest.revision.config.mts
```

<details>
<summary><code>vitest.revision.config.mts</code></summary>

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

</details>

<details>
<summary><code>src/modules/produccion/revision-pr63.test.ts</code></summary>

```ts
// Pruebas de la revisión del PR #63 (ver docs/pruebas/PR-063-motor-escaneo.md).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deduplicarLote } from "./deduplicacion";
import { consultarOpenAlex } from "./conectores/openalex";
import { consultarScopus } from "./conectores/scopus";
import { consultarOrcid } from "./conectores/orcid";
import type { PublicacionCandidata } from "./tipos";

const prismaFalso = vi.hoisted(() => ({
  job: { create: vi.fn(), update: vi.fn() },
}));
const escaneoFalso = vi.hoisted(() => ({ ejecutarEscaneo: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaFalso }));
vi.mock("@/lib/auth/session", () => ({ requireModulo: vi.fn(async () => ({ rol: "ADMINISTRADOR" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/produccion/escaneo", () => escaneoFalso);

const base: PublicacionCandidata = {
  tipo: "ARTICULO",
  titulo: "",
  autoresTexto: "Pérez, Ana",
  fuente: "OPENALEX",
  profesorId: 1,
};

function respuestaJson(cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" } });
}

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

const resumenVacio = {
  profesoresProcesados: 1,
  publicacionesEncontradas: 0,
  publicacionesGuardadas: 0,
  autoriasCreadas: 0,
  coautoriasDetectadas: 0,
  errores: [] as string[],
};

describe("Nota 1 · deduplicarLote no junta obras distintas", () => {
  it("1a. mismo título exacto pero años lejanos (2019 y 2024) son dos obras", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Editorial", anio: 2019, doi: "10.1000/ed.2019" },
      { ...base, titulo: "Editorial", anio: 2024, doi: "10.1000/ed.2024" },
    ]);
    expect(r).toHaveLength(2);
  });

  it("1b. títulos casi iguales del mismo año con DOI distinto son dos obras", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco", anio: 2024, doi: "10.1000/a" },
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco.", anio: 2024, doi: "10.1000/b" },
    ]);
    expect(r).toHaveLength(2);
  });

  it("control: misma obra en dos fuentes, una sin DOI, sí se fusiona", () => {
    const r = deduplicarLote([
      { ...base, titulo: "Machine learning for crop yield prediction in Jalisco", anio: 2024, doi: "10.1000/a" },
      { ...base, fuente: "ORCID", titulo: "Machine Learning for Crop Yield Prediction in Jalisco", anio: 2024 },
    ]);
    expect(r).toHaveLength(1);
  });
});

describe("Nota 3 · los conectores traen todas las páginas", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("3a. OpenAlex: un profesor con 150 obras devuelve las 150", async () => {
    const obras = (desde: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({ title: `Obra ${desde + i}`, publication_year: 2024 }));
    const fetchFalso = vi.fn(async (url: string) => {
      const pagina = new URL(url).searchParams.get("cursor") === "pag2" ? 2 : 1;
      return respuestaJson({
        meta: { count: 150, next_cursor: pagina === 1 ? "pag2" : null },
        results: pagina === 1 ? obras(0, 100) : obras(100, 50),
      });
    });
    vi.stubGlobal("fetch", fetchFalso);
    const r = await consultarOpenAlex({ id: 1, orcid: "0000-0001-2345-6789" });
    expect(r.publicaciones).toHaveLength(150);
  });

  it("3b. Scopus: un profesor con 150 obras devuelve las 150", async () => {
    const fetchFalso = vi.fn(async (url: string) => {
      const inicio = Number(new URL(url).searchParams.get("start") ?? 0);
      const n = Math.max(0, Math.min(100, 150 - inicio));
      return respuestaJson({
        "search-results": {
          "opensearch:totalResults": "150",
          entry: Array.from({ length: n }, (_, i) => ({ "dc:title": `Obra ${inicio + i}` })),
        },
      });
    });
    vi.stubGlobal("fetch", fetchFalso);
    const r = await consultarScopus({ id: 1, scopusId: "57200000000" }, undefined, "clave-ficticia");
    expect(r.publicaciones).toHaveLength(150);
  });
});

describe("Menor · ORCID con filtro de año", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("no incluye obras sin año cuando se pide un año concreto", async () => {
    const resumen = (titulo: string, anio?: string) => ({
      title: { title: { value: titulo } },
      type: "journal-article",
      "publication-date": anio ? { year: { value: anio } } : null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaJson({
          group: [
            { "work-summary": [resumen("Obra de 2024", "2024")] },
            { "work-summary": [resumen("Obra sin fecha")] },
          ],
        }),
      ),
    );
    const r = await consultarOrcid({ id: 1, orcid: "0000-0001-2345-6789" }, 2024);
    expect(r.publicaciones.map((p) => p.titulo)).toEqual(["Obra de 2024"]);
  });
});

describe("Notas 2 y 6 · Server Action iniciarEscaneoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaFalso.job.create.mockResolvedValue({ id: 7 });
    prismaFalso.job.update.mockResolvedValue({});
  });

  it("control: un escaneo correcto responde con éxito", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue({ ...resumenVacio, publicacionesEncontradas: 3, publicacionesGuardadas: 3 });
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.exito).toBe(true);
  });

  it("2b. si el escaneo lanza una excepción, el Job queda FALLIDO y no EN_PROCESO", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(prismaFalso.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: expect.objectContaining({ estado: "FALLIDO" }) }),
    );
  });

  it("6a. no muestra a la persona el mensaje técnico de la excepción", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockRejectedValue(new Error("Connection terminated unexpectedly"));
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.error).toBeDefined();
    expect(r.error).not.toContain("Connection terminated");
  });

  it("6b. si todas las fuentes fallan, no responde con éxito", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue({
      ...resumenVacio,
      errores: ["OpenAlex (Prof. 1): HTTP_503", "ORCID (Prof. 1): TIMEOUT"],
    });
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "" }));
    expect(r.exito).not.toBe(true);
  });

  it("6c. rechaza un año fuera de rango en vez de escanear todos los años", async () => {
    const { iniciarEscaneoAction } = await import("@/app/produccion/actions");
    escaneoFalso.ejecutarEscaneo.mockResolvedValue(resumenVacio);
    const r = await iniciarEscaneoAction({}, formulario({ profesorId: "todos", anio: "1500" }));
    expect(r.error).toBeDefined();
    expect(escaneoFalso.ejecutarEscaneo).not.toHaveBeenCalled();
  });
});
```

</details>

## 9. Segunda revisión (2026-11-03, commit `c2aa5b7`)

Irelys subió `c2aa5b7` ("correcciones de revisión PR #63, enriquecimiento Crossref, cuartiles Scopus y reporte unificado") después de la revisión de la sección 7. Se probó en una copia aislada de la rama (`git worktree`), con las mismas limitaciones de la sección 6: sin base de datos, sin `next dev` y sin llamadas reales a las API.

**Resultado: siguen los cambios solicitados.** Quedan resueltos casi todos los hallazgos; falta uno bloqueante (2a) y hay que decidir qué hacer con el cambio de alcance.

### 9.1 Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 14 archivos, 147 pruebas (antes 91) |
| `npm run lint` | Correcto: sin errores |
| `npm run typecheck` | Correcto (tras `prisma generate` en la copia aislada) |
| CI de GitHub (`verificar`) | Correcto |
| Vista previa de Vercel | Correcto |
| `npm run build` | No se corrió |

### 9.2 Pruebas de revisión: 11 de 11 pasan

El PR incorporó las pruebas de la sección 8 como `src/modules/produccion/revision-pr63.test.ts` y repitió 1a, 1b, 3a, 3b y la de ORCID en `deduplicacion.test.ts` y `conectores.test.ts`. Para que corra el alias `@/`, el PR agregó 6 líneas a `vitest.config.mts`.

| # | Prueba | Antes | Ahora |
|---|---|---|---|
| 1a | Mismo título exacto de 2019 y 2024, con DOI distinto, son dos obras | ✗ | ✓ |
| 1b | Títulos casi iguales del mismo año con DOI distinto son dos obras | ✗ | ✓ |
| C1 | *Control:* la misma obra en dos fuentes, una sin DOI, se fusiona | ✓ | ✓ |
| 3a | OpenAlex: un profesor con 150 obras devuelve las 150 | ✗ | ✓ |
| 3b | Scopus: un profesor con 150 obras devuelve las 150 | ✗ | ✓ |
| M1 | ORCID con filtro de año no incluye obras sin año | ✗ | ✓ |
| C2 | *Control:* un escaneo correcto responde con éxito | ✓ | ✓ |
| 2b | Si el escaneo lanza una excepción, el `Job` queda `FALLIDO` | ✗ | ✓ |
| 6a | No muestra a la persona el mensaje técnico de la excepción | ✗ | ✓ |
| 6b | Si todas las fuentes fallan, no responde con éxito | ✗ | ✓ |
| 6c | Rechaza un año fuera de rango en vez de escanear todos los años | ✗ | ✓ |

### 9.3 Pruebas nuevas del PR (sin relación con los hallazgos)

| Archivo | Pruebas | Cubre |
|---|---|---|
| `conectores/crossref.test.ts` | 13 | Conector de Crossref: formato de autores, caché, DOI inválido, error 404, enriquecimiento de lotes |
| `cuartiles.test.ts` | 19 | Normalización de cuartiles y ISSN, mapa de cuartiles, carga desde Excel, enriquecimiento |
| `reportes/unificado.test.ts` | 2 | Conversión a reporte y generación del libro Excel |
| `conectores/conectores.test.ts` | +8 | Paginación de Scopus y OpenAlex, índice H y falta de clave de Scopus, filtro de año de ORCID, enriquecimiento con Crossref |
| `deduplicacion.test.ts` | +3 | Casos 1a, 1b y control |

Los 147 pasan. Siguen sin prueba automática `escaneo.ts`, `repositorio.ts` y la ruta del cron: dependen de la base.

### 9.4 Estado de los hallazgos

| # | Hallazgo | Estado | Cómo se comprobó |
|---|---|---|---|
| 1a, 1b | `deduplicarLote` une obras distintas | Resuelto | Pruebas |
| 3a, 3b | Solo la primera página | Resuelto | Pruebas (OpenAlex con `cursor`, Scopus con `start`) |
| 2b | `Job` queda `EN_PROCESO` | Resuelto | Prueba en la acción; el cron ahora tiene `catch` que lo marca `FALLIDO` (leído, sin prueba) |
| 6a, 6b, 6c, M1 | Acción sin Zod, mensaje técnico, éxito falso, año fuera de rango, ORCID | Resuelto | Pruebas |
| 3c | Escaneo no incremental | Resuelto | Solo lectura: `escaneo.ts` consulta `obtenerUltimoCorte` y registra `registrarCorte` por profesor y fuente. Usa el **año** del último corte, no la fecha |
| 4 | Similitud ≥ 0.90 contra lo guardado | Resuelto, sin probar en la base | Solo lectura: `buscarSimilares` usa `%` y `similarity()`. La extensión `pg_trgm` y el índice GIN ya vienen en la migración inicial. Si la consulta falla, cae sin avisar a coincidencia exacta (`catch {}`) |
| 5 | `prisma` dentro de `src/modules/` | Resuelto | `escaneo.ts` recibe un repositorio; el acceso a Prisma pasó a `src/app/produccion/repositorio.ts` |
| 7 | Justificación de #59 | Resuelto | Está en `src/modules/produccion/README.md`. Falta que quede también en el issue |
| 8 | `.env.example` | Resuelto | El archivo cambió en el PR |
| **2a** | Escaneo de todos los profesores en una petición | **Abierto (bloqueante)** | Solo lectura, ver abajo |

### 9.5 Hallazgos nuevos

| # | Hallazgo | Gravedad |
|---|---|---|
| 12 | **El lote del cron no rota.** `ejecutarEscaneo` acepta `offsetProfesores`, pero la ruta del cron solo pasa `limiteProfesores: 25` y `obtenerProfesores` ordena por `id`. Cada día se escanean los mismos 25 primeros profesores activos; del 26 en adelante nunca. | Bloqueante |
| 13 | **La acción manual con "todos" no tiene lote ni `maxDuration`.** Sigue siendo una sola petición para todos los profesores. | Bloqueante junto con el 12 |
| 14 | **Cambio de alcance.** El commit agrega Crossref, cuartiles Scopus (RF-026) y `src/modules/reportes/unificado.ts` (RF-022/RF-026), además de `vitest.config.mts` y `package-lock.json`. `reportes` es de otro módulo y `unificado.ts` trae 388 líneas; AGENTS.md pide acordarlo antes. Si usa una librería de Excel nueva, también requiere acuerdo del equipo. | Regla del equipo |
| 15 | El `catch` de `buscarSimilares` oculta cualquier fallo de la consulta con `pg_trgm`; la deduplicación degrada a título exacto sin registrar nada. | Menor |

Los hallazgos 9, 10 y 11 de la sección 5 no se volvieron a revisar.

### 9.6 Lo que no se probó

- La pantalla `/produccion` en el navegador (tema claro, oscuro y celular).
- Un escaneo real contra Scopus, OpenAlex, ORCID o Crossref.
- La consulta con `similarity()` contra la base de desarrollo, y el comportamiento del cron en Vercel.
- `npm run build`.

### 9.7 Dictamen

**Cambios solicitados, con avance claro.** Antes de integrar:

1. Hacer que el lote del cron avance (por ejemplo, ordenando por el corte más antiguo o guardando el `offset`), y limitar o repartir el escaneo manual de "todos" (hallazgos 2a, 12 y 13).
2. Acordar en el chat del equipo el cambio de alcance (hallazgo 14), o separar Crossref, cuartiles y reporte unificado en otro PR.
3. Dejar escrita en el issue la justificación de #59.

## 10. Seguimiento de correcciones del autor (2026-11-05)

Este apartado registra el trabajo de I6 y sus verificaciones; **no sustituye la revisión independiente ni cambia el dictamen de la sección 9**.

| Entrega | Corrección | Evidencia |
|---|---|---|
| `0eb6d05` | El corte solo avanza después de guardar obras y autorías; recupera los años transcurridos y conserva el corte ante fallos | `escaneo.test.ts` |
| `ef85296` | Cola persistida por profesor; cron que continúa después del profesor 25, acción manual en segundo plano y reservas recuperables | `lotes.test.ts`, `trabajos.test.ts`, `cron.test.ts`, `revision-pr63.test.ts` |
| `320f4b3` | Recuperación de conflictos `P2002` por DOI y autoría; conserva validaciones y rechazos; un fallo de similitud impide crear sin comprobar duplicados | `repositorio.test.ts`, `integracion.test.ts` |
| Entrega de cliente HTTP | Cola por origen, separación de 250 ms, respeto de `Retry-After` y timeout que incluye la descarga del JSON | 14 pruebas en `conectores/http.test.ts`, con HTTP y reloj simulados |

### 10.1 Verificaciones locales de la entrega de cliente HTTP

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 30 archivos, 409 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; requiere acceso a Google Fonts |
| Infraestructura de similitud | Transacción de solo lectura sobre la conexión configurada: `pg_trgm` e índice GIN presentes; `similarity()` devuelve 1 sobre variantes de un título ficticio |
| CI de la entrega anterior `320f4b3` | Correcto; `verificar` y `Vercel Preview Comments` completados con éxito |

La comprobación de infraestructura no consultó profesores ni modificó datos. Las pruebas de integración usan el conector, el motor, el repositorio y las acciones de Validación reales, con HTTP, Prisma y sesión simulados.

### 10.2 Pendientes y límites

- Solicitar una nueva revisión independiente de las correcciones; no se han integrado a `main`.
- Revisar `/produccion` en claro, oscuro y celular. El navegador automatizado no pudo iniciar en la sesión anterior; no se declara verificación visual.
- Probar APIs reales y medir tiempos y recuperación del cron en Vercel. Un profesor con muchas páginas todavía puede exceder la duración de una ejecución; la reserva permite recuperarla.
- El control de tasa es por proceso: no coordina la cuota entre varias instancias de Vercel.
- Acordar el alcance de Crossref, cuartiles y reporte unificado (D-208), y dejar la justificación de #59 también en el issue. La justificación del README no equivale a un acuerdo del equipo.
- Acordar las consultas RF-PC y el conteo institucional de obras únicas con Validación y Reportes (D-209). No se modificaron esos módulos en estas correcciones.

## 11. Consulta real de fuentes en modo de solo lectura (2026-11-05)

Comprobación del autor desde el entorno local con los conectores actuales de ORCID y OpenAlex. Se tomó un ORCID público del archivo de entrada facilitado por I6, sin incluir el identificador ni los datos de la persona en el repositorio. No se utilizó Prisma, no se ejecutó el flujo de persistencia y no se guardaron publicaciones ni autorías.

| Fuente | HTTP con filtro 2026 | Publicaciones de 2026 | HTTP sin filtro de año | Publicaciones históricas |
|---|---|---|---|---|
| ORCID | 200 | 0 | 200 | 11 |
| OpenAlex | 200 | 0 | 200 | 17 |

Los resultados corresponden al mismo identificador en ambas consultas. Las cantidades históricas no se suman como obras únicas: pueden existir publicaciones compartidas entre fuentes. El cero de 2026 significa que esos conectores no devolvieron obras de ese año para este identificador; no es un fallo de conexión.

Esta prueba confirma conexión y transformación de respuestas reales desde el entorno local. Quedan pendientes Scopus, la ejecución integral del escaneo con persistencia autorizada y la comprobación de APIs y cron desde Vercel. El script temporal de diagnóstico se retiró; no se incorporó información personal ni claves al repositorio.

## 12. Consulta real de Scopus y ajuste de paginación (2026-11-05)

Prueba del autor en modo de solo lectura. La clave se obtuvo temporalmente del proyecto anterior proporcionado por I6, se transmitió al proceso por entrada estándar y no se guardó en archivos de entorno, código ni salida de diagnóstico. Se utilizó un Scopus ID del archivo de entrada sin publicarlo ni guardar datos de la persona.

La petición inicial del conector solicitaba `count=100`. Scopus respondió HTTP 400 con `INVALID_INPUT` y el mensaje «Exceeds the maximum number allowed for the service level». Tras reducir el tamaño de página a 25, las dos consultas respondieron HTTP 200:

| Consulta Scopus Search | HTTP | Publicaciones |
|---|---|---|
| Año 2026 | 200 | 0 |
| Sin filtro de año | 200 | 9 |

El resultado comprueba acceso y transformación de respuestas de Scopus Search desde el entorno local con esa clave. No comprueba el índice H, otros permisos de la clave, las variables de Vercel ni el escaneo integral con persistencia. No se utilizó Prisma ni se insertaron publicaciones o autorías; el script temporal fue retirado.

Las pruebas de regresión simulan un servicio que rechaza `count > 25` y devuelve 150 registros en seis páginas. Comprueban la recuperación completa y el avance `0, 25, 50, 75, 100, 125`. El dictamen independiente de la sección 9 permanece vigente hasta una nueva revisión.

## 13. Motor con fuentes reales y repositorio temporal en memoria (2026-11-05)

Prueba del autor con `ejecutarEscaneo`, los tres conectores y las reglas de deduplicación actuales. Se seleccionaron ORCID y Scopus ID de la misma fila del archivo de entrada, sin publicar esos valores. Tras consultar el historial se eligió 2025, el año más reciente con resultados entre los recuperados y no posterior a 2026.

El repositorio temporal almacenó las obras y las claves de autoría únicamente en memoria. No importó Prisma, no creó profesores ni modificó Supabase. La clave de Scopus se transmitió por entrada estándar y se mantuvo solo en el proceso; el script temporal se retiró después de la prueba.

| Medida | Primer escaneo de 2025 | Segundo escaneo de 2025 |
|---|---|---|
| Contextos de profesor procesados | 1 | 1 |
| Resultados recibidos de las fuentes antes de deduplicar | 3 | 3 |
| Obras consolidadas procesadas | 2 | 2 |
| Autorías nuevas en memoria | 2 | 0 |
| Errores del motor | 0 | 0 |
| Obras únicas totales en el repositorio temporal | 2 | 2 |

La repetición no aumentó las obras ni las autorías del repositorio temporal. El contador `publicacionesGuardadas` del motor incluye registros reutilizados, por lo que no debe interpretarse como cantidad de publicaciones nuevas.

Esta prueba comprueba consulta real, transformación, deduplicación y repetición con un repositorio en memoria. Se desactivó el enriquecimiento opcional de Crossref para aislar las tres fuentes. No prueba persistencia Prisma, validación docente, actualización de cortes, trabajos de segundo plano ni el despliegue de Vercel. La persistencia y la integración con Validación tienen pruebas simuladas en la sección 10; su recorrido real sigue pendiente.

## 14. Evidencia visual compartida durante la sesión (2026-11-05)

I6 proporcionó capturas de `/produccion` con sesión de administrador, en escritorio y temas claro y oscuro. Se observaron el selector de profesores de prueba, 30 publicaciones de demostración, 18 autorías pendientes y vínculos de coautoría en el listado. No se observaron superposiciones en las zonas visibles. No se incorporan las imágenes al repositorio porque muestran datos de la sesión.

Las capturas confirman la lectura y presentación de datos de demostración desde la vista previa; no demuestran extracción real desde las APIs. No permiten certificar contraste AA, toda la página ni el commit desplegado. La revisión de celular se pospuso a petición de I6 y permanece pendiente. El navegador automatizado continuó sin poder iniciar.
