# Revisión del PR #285: ajustes del panel de administración tras las revisiones de #267, #268 y #269 (#281)

Revisión independiente del [PR #285](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/285) de `edelpinovs` (I1), que cierra el issue [#281](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/281). El PR trae su propio registro (`PR-285-ajustes-panel-administracion.md`), que es la prueba de quien lo preparó; este documento es la revisión aparte.

| Campo | Valor |
|---|---|
| PR | #285 (`Closes #281`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M1-ajustes-panel-administracion` → `main` |
| Commit revisado | `f034b3f` |
| Fecha de la revisión | 2026-11-24 |
| Revisó | Edel Pino (con Claude Code) |
| Entorno | Local (Windows 10, Node 24), la rama del PR traída con `git fetch origin pull/285/head`, con `npm ci` y el cliente de Prisma generado. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** No hay código roto; quedan dos puntos menores y lo que no se pudo probar sin navegador ni base |

**Límite de esta revisión:** el autor y quien la hace son la misma persona (I1), así que no cumple D-006: el PR sigue necesitando la aprobación de otra persona del equipo antes de integrarse.

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/app/administracion/exportar/route.ts` | Tope de filas por formato, 500 en español si falla la bitácora, filtros en el resumen y rechazo de `Sec-Fetch-Site: cross-site` con 403 |
| `src/modules/administracion/exportar.ts` | `LIMITE_FILAS_PDF` (2 000), `limiteFilas`, `motivoDemasiadasFilas(total, formato)`, `descripcionFiltros` y `resumenExportacion` con filtros |
| `src/modules/administracion/escaneo.ts` y `src/app/administracion/escaneo/page.tsx` | Conteos con `count` y `groupBy` en la base; solo se cargan los cinco últimos; `ventanaDesde` |
| `src/modules/administracion/auditoria.ts` | `resumenEdicionUsuario` no llama «código» al id interno |
| `src/app/administracion/auditoria/page.tsx` | Oculta el filtro «Módulo» mientras haya un solo módulo |
| `src/app/administracion/permisos.test.tsx` | Prueba nueva: las seis páginas piden `requireModulo("administracion")` antes de consultar |
| `prisma/schema.prisma` | Solo un comentario de `Auditoria.resumen` |
| Pruebas y `docs/pruebas/PR-285-ajustes-panel-administracion.md` | Pruebas nuevas o ajustadas y el registro del autor |

No hay cambios de esquema reales, migración ni dependencias. `prisma/schema.prisma` es un archivo compartido y el cambio es solo un comentario.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (rama del PR) | Correcto: 1255 pruebas, las mismas que declara el autor |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | No lo corrí; el autor declara que pasa y el CI de GitHub (`verificar`) lo ejecuta |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |
| Mezcla con `main` | GitHub la marca `MERGEABLE`; el estado `BLOCKED` es solo la aprobación pendiente. No hice una mezcla local |

## 3. Lo que se leyó y está bien

- **Permiso primero:** `requireModulo("administracion")` sigue siendo lo primero que hace la ruta, incluso antes de mirar `Sec-Fetch-Site`. Una persona sin permiso no averigua nada sobre el pedido.
- **Tope por formato:** el PDF admite 2 000 filas y el Excel 10 000. Entre 2 001 y 10 000 el mensaje manda al Excel; por encima de 10 000 pide acotar. Los límites se aplican a los tres listados, también a calidad, que se cuenta en memoria (R2).
- **Bitácora:** si falla, no se entrega el archivo y la respuesta es un 500 con texto propio en español, sin repetir el error de la base. El texto buscado no se guarda, solo «con búsqueda de texto» (R5). Un filtro con valor inválido se rechaza antes de escribir en la bitácora (R3).
- **`Sec-Fetch-Site`:** `cross-site` da 403 en los tres listados y los dos formatos, sin leer datos ni registrar (R1). Quien abre el enlace desde el panel (`same-origin`), desde un marcador (`none`) o desde un navegador que no manda la cabecera sigue pasando.
- **Escaneo:** `ultimo` sale de la consulta ordenada por fecha y `id` con `take: 5`, igual que antes; la ventana de recientes usa la misma comparación (`creadoEn >= hoy - VENTANA_DIAS`). Las cifras ya no dependen de los 200 trabajos más recientes.
- **`permisos.test.tsx`:** falla si una página consulta antes de pedir el permiso, porque cualquier consulta cae en el mismo doble y la prueba exige que no se haya llamado.
- **Mensajes:** todos los textos nuevos están en español y las pruebas del autor los fijan.

## 4. Pruebas de revisión

Archivo temporal `src/app/administracion/exportar/revision-285.test.ts`, que se borró después (el código está al final).

| # | Qué comprueba | Resultado |
|---|---|---|
| R1 | `cross-site` da 403 en los tres listados y en Excel y PDF, y no escribe en la bitácora | Pasa |
| R2 | Calidad con 2 001 hallazgos: PDF rechazado con el mensaje que sugiere el Excel, y el Excel pasa | Pasa |
| R3 | Un rol inexistente en la URL da 400 y no llega a la bitácora | Pasa |
| R4 | Si la bitácora falla, responde 500 y **no se escribe nada en el registro del servidor** | Pasa (demuestra el hallazgo 1) |
| R5 | El texto buscado nunca llega al resumen de la bitácora | Pasa |

## 5. Hallazgos

| # | Tipo | Hallazgo | Qué hacer |
|---|---|---|---|
| 1 | Menor | Cuando falla la bitácora, `route.ts` devuelve el 500 pero descarta el error: no queda rastro en el registro del servidor (R4). Si el fallo se repite, quien administra no sabe por qué | Escribir `console.error` con un texto fijo y el nombre del error, sin la consulta ni los filtros, antes de responder |
| 2 | Menor | `enCurso` cuenta pendientes y en proceso de cualquier antigüedad sobre toda la tabla, no solo sobre los 200 últimos. Un trabajo atascado hace meses se muestra siempre como «en curso» | Decidir si basta, o si «en curso» también debe limitarse a un periodo; anotarlo en el registro del autor |
| 3 | Observación | `Sec-Fetch-Site` no existe en navegadores antiguos y `same-site` pasa. Es una defensa por capas, no un control completo; el permiso por rol sigue siendo la barrera principal | Sin acción; ya está dicho en el registro del autor |
| 4 | Observación | El registro del autor compara con `main` (110 archivos, 1229 pruebas), cifra que ya cambió porque `main` avanzó | Sin acción |

## 6. Lo que no se probó

- **Las pantallas en el navegador** (tema claro, oscuro y celular): la bitácora sin el filtro de módulo y las tarjetas del escaneo.
- **Un PDF o un Excel descargado:** no se abrió ninguno.
- **`groupBy` y `count` contra la base real:** solo se probó la función pura con cifras simuladas.
- **El límite de 4.5 MB de la respuesta de Vercel:** no se verificó.
- **`Sec-Fetch-Site` con un navegador real:** solo con cabeceras simuladas.
- **`npm run build` y la mezcla local con `main`.**

## 7. Dictamen

**Aprobable con comentarios.** Hacer (1) antes o después de integrar según lo decida el autor, decidir (2), y revisar en el navegador lo del apartado 6. Falta la aprobación de otra persona del equipo (D-006).

<details>
<summary>Código de las pruebas de revisión (apartado 4)</summary>

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Pruebas de la revisión independiente del PR #285 (no forman parte del PR).
const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  cargarHallazgos: vi.fn(),
  perfil: { count: vi.fn(), findMany: vi.fn() },
  auditoria: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("../calidad/cargar", () => ({ cargarHallazgos: dobles.cargarHallazgos }));

const pedir = (consulta: string, cabeceras: Record<string, string> = {}) =>
  GET(new Request(`http://localhost/administracion/exportar${consulta}`, { headers: cabeceras }));
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };
const hallazgo = (n: number) => ({
  clave: `CA_SIN_LIDER:${n}`, regla: "CA_SIN_LIDER", severidad: "aviso", registro: `CA-${n}`, detalle: "Sin líder.", enlace: `/cuerpos-academicos/${n}`,
});

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(ADMIN);
  dobles.perfil.count.mockResolvedValue(1);
  dobles.perfil.findMany.mockResolvedValue([]);
  dobles.auditoria.count.mockResolvedValue(1);
  dobles.auditoria.findMany.mockResolvedValue([]);
  dobles.auditoria.create.mockResolvedValue({});
  dobles.cargarHallazgos.mockResolvedValue([hallazgo(1)]);
});
afterEach(() => vi.restoreAllMocks());

