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
