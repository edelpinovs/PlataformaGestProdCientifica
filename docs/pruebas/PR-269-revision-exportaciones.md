# Revisión del PR #269: panel de administración, fase 4, exportar listados a Excel y PDF (#244)

Revisión detallada del [PR #269](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/269) de `edelpinovs`. Amplía lo dicho sobre este PR en [PR-263-269-panel-administracion.md](PR-263-269-panel-administracion.md). El registro que dejó quien lo preparó está en su rama (`PR-269-admin-fase4-exportaciones.md`).

| Campo | Valor |
|---|---|
| PR | #269 (refs #244; no lo cierra) |
| Autor | @edelpinovs |
| Rama | `feat/M1-administracion-exportaciones` → `feat/M1-administracion-escaneo-parametros` (PR #268, aún abierto) |
| Commit revisado | `333b52f` |
| Fecha de la revisión | 2026-11-23 |
| Revisó | Edel Pino (con Claude Code). Es el mismo dueño que preparó el PR: **otra persona debe aprobarlo** |
| Entorno | Local (Windows 10, Node 24), copia aislada de la rama (`git worktree`) con `npm ci`, `prisma generate` y las variables de relleno del CI. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Un punto a decidir antes de integrar (tamaño del PDF) y cinco menores; ninguno bloquea |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/modules/administracion/exportar.ts` (+ prueba) | Valida listado y formato, arma el enlace de descarga, tope de filas, las tres tablas exportables y el texto de la bitácora |
| `src/app/administracion/exportar/route.ts` (+ prueba) | Ruta GET: permiso, consulta todas las filas que coinciden, genera el archivo y deja constancia en la bitácora |
| `src/app/administracion/descargas.tsx` | Botones «Descargar Excel» y «Descargar PDF» (enlaces `<a>`) |
| `src/app/administracion/{usuarios,auditoria,calidad}/page.tsx` | Muestran los botones; la carga de hallazgos pasa a `calidad/cargar.ts` |
| `src/modules/administracion/auditoria.ts` | Nueva acción «Exportó un listado» |
| `src/app/administracion/page.tsx` | Enlaces a los reportes que ya se exportan desde Reportes |

No hay cambios de esquema ni dependencias nuevas: reutiliza `generarExcel`, `generarPdf` y `TablaExportable` de Reportes.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `prisma validate` | Correcto |
| `npm test` | Correcto: 110 archivos, 1219 pruebas (23 nuevas, 1196 → 1219) |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto; compila `/administracion/exportar` |

Con mis pruebas de revisión (sección 4) la suite queda en 112 archivos y 1240 pruebas, todas correctas; esas pruebas **no** forman parte del PR. La descripción dice que falla `produccion/conectores/http.test.ts` (1218 de 1219) y que solo corre con `--pool=vmThreads`: aquí pasó completa con la configuración por defecto. El PR todavía se apoya en la rama del #268, que sigue abierta.

## 3. Lo que se leyó y está bien

- **Permisos:** `requireModulo("administracion")` es lo primero que hace la ruta, antes de leer los parámetros o los datos (prueba incluida). Solo `ADMINISTRADOR`.
- **Validación:** `listado` y `formato` se validan con Zod y mensajes en español; un filtro inválido se rechaza con 400 en lugar de exportar todo; un `listado` repetido o un formato en mayúsculas también (R4, R5).
- **Todo lo que coincide, no la página:** el enlace quita `pagina` y la consulta no usa `skip` ni `take` (X1, R3). El orden del listado se conserva.
- **Tope:** 10 000 filas; con más devuelve 400 con un mensaje que pide acotar la búsqueda y no deja constancia (X5, R6).
- **Constancia en la bitácora:** se escribe después de generar el archivo y antes de entregarlo; si falla, el archivo no se entrega (R1).
- **Excel sin fórmulas:** una celda que empieza con `=` o `@` queda como texto (X11).
- **PDF bien formado:** escapa paréntesis y barras invertidas, y los caracteres fuera de Latin-1 salen como «?» en lugar de romper el archivo (X12); con cero filas también es un archivo válido (X13).
- **Cabeceras:** `Content-Disposition` con nombre fijo (sin datos del usuario), `Cache-Control: no-store` y tipo MIME correcto.
- **Sin dependencias nuevas** y sin cambios de esquema.

## 4. Pruebas de revisión

Dos archivos (código en la sección 7): `src/modules/administracion/revision-pr269.test.ts` (14 pruebas) y `src/app/administracion/exportar/revision-pr269.test.ts` (7 pruebas). Las 21 pasan contra la rama; cada una **fija** un comportamiento, a veces para dejar constancia de un hallazgo.

| # | Prueba | Resultado |
|---|---|---|
| X1 | El enlace conserva búsqueda, filtros y orden, y quita la página | ✓ |
| X2 | Sin búsqueda ni filtros solo lleva `listado` y `formato` | ✓ |
| X3 | Un texto con `&` o `=` viaja codificado y no se confunde con otro parámetro | ✓ |
| X4 | Mensajes en español cuando faltan o son inválidos listado y formato (incluye `listado` repetido y `PDF` en mayúsculas) | ✓ |
| X5 | El tope es de 10 000 filas; 10 001 pide acotar | ✓ |
| X6 | Nombre de archivo y resumen de la bitácora (singular y plural) | ✓ |
| X7 | Un usuario sin profesor deja vacías las columnas del profesor | ✓ |
| X8 | Un módulo o acción desconocidos de la bitácora salen con su clave, sin fallar | ✓ |
| X9 | La fecha de la bitácora sale en hora de Ciudad de México | ✓ |
| X10 | Una tabla de calidad vacía genera columnas sin filas | ✓ |
| X11 | Una celda con `=` o `@` queda como texto en el Excel | ✓ |
| X12 | El PDF escapa paréntesis y barras; fuera de Latin-1 sale «?» | ✓ (hallazgo 5) |
| X13 | Con cero filas, Excel y PDF son archivos válidos | ✓ |
| X14 | En el PDF un texto largo se recorta; en el Excel se conserva completo | ✓ (hallazgo 5) |
| R1 | Si falla la bitácora, la ruta lanza el error y no responde con un mensaje en español | ✓ (hallazgo 2) |
| R2 | La bitácora no guarda la búsqueda ni los filtros usados | ✓ (hallazgo 3) |
| R3 | Un `pagina` en la URL no limita lo que se exporta | ✓ |
| R4 | Un `listado` repetido da 400 y no lee datos | ✓ |
| R5 | El formato en mayúsculas da 400 | ✓ |
| R6 | Una exportación rechazada por exceso de filas no deja constancia | ✓ |
| R7 | El error es texto plano en UTF-8 | ✓ |

### Medición con el tope (10 000 filas de bitácora)

Prueba temporal, no incluida: 10 000 filas con un resumen de unos 110 caracteres, en un Node local.

| Archivo | Tiempo | Tamaño |
|---|---|---|
| Excel | 0.8 s | 0.28 MB |
| PDF | 0.2 s | **5.5 MB** (unas 910 páginas) |

## 5. Hallazgos

1. **El PDF con el tope de filas pesa 5.5 MB.** Vercel documenta un límite de 4.5 MB para el cuerpo de la respuesta de una función (verificar el valor vigente en su documentación); si aplica, un PDF de bitácora cerca de las 10 000 filas fallaría solo en producción, no en local. El Excel no tiene ese problema (0.28 MB). Opciones: un tope menor para el PDF (por ejemplo 2 000 filas, unas 180 páginas y 1.1 MB), o dejar el PDF para listados acotados y ofrecer solo Excel por encima de ese tope. Difícilmente alguien leerá 900 páginas de PDF.
2. **Si falla la escritura en la bitácora, la persona ve el error genérico de Next.js** y no un mensaje en español (R1). El archivo no se entrega, que es lo correcto, pero la ruta ya responde con texto propio en los demás rechazos (400); conviene capturar este fallo y responder 500 con «No se pudo registrar la descarga. Inténtalo de nuevo.».
3. **La bitácora no dice qué se exportó exactamente.** Guarda listado, formato y número de filas (R2), pero no la búsqueda ni los filtros: no se distingue «todos los usuarios» de «los coordinadores desactivados». Para auditar una salida de datos conviene anotar los filtros (rol, estado, regla, módulo, acción) y, si se quiere evitar guardar texto libre, omitir solo la búsqueda `q`.
4. **La descarga es un GET con efecto** (escribe en la bitácora). Ya señalado en la revisión conjunta: la cookie de sesión no viaja en peticiones entre sitios que no sean navegación, así que el riesgo es bajo; se puede pasar a POST si se prefiere. No bloquea.
5. **El PDF recorta los textos largos y reemplaza los caracteres fuera de Latin-1 por «?»** (X12, X14). Un texto de unos 700 caracteres pierde el final en el PDF y se conserva completo en el Excel. Con el resumen de la bitácora (máximo 500 caracteres, normalmente unos 100) casi nunca importa, pero la descripción del PR no lo menciona. Un nombre con caracteres fuera de Latin-1 saldría como «???». El comportamiento viene de Reportes (`generarPdf`), no de este PR.
6. **La descripción está desactualizada en dos puntos.** Repite que falla `produccion/conectores/http.test.ts` (aquí pasa) y el registro de la rama dice «sigue en borrador» aunque el PR ya está listo para revisión.

## 6. Lo que no se probó

- **Las pantallas en el navegador** (claro, oscuro y celular): los botones «Descargar Excel» y «Descargar PDF» en `/administracion/usuarios`, `/auditoria` y `/calidad`, y cómo se apilan en celular.
- **Los archivos descargados abiertos** en Excel y en un lector de PDF. Las pruebas comprueban los primeros bytes, el contenido leído con `exceljs` y el texto del PDF, no su aspecto.
- **La descarga real en Vercel:** el límite de tamaño de la respuesta (hallazgo 1), el tiempo de la función con 10 000 filas y el comportamiento con sesión real y con un rol sin acceso.
- **Contra la base real:** las consultas con `count` y `findMany` de los tres listados y la escritura en `Auditoria`. Las pruebas usan un `prisma` simulado.
- **Memoria:** no se midió el consumo de la función con 10 000 filas, solo tiempo y tamaño.

## 7. Código de las pruebas de revisión

<details>
<summary><code>src/modules/administracion/revision-pr269.test.ts</code></summary>

```ts
// Revisión del PR #269: casos que las pruebas del PR no cubren.
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { analizarListado } from "@/lib/listados/consulta";
import { generarExcel, generarPdf } from "@/modules/reportes/exportar";
import { LISTADO_USUARIOS } from "./usuarios-listado";
import {
  enlaceExportacion,
  leerPedido,
  LIMITE_FILAS,
  motivoDemasiadasFilas,
  nombreArchivo,
  resumenExportacion,
  tablaAuditoria,
  tablaCalidad,
  tablaUsuarios,
} from "./exportar";

const consulta = (p: Record<string, string> = {}) => analizarListado(LISTADO_USUARIOS, p).consulta;

describe("enlace de descarga", () => {
  it("X1: conserva búsqueda, filtros y orden, y quita la página", () => {
    const enlace = enlaceExportacion(
      "usuarios", "xlsx", LISTADO_USUARIOS,
      consulta({ q: "ana pérez", rol: "COORDINADOR", orden: "estado", dir: "desc", pagina: "3" }),
    );
    const url = new URL(enlace, "http://x");
    expect(url.pathname).toBe("/administracion/exportar");
    expect(url.searchParams.get("q")).toBe("ana pérez");
    expect(url.searchParams.get("rol")).toBe("COORDINADOR");
    expect(url.searchParams.get("orden")).toBe("estado");
    expect(url.searchParams.get("dir")).toBe("desc");
    expect(url.searchParams.get("listado")).toBe("usuarios");
    expect(url.searchParams.get("formato")).toBe("xlsx");
    expect(url.searchParams.has("pagina")).toBe(false);
  });

  it("X2: sin búsqueda ni filtros solo lleva listado y formato", () => {
    expect(enlaceExportacion("usuarios", "pdf", LISTADO_USUARIOS, consulta())).toBe(
      "/administracion/exportar?listado=usuarios&formato=pdf",
    );
  });

  it("X3: un texto con & o = viaja codificado y no se confunde con otro parámetro", () => {
    const url = new URL(enlaceExportacion("usuarios", "pdf", LISTADO_USUARIOS, consulta({ q: "a&formato=xlsx" })), "http://x");
    expect(url.searchParams.get("q")).toBe("a&formato=xlsx");
    expect(url.searchParams.get("formato")).toBe("pdf");
  });
});

describe("pedido", () => {
  it("X4: pide listado y formato en español cuando faltan o son inválidos", () => {
    expect(leerPedido({})).toEqual({ error: "Elige qué listado exportar." });
    expect(leerPedido({ listado: "usuarios" })).toEqual({ error: "Elige Excel o PDF." });
    expect(leerPedido({ listado: "usuarios", formato: "PDF" })).toEqual({ error: "Elige Excel o PDF." });
    expect(leerPedido({ listado: ["usuarios", "auditoria"], formato: "pdf" })).toEqual({ error: "Elige qué listado exportar." });
  });

  it("X5: el tope es de 10 000 filas; 10 001 pide acotar", () => {
    expect(motivoDemasiadasFilas(LIMITE_FILAS)).toBeNull();
    expect(motivoDemasiadasFilas(LIMITE_FILAS + 1)).toBe(
      "Hay 10,001 registros y el máximo por descarga es 10,000. Acota la búsqueda con filtros e inténtalo de nuevo.",
    );
  });

  it("X6: nombre de archivo y resumen de la bitácora", () => {
    expect(nombreArchivo("calidad", "pdf")).toBe("calidad-de-datos.pdf");
    expect(resumenExportacion("usuarios", "xlsx", 1)).toBe("Exportó el listado de usuarios y roles a Excel (1 fila).");
    expect(resumenExportacion("auditoria", "pdf", 0)).toBe("Exportó el listado de auditoría a PDF (0 filas).");
  });
});

describe("tablas", () => {
  it("X7: un usuario sin profesor deja vacías las columnas del profesor", () => {
    const t = tablaUsuarios([{ correo: "a@b.mx", rol: "DOCENTE", activo: false, profesor: null }]);
    expect(t.filas[0]).toEqual(["a@b.mx", "Docente", "", "", "Desactivado"]);
  });

  it("X8: un módulo o acción desconocidos de la bitácora salen con su clave, sin fallar", () => {
    const t = tablaAuditoria([{ creadoEn: new Date("2026-11-23T18:00:00Z"), actorCorreo: "x@y.mx", modulo: "otro", accion: "otra.cosa", resumen: "r" }]);
    expect(t.filas[0].slice(2)).toEqual(["otro", "otra.cosa", "r"]);
  });

  it("X9: la fecha de la bitácora sale en hora de Ciudad de México", () => {
    const t = tablaAuditoria([{ creadoEn: new Date("2026-11-23T03:30:00Z"), actorCorreo: "x", modulo: "administracion", accion: "usuario.editado", resumen: "r" }]);
    expect(t.filas[0][0]).toContain("22");
  });

  it("X10: una tabla de calidad vacía genera columnas sin filas", () => {
    expect(tablaCalidad([])).toMatchObject({ columnas: ["Registro", "Problema", "Detalle"], filas: [] });
  });
});

describe("archivos generados", () => {
  const fila = ["=1+1", "@SUMA(A1)", "Ana (Pérez) \\ Nuñez", "日本語 ✓"];
  const tabla = { titulo: "Prueba", hoja: "Hoja", columnas: ["A", "B", "C", "D"], filas: [fila] };

  it("X11: una celda que empieza con = o @ queda como texto en el Excel, no como fórmula", async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarExcel(tabla)) as unknown as ExcelJS.Buffer);
    const celda = libro.getWorksheet("Hoja")!.getCell("A2");
    expect(celda.type).toBe(ExcelJS.ValueType.String);
    expect(celda.value).toBe("=1+1");
    expect(libro.getWorksheet("Hoja")!.getCell("B2").type).toBe(ExcelJS.ValueType.String);
  });

  it("X12: el PDF escapa paréntesis y barras, y los caracteres fuera de Latin-1 salen como «?»", () => {
    const pdf = generarPdf(tabla).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("Ana \\(P");
    expect(pdf).toContain("\\\\ Nu");
    expect(pdf).toContain("??? ?");
  });

  it("X13: con cero filas, el Excel y el PDF siguen siendo archivos válidos", async () => {
    const vacia = { titulo: "V", hoja: "V", columnas: ["A"], filas: [] };
    expect((await generarExcel(vacia)).subarray(0, 2).toString()).toBe("PK");
    expect(generarPdf(vacia).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("X14: en el PDF un texto largo se recorta; en el Excel se conserva completo", async () => {
    const largo = Array.from({ length: 70 }, (_, i) => `palabra${i}`).join(" ");
    const larga = { titulo: "T", hoja: "H", columnas: ["A", "B"], filas: [["x", largo]] };
    const pdf = generarPdf(larga).toString("latin1");
    expect(pdf).toContain("palabra0");
    expect(pdf).not.toContain("palabra69");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await generarExcel(larga)) as unknown as ExcelJS.Buffer);
    expect(libro.getWorksheet("H")!.getCell("B2").value).toBe(largo);
  });
});
```

</details>

<details>
<summary><code>src/app/administracion/exportar/revision-pr269.test.ts</code></summary>

```ts
// Revisión del PR #269: comportamiento de la ruta que las pruebas del PR no cubren.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const dobles = vi.hoisted(() => ({
  requireModulo: vi.fn(),
  cargarHallazgos: vi.fn(),
  perfil: { count: vi.fn(), findMany: vi.fn() },
  auditoria: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/auth/session", () => ({ requireModulo: dobles.requireModulo }));