describe("revisión PR #285", () => {
  it("R1 cross-site se rechaza en los tres listados y los dos formatos", async () => {
    for (const listado of ["usuarios", "auditoria", "calidad"]) {
      for (const formato of ["xlsx", "pdf"]) {
        const r = await pedir(`?listado=${listado}&formato=${formato}`, { "Sec-Fetch-Site": "cross-site" });
        expect(r.status, `${listado}/${formato}`).toBe(403);
      }
    }
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("R2 calidad: 2 001 hallazgos en PDF se rechazan y en Excel pasan", async () => {
    dobles.cargarHallazgos.mockResolvedValue(Array.from({ length: 2001 }, (_, i) => hallazgo(i + 1)));
    const pdf = await pedir("?listado=calidad&formato=pdf");
    expect(pdf.status).toBe(400);
    expect(await pdf.text()).toContain("un PDF admite como máximo 2,000");
    const excel = await pedir("?listado=calidad&formato=xlsx");
    expect(excel.status).toBe(200);
  });

  it("R3 un filtro con valor inválido no llega a la bitácora ni al archivo", async () => {
    const r = await pedir("?listado=usuarios&formato=xlsx&rol=SUPERUSUARIO");
    expect(r.status).toBe(400);
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("R4 si la bitácora falla, el error no queda en el registro del servidor (hallazgo menor)", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    dobles.auditoria.create.mockRejectedValue(new Error("connection terminated"));
    const r = await pedir("?listado=usuarios&formato=xlsx");
    expect(r.status).toBe(500);
    // Hoy: nadie anota la causa. Quien administra no puede saber por qué falla.
    expect(consola).not.toHaveBeenCalled();
  });

  it("R5 el texto buscado nunca llega al resumen de la bitácora", async () => {
    await pedir("?listado=usuarios&formato=xlsx&q=secreto%40ejemplo.mx");
    const resumen = dobles.auditoria.create.mock.calls[0][0].data.resumen as string;
    expect(resumen).not.toContain("secreto");
    expect(resumen).toContain("con búsqueda de texto");
  });
});
```

</details>
