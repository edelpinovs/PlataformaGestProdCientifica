# Prueba del PR #134: Historial inicial de ORCID y OpenAlex (RF-020, issue #133)

Registro de la revisión del [PR #134](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/134) de `irybyron` (rama `feat/M6-RF-020-historial-inicial`, commit `5a3738e`). Cierra #133. Sin cambios de esquema.

## 1. Alcance revisado

| Archivo | Qué cambia |
|---|---|
| `src/modules/produccion/escaneo.ts` | Sin año ni corte previo, ORCID y OpenAlex se consultan una vez sin filtro de año (historial); con corte siguen incrementales; un año explícito conserva su alcance. Scopus no cambia |
| `src/modules/produccion/conectores/openalex.ts` | Si falla una página posterior se descarta el lote en lugar de devolver uno parcial |
| `src/app/produccion/formulario-escaneo.tsx` | Texto y marcador que explican el comportamiento |
| `src/modules/produccion/README.md` | Documenta la regla |

## 2. Chequeos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 585 pruebas pasan (46 archivos): 579 del PR y 6 de esta revisión |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Pruebas de revisión: 6 de 6 pasan

Código en la sección 5.

| Id | Qué comprueba |
|---|---|
| H1 | Sin año ni corte, ORCID y OpenAlex se consultan una sola vez sin año; Scopus sigue con el año actual |
| H2 | Con corte previo vuelve al incremental (año del corte menos uno hasta el actual) |
| H3 | Un año explícito conserva su alcance, ignora el corte y no lo modifica |
| H4 | El historial guarda obras antiguas y sin fecha y solo entonces registra el corte de cada fuente |
| H5 | Si OpenAlex falla no avanza su corte (se reintenta el historial) y ORCID sí avanza |
| H6 | Tras el historial, el siguiente escaneo es incremental |

## 4. Hallazgos y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | `DECISIONES.md` y `SEGUIMIENTO.md`: las filas nuevas quedan separadas de su tabla por una línea en blanco y el registro de pruebas empieza con una marca BOM; además chocan con los PR #132 y #140 |
| 2 | Menor | La consulta de OpenAlex no tiene tope de páginas; un perfil muy grande depende del tiempo por profesor (el PR ya lo reconoce) |
| 3 | Aviso | El primer escaneo de un profesor traerá todo su historial y las autorías nuevas llegarán de golpe a Validación como pendientes; conviene avisar a quien valida |
| 4 | Aviso | Los profesores que ya tienen corte no recuperan su historial anterior (decisión del PR) |
| 5 | Menor | Descartar el lote parcial también cambia los escaneos con año: ahora un fallo de página devuelve error sin publicaciones, lo cual es más seguro |

**Aprobable con comentarios.** No se probó: la pantalla en el navegador (claro, oscuro, celular), los servicios reales de ORCID y OpenAlex con historiales extensos y `npm run build` en la copia.

## 5. Código de las pruebas de revisión

<details>
<summary><code>src/modules/produccion/revision-pr134.test.ts</code></summary>

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ejecutarEscaneo, type RepositorioProduccion } from "./escaneo";
import { consultarScopus } from "./conectores/scopus";
import { consultarOpenAlex } from "./conectores/openalex";
import { consultarOrcid } from "./conectores/orcid";
import type { PublicacionCandidata } from "./tipos";

vi.mock("./conectores/scopus", () => ({ consultarScopus: vi.fn() }));
vi.mock("./conectores/openalex", () => ({ consultarOpenAlex: vi.fn() }));
vi.mock("./conectores/orcid", () => ({ consultarOrcid: vi.fn() }));
vi.mock("./conectores/crossref", () => ({ enriquecerLoteConCrossref: vi.fn() }));

const inicio = new Date("2026-03-10T12:00:00Z");
const obra = (fuente: "ORCID" | "OPENALEX", anio: number | null, n = 1): PublicacionCandidata => ({
  tipo: "ARTICULO", titulo: `Obra ficticia ${n}`, autoresTexto: "Autor ficticio", profesorId: 1, fuente,
  anio: anio as number, doi: `10.1000/rev134-${fuente}-${n}`,
});