vi.mock("@/lib/prisma", () => ({ prisma: dobles }));
vi.mock("../calidad/cargar", () => ({ cargarHallazgos: dobles.cargarHallazgos }));

const pedir = (consulta = "") => GET(new Request(`http://localhost/administracion/exportar${consulta}`));
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", correo: "admin@ejemplo.mx", rol: "ADMINISTRADOR" };

beforeEach(() => {
  vi.resetAllMocks();
  dobles.requireModulo.mockResolvedValue(ADMIN);
  dobles.perfil.count.mockResolvedValue(1);
  dobles.perfil.findMany.mockResolvedValue([
    { correo: "a@ejemplo.mx", rol: "DOCENTE", activo: true, profesor: null },
  ]);
  dobles.auditoria.create.mockResolvedValue({});
});

describe("ruta de exportación", () => {
  it("R1: si falla la escritura en la bitácora, la ruta lanza el error y no devuelve una respuesta en español", async () => {
    dobles.auditoria.create.mockRejectedValue(new Error("connection terminated"));
    await expect(pedir("?listado=usuarios&formato=xlsx")).rejects.toThrow("connection terminated");
  });

  it("R2: la bitácora no guarda la búsqueda ni los filtros usados, solo listado, formato y número de filas", async () => {
    await pedir("?listado=usuarios&formato=pdf&q=ana&rol=DOCENTE");
    const evento = dobles.auditoria.create.mock.calls[0][0].data;
    expect(evento.resumen).toBe("Exportó el listado de usuarios y roles a PDF (1 fila).");
    expect(JSON.stringify(evento)).not.toContain("ana");
    expect(JSON.stringify(evento)).not.toContain("DOCENTE");
  });

  it("R3: un parámetro `pagina` en la URL no limita lo que se exporta", async () => {
    await pedir("?listado=usuarios&formato=xlsx&pagina=2");
    const consulta = dobles.perfil.findMany.mock.calls[0][0];
    expect(consulta.skip).toBeUndefined();
    expect(consulta.take).toBeUndefined();
  });

  it("R4: un `listado` repetido se rechaza con 400 y no lee datos", async () => {
    const r = await pedir("?listado=usuarios&listado=auditoria&formato=pdf");
    expect(r.status).toBe(400);
    expect(await r.text()).toBe("Elige qué listado exportar.");
    expect(dobles.perfil.findMany).not.toHaveBeenCalled();
  });

  it("R5: el formato en mayúsculas se rechaza con 400", async () => {
    const r = await pedir("?listado=usuarios&formato=XLSX");
    expect(r.status).toBe(400);
    expect(await r.text()).toBe("Elige Excel o PDF.");
  });

  it("R6: una exportación rechazada por exceso de filas no deja constancia en la bitácora", async () => {
    dobles.perfil.count.mockResolvedValue(10_001);
    const r = await pedir("?listado=usuarios&formato=pdf");
    expect(r.status).toBe(400);
    expect(dobles.auditoria.create).not.toHaveBeenCalled();
  });

  it("R7: la respuesta de error es texto plano en UTF-8", async () => {
    const r = await pedir("?listado=nada&formato=pdf");
    expect(r.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });
});
```

</details>

## 8. Dictamen

**Aprobable con comentarios.** Pasa todas las verificaciones y las reglas del equipo en permisos, validación en el servidor, mensajes en español y listados. Antes de integrar conviene decidir el tope del PDF (hallazgo 1) y capturar el fallo de la bitácora (2); la anotación de filtros (3) y el resto pueden ir en un ajuste posterior. Queda pendiente ver los botones en los tres modos, abrir los archivos descargados y que otra persona lo apruebe. Como el PR depende del #268, se integra después de él y cambia su base a `main`.
