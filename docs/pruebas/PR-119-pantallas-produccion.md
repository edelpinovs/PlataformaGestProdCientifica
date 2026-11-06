# Prueba del PR #119: Pantallas de Producción y listado compartido (RF-PC-10, issue #114)

Registro de la revisión del [PR #119](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/119) de `irybyron` (rama `feat/M6-RF-PC-10-pantallas-produccion`, commit `cc139d4`, borrador). Cierra #114. El comentario está publicado en el PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/produccion/consulta.ts` (+ prueba) | Migra la consulta a la pieza compartida (`analizarListado`, `condicionTexto`, `ordenarPor`, `paginar`); orden por etiqueta de tipo y fuente (`tramosPorEtiqueta`); redirección de enlaces antiguos; `paginasVisibles` |
| `src/app/produccion/consultas.ts` | Lectura en un snapshot `RepeatableRead` con orden por tramos de etiqueta |
| `page.tsx`, `escaneo/page.tsx`, `publicaciones/page.tsx` | Tres pantallas: resumen, escaneo y consulta, con `requireModulo("produccion")` |
| `filtros-publicaciones.tsx`, `tabla-publicaciones.tsx`, `paginacion-publicaciones.tsx`, `navegacion-produccion.tsx` | Búsqueda y filtros desplegables, encabezados ordenables, paginación numerada y navegación |
| `actions.ts` | Revalida las tres pantallas |
| `docs/` | D-115, seguimiento y registro del autor |

## 2. Chequeos automáticos (copia aislada, con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 537 de 538 pasan. Falla `revision-pr63` («control: encola el escaneo…») por tiempo: ~7 s con límite de 5 s; sola pasa 13/13. Intermitente y ajena al PR |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Pruebas de revisión: 14 de 14 pasan

Código en la sección 7. Cubren: `texto=` antiguo y prioridad de `q`; `tamanio` antiguo y aviso de 10 por página; profesor y año inválidos o repetidos; columna de orden inexistente; profesor + estado en la misma autoría; búsqueda en campos y etiquetas visibles sin distinguir acentos; escape de comodines; orden por cantidad; `tramosPorEtiqueta` (y que cada obra aparezca exactamente una vez en todas las páginas, ascendente y descendente); `paginasVisibles`; redirección de enlaces antiguos; enlace de página.

## 4. Lectura real de la base (solo lectura)

Con las 33 publicaciones: los 5 órdenes (título, tipo, revista, profesores, fuente), en ambos sentidos, recorridos a lo largo de todas las páginas dieron 33 filas sin repetir y orden correcto por etiqueta, fuente y cantidad. Búsquedas: `demo` 30, `scopus` 6, `articulo` sin acento 6, `_` literal 0, sin resultados 0; `PENDIENTE` + orden por tipo descendente 15, sin duplicados. Sin escrituras.

## 5. Hallazgos (publicados en el PR)

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | Líneas en blanco dentro de las tablas de `SEGUIMIENTO.md` (entre #117 y #119) y `DECISIONES.md` (antes de D-115): las filas quedan fuera de la tabla |
| 2 | A corregir | D-115 trae `?` en lugar de tildes |
| 3 | A corregir | El panel «Publicaciones» del resumen dice «elige cuántas mostrar por página» (D-009 fija 10) |
| 4 | A corregir | La descripción dice «paginación arriba y abajo»; el último commit la deja solo debajo |
| 5 | A corregir | Sin publicaciones ya no distingue «Aún no hay publicaciones registradas» |
| 6 | Menor | Filtro de año como lista de 201 valores |
| 7 | Menor | Buscar un nombre completo no encuentra al profesor (nombres y apellidos por separado) |
| 8 | Menor | «Revista / DOI» y «Fuente» sin etiqueta en celular |

## 6. Dictamen y lo que no se probó

**Aprobable con comentarios.** Sin defectos de código. No se probó: la pantalla en el navegador (claro, oscuro, celular), un escaneo desde la pantalla nueva y `npm run build` en la copia. Salida del borrador pendiente de esa revisión visual.

## 7. Código de las pruebas de revisión

<details>
<summary><code>src/modules/produccion/revision-pr119.test.ts</code></summary>

```ts
// Pruebas de revisión del PR #119 (no forman parte del PR).
import { describe, expect, it } from "vitest";
import {
  analizarConsulta, enlaceConsulta, filtroPublicaciones, ordenPublicaciones, paginasVisibles,
  redireccionConsultaAnterior, tramosPorEtiqueta,
} from "./consulta";

const ok = (p: Record<string, string | string[] | undefined> = {}) => {
  const r = analizarConsulta(p);
  return r.data;
};
const msgs = (p: Record<string, string | string[] | undefined>) => {
  const r = analizarConsulta(p);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
};

describe("revisión PR #119", () => {
  it("R1: enlaces antiguos con texto= siguen funcionando y q= tiene prioridad", () => {
    expect(ok({ texto: "ana" }).q).toBe("ana");
    expect(ok({ texto: "ana", q: "luis" }).q).toBe("luis");
  });

  it("R2: tamanio antiguo (20, 50, 100) se acepta; otro valor da el aviso de 10 por página", () => {
    for (const t of ["10", "20", "50", "100"]) expect(msgs({ tamanio: t })).toEqual([]);
    expect(msgs({ tamanio: "7" })).toEqual(["tamanio: El listado muestra 10 elementos por página."]);
    expect(msgs({ tamanio: ["20", "50"] }).length).toBe(1);
  });

  it("R3: profesor y año inválidos o repetidos dan error y no pasan al filtro", () => {
    expect(msgs({ profesor: "0" })).toEqual(["profesor: Selecciona un profesor válido."]);
    expect(msgs({ profesor: "99999999999" })).toHaveLength(1);
    expect(msgs({ profesor: ["1", "2"] })).toEqual(["profesor: Selecciona un solo profesor."]);
    expect(msgs({ anio: "1899" })).toHaveLength(1);
    expect(msgs({ anio: "2101" })).toHaveLength(1);
    expect(msgs({ anio: "20.5" })).toHaveLength(1);
    expect(ok({ profesor: "x" }).filtros.profesor).toBe("");
  });

  it("R4: una columna de orden inexistente se rechaza con mensaje en español", () => {
    expect(msgs({ orden: "id; DROP TABLE" })).toEqual(["orden: Ordena por una columna válida."]);
  });

  it("R5: profesor + estado se evalúan en la misma autoría", () => {
    const w = filtroPublicaciones(ok({ profesor: "3", estado: "PENDIENTE" })) as { autorias: { some: object } };
    expect(w.autorias.some).toEqual({ profesorId: 3, estado: "PENDIENTE" });
  });

  it("R6: la búsqueda cubre título, autores, DOI, revista, profesor y las etiquetas visibles", () => {
    const w = filtroPublicaciones(ok({ q: "scopus" })) as { OR: object[] };
    const texto = JSON.stringify(w.OR);
    for (const campo of ["titulo", "autoresTexto", "doi", "revistaEditorial", "nombres", "apellidos", "codigo"]) expect(texto).toContain(campo);
    expect(texto).toContain('"fuente":{"in":["SCOPUS"]}');
  });

  it("R7: la búsqueda de una etiqueta no distingue acentos ni mayúsculas (Artículo)", () => {
    const texto = JSON.stringify((filtroPublicaciones(ok({ q: "ARTICULO" })) as { OR: object[] }).OR);
    expect(texto).toContain('"tipo":{"in":["ARTICULO"]}');
  });

  it("R8: el texto escapa comodines y sin texto no hay OR", () => {
    expect((filtroPublicaciones(ok({ q: "50%_" })) as { OR: { titulo: { contains: string } }[] }).OR[0].titulo.contains).toBe("50\\%\\_");
    expect((filtroPublicaciones(ok())) as { OR?: unknown }).not.toHaveProperty("OR");
  });

  it("R9: ordenar por cantidad de profesores usa _count y desempata por id", () => {
    expect(ordenPublicaciones({ ...ok(), orden: "profesores", dir: "desc" })).toEqual([{ autorias: { _count: "desc" } }, { id: "desc" }]);
  });

  it("R10: tramosPorEtiqueta recorre grupos en orden alfabético de etiqueta, con salto y límite", () => {
    const etiquetas = { LIBRO: "Libro", ARTICULO: "Artículo", OTRO: "Otro" };
    const grupos = [{ valor: "OTRO", total: 4 }, { valor: "LIBRO", total: 8 }, { valor: "ARTICULO", total: 12 }];
    // Artículo(12), Libro(8), Otro(4)
    expect(tramosPorEtiqueta(grupos, etiquetas, "asc", 0, 10)).toEqual([{ valor: "ARTICULO", salto: 0, cantidad: 10 }]);
    expect(tramosPorEtiqueta(grupos, etiquetas, "asc", 10, 10)).toEqual([
      { valor: "ARTICULO", salto: 10, cantidad: 2 }, { valor: "LIBRO", salto: 0, cantidad: 8 },
    ]);
    expect(tramosPorEtiqueta(grupos, etiquetas, "asc", 20, 10)).toEqual([{ valor: "OTRO", salto: 0, cantidad: 4 }]);
    expect(tramosPorEtiqueta(grupos, etiquetas, "desc", 0, 10)).toEqual([
      { valor: "OTRO", salto: 0, cantidad: 4 }, { valor: "LIBRO", salto: 0, cantidad: 6 },
    ]);
    expect(tramosPorEtiqueta(grupos, etiquetas, "asc", 24, 10)).toEqual([]);
    expect(tramosPorEtiqueta([], etiquetas, "asc", 0, 10)).toEqual([]);
  });

  it("R11: la suma de los tramos de todas las páginas cubre cada obra exactamente una vez", () => {
    const etiquetas = { A: "Alfa", B: "Beta", C: "Gama" };
    const grupos = [{ valor: "C", total: 7 }, { valor: "A", total: 13 }, { valor: "B", total: 10 }];
    for (const dir of ["asc", "desc"] as const) {
      const vistos = new Map<string, number>();
      for (let pagina = 0; pagina < 3; pagina++) {
        for (const t of tramosPorEtiqueta(grupos, etiquetas, dir, pagina * 10, 10)) {
          for (let i = 0; i < t.cantidad; i++) {
            const clave = `${t.valor}-${t.salto + i}`;
            vistos.set(clave, (vistos.get(clave) ?? 0) + 1);
          }
        }
      }
      expect(vistos.size).toBe(30);
      expect([...vistos.values()].every((n) => n === 1)).toBe(true);
    }
  });

  it("R12: paginasVisibles con pocas, muchas y la primera/última página", () => {
    expect(paginasVisibles(1, 1)).toEqual([1]);
    expect(paginasVisibles(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(paginasVisibles(1, 20)).toEqual([1, 2, 3, "separador", 20]);
    expect(paginasVisibles(10, 20)).toEqual([1, "separador", 8, 9, 10, 11, 12, "separador", 20]);
    expect(paginasVisibles(20, 20)).toEqual([1, "separador", 18, 19, 20]);
  });

  it("R13: la redirección conserva parámetros antiguos, codifica y no sale del módulo", () => {
    expect(redireccionConsultaAnterior({})).toBeNull();
    expect(redireccionConsultaAnterior({ foo: "1" })).toBeNull();
    const url = redireccionConsultaAnterior({ texto: "a&b=c #x", pagina: "2", tipo: ["LIBRO", "OTRO"] })!;
    expect(url.startsWith("/produccion/publicaciones?")).toBe(true);
    expect(url.endsWith("#publicaciones")).toBe(true);
    const qs = new URLSearchParams(url.split("?")[1].split("#")[0]);
    expect(qs.get("texto")).toBe("a&b=c #x");
    expect(qs.getAll("tipo")).toEqual(["LIBRO", "OTRO"]);
    expect(url).not.toMatch(/^\/\//);
  });

  it("R14: el enlace de página conserva q, orden y filtros, y añade el ancla", () => {
    const c = ok({ q: "ana", orden: "fuente", dir: "desc", tipo: "LIBRO", profesor: "4", anio: "2023" });
    const url = enlaceConsulta(c, 3);
    expect(url.endsWith("#publicaciones")).toBe(true);
    const qs = Object.fromEntries(new URLSearchParams(url.split("?")[1].split("#")[0]));
    expect(qs).toEqual({ q: "ana", orden: "fuente", dir: "desc", tipo: "LIBRO", profesor: "4", anio: "2023", pagina: "3" });
  });
});
```

</details>

## 8. Seguimiento: arreglos aplicados por I1 e integración

| Commit | Qué se hizo |
|---|---|
| `6672c39` | Hallazgos 1 a 5: tablas de `SEGUIMIENTO.md` y `DECISIONES.md` sin líneas en blanco; D-115 con sus tildes; el panel «Publicaciones» del resumen ya no dice «elige cuántas mostrar» (D-009 fija 10); sin publicaciones distingue «aún no hay» de «ningún resultado con estos filtros». La descripción del PR se corrigió («debajo de los resultados») |
| `669b58d` | Fusión de `main` (#123, #124 y #125 ya integrados) y conflicto en `SEGUIMIENTO.md`: se conservaron las filas del #119 y del #123 |

Chequeos tras los arreglos: lint, `next typegen` y `tsc --noEmit` sin errores, 86 pruebas de Producción y 210 tras la fusión; CI en verde. El PR se integró el 6 de noviembre **sin revisión visual**. Siguen abiertos los hallazgos menores 6 a 8 (filtro de año, búsqueda por nombre completo, celdas sin etiqueta en celular).