function repo(corte: Date | null = null) {
  return {
    obtenerProfesores: vi.fn().mockResolvedValue([
      { id: 1, nombres: "Persona", apellidos: "Ficticia", orcid: "0000-0000-0000-0001", scopusId: "123" },
    ]),
    buscarPorDoi: vi.fn().mockResolvedValue(null), buscarSimilares: vi.fn().mockResolvedValue([]),
    persistirOActualizar: vi.fn().mockResolvedValue(10),
    vincularAutoria: vi.fn().mockResolvedValue(true),
    obtenerUltimoCorte: vi.fn().mockResolvedValue(corte),
    registrarCorte: vi.fn().mockResolvedValue(undefined),
    actualizarJob: vi.fn().mockResolvedValue(undefined),
  } satisfies RepositorioProduccion;
}

describe("Revisión PR #134: historial inicial de ORCID y OpenAlex", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(inicio);
    vi.mocked(consultarScopus).mockResolvedValue({ publicaciones: [] });
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [] });
    vi.mocked(consultarOpenAlex).mockResolvedValue({ publicaciones: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("H1: sin año ni corte, ORCID y OpenAlex se consultan una sola vez sin año; Scopus sigue con el año actual", async () => {
    await ejecutarEscaneo({ fuentes: ["ORCID", "OPENALEX", "SCOPUS"] }, repo());
    expect(consultarOrcid).toHaveBeenCalledTimes(1);
    expect(vi.mocked(consultarOrcid).mock.calls[0][1]).toBeUndefined();
    expect(consultarOpenAlex).toHaveBeenCalledTimes(1);
    expect(vi.mocked(consultarOpenAlex).mock.calls[0][1]).toBeUndefined();
    expect(vi.mocked(consultarScopus).mock.calls.map((c) => c[1])).toEqual([2026]);
  });

  it("H2: con corte previo vuelve al incremental (año del corte menos uno hasta el actual)", async () => {
    await ejecutarEscaneo({ fuentes: ["ORCID", "OPENALEX"] }, repo(new Date("2025-06-01T00:00:00Z")));
    expect(vi.mocked(consultarOrcid).mock.calls.map((c) => c[1])).toEqual([2024, 2025, 2026]);
    expect(vi.mocked(consultarOpenAlex).mock.calls.map((c) => c[1])).toEqual([2024, 2025, 2026]);
  });

  it("H3: un año explícito conserva su alcance, ignora el corte y no lo modifica", async () => {
    const r = repo(new Date("2025-06-01T00:00:00Z"));
    await ejecutarEscaneo({ fuentes: ["ORCID", "OPENALEX"], anio: 2019 }, r);
    expect(vi.mocked(consultarOrcid).mock.calls.map((c) => c[1])).toEqual([2019]);
    expect(vi.mocked(consultarOpenAlex).mock.calls.map((c) => c[1])).toEqual([2019]);
    expect(r.registrarCorte).not.toHaveBeenCalled();
  });

  it("H4: el historial guarda obras antiguas y sin fecha y solo entonces registra el corte de cada fuente", async () => {
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra("ORCID", 1999), obra("ORCID", null, 2)] });
    vi.mocked(consultarOpenAlex).mockResolvedValue({ publicaciones: [obra("OPENALEX", 2005)] });
    const r = repo();
    const resumen = await ejecutarEscaneo({ fuentes: ["ORCID", "OPENALEX"] }, r);
    expect(resumen.errores).toEqual([]);
    expect(r.persistirOActualizar).toHaveBeenCalledTimes(3);
    expect(r.registrarCorte).toHaveBeenCalledWith(1, "ORCID", inicio);
    expect(r.registrarCorte).toHaveBeenCalledWith(1, "OPENALEX", inicio);
  });

  it("H5: si OpenAlex falla, no avanza su corte (se reintenta el historial) y ORCID sí avanza", async () => {
    vi.mocked(consultarOrcid).mockResolvedValue({ publicaciones: [obra("ORCID", 2001)] });
    vi.mocked(consultarOpenAlex).mockResolvedValue({ publicaciones: [], error: "HTTP_503" });
    const r = repo();
    const resumen = await ejecutarEscaneo({ fuentes: ["ORCID", "OPENALEX"] }, r);
    expect(resumen.errores.join(" ")).toContain("OpenAlex (Prof. 1): HTTP_503");
    expect(r.registrarCorte).toHaveBeenCalledWith(1, "ORCID", inicio);
    expect(r.registrarCorte).not.toHaveBeenCalledWith(1, "OPENALEX", expect.anything());
  });

  it("H6: tras el historial, el siguiente escaneo es incremental (no repite el historial)", async () => {
    const r = repo(inicio);
    await ejecutarEscaneo({ fuentes: ["ORCID"] }, r);
    expect(vi.mocked(consultarOrcid).mock.calls.map((c) => c[1])).toEqual([2025, 2026]);
  });
});
```

</details>
