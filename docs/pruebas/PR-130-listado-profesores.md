# Prueba del PR #130: Listado paginado del directorio de profesores (D-009, issue #110)

Registro de la revisión del [PR #130](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/130) de `dpfuentes92` (rama `feat/M2-D-009-listado-profesores`, commit `700f551`). Cierra #110. El comentario está publicado en el PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/profesores/profesores-listado.ts` (+ prueba) | Columnas, valores permitidos de los filtros (estatus, departamento, grado), búsqueda, filtros y orden |
| `src/app/profesores/page.tsx` | Usa la pieza compartida; en celular apila correo y estatus bajo el nombre y ofrece «Ordenar por» |

No cambia esquema, dependencias ni roles. Editar y Eliminar (#59) no se tocan.

## 2. Conflicto con `main` y su resolución

El PR estaba en conflicto con `main` porque el #128 cambió las mismas líneas de `page.tsx` (placeholders del Scholar ID y del Scopus ID). I1 lo resolvió en la rama de la autora con el commit de fusión `18aa230` (sin reescribir su historial): se conserva el listado paginado y se vuelven a aplicar los dos placeholders.

## 3. Chequeos (copia aislada, con el conflicto resuelto)

| Chequeo | Resultado |
|---|---|
| `npm test` | 579 de 580 pasan (45 archivos). Falló `unificado.test.ts` («produce un archivo Excel válido…») por tiempo, 5.4 s con límite de 5 s; sola pasa 2/2. Se corrige con el PR #135 |
| Pruebas de Profesores | 62 pasan |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 4. Pruebas de revisión: 10 de 10 pasan

Código en la sección 7.

| Id | Qué comprueba |
|---|---|
| T1 | Valores permitidos de cada filtro; uno inexistente se ignora con aviso |
| T2 | Sin departamentos ni grados el filtro vacío funciona |
| T3 | La búsqueda cubre código, nombres, apellidos, correo, departamento y grado (nombre y nomenclatura) |
| T4 | Escape de comodines; sin texto no hay `OR` |
| T5 | Filtros combinados con Y y con la búsqueda |
| T6 | Orden: apellidos → nombres → id; otras columnas solo desempatan por id |
| T7 | Toda columna ordenable tiene texto y orden definido; una ajena se rechaza |
| T8 | 54 profesores: `pagina=99` muestra 51–54; los enlaces conservan el estado |
| T9 | Buscar un nombre completo no coincide con ningún campo (**confirmaba la limitación**; corregida en `501359a`: ahora la búsqueda es por palabras) |
| T10 | La búsqueda no cubre tipo de contratación ni etiqueta de estatus (**confirmaba la limitación**; corregida en `501359a`) |

## 5. Lectura real de la base (solo lectura), 54 profesores

- Las 4 columnas (código, nombre, correo, estatus) en ambos sentidos, recorridas por las 6 páginas: 54 filas distintas sin repetir.
- Búsquedas: `alarcón` 1; `Alarcon` sin acento 0; `demo` 50; `_` y `%` literales 0; `zzzz` 0.
- Filtros: ACTIVO 48; LICENCIA 3; departamento 9; grado 12; combinado 7.
- `pagina=99` muestra el listado; parámetros inválidos (`orden=perfil&estatus=X&pagina=0`) dan 3 avisos y el listado completo.
- **El nombre completo de un profesor existente dio 0 resultados.** Sin escrituras.

## 6. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | Buscar un nombre completo no encuentra a nadie; dividir el texto en palabras y exigir que cada una aparezca en algún campo |
| 2 | Menor | Sin acentos no encuentra «Alarcón» |
| 3 | Menor | La búsqueda no cubre tipo de contratación ni etiqueta de estatus |
| 4 | Menor | `sinResultados` significa «hay filtros activos» |
| 5 | Menor | Descripción en inglés |
| 6 | Menor | Falta la revisión en tema oscuro |

**Aprobable con comentarios.** No se probó: la pantalla en el navegador (claro, oscuro, celular), Editar y Eliminar desde una lista filtrada, la página 2 con sesión y `npm run build` en la copia.

## 7. Código de las pruebas de revisión

<details>
<summary><code>src/modules/profesores/revision-pr130.test.ts</code></summary>

```ts
// Pruebas de revisión del PR #130 (no forman parte del PR).
import { describe, expect, it } from "vitest";
import { analizarListado, enlaceListado, paginar } from "@/lib/listados/consulta";
import { COLUMNAS_PROFESORES, filtroProfesores, listadoProfesores, ordenProfesores } from "./profesores-listado";

const def = listadoProfesores([1, 2], [5]);
const analizar = (p: Record<string, string | string[]> = {}) => analizarListado(def, p);

describe("revisión PR #130", () => {
  it("T1: los valores permitidos de cada filtro son los existentes (estatus, departamento, grado)", () => {
    expect(analizar({ departamento: "2", grado: "5", estatus: "ACTIVO" }).errores).toEqual({});
    const mal = analizar({ departamento: "9", grado: "7", estatus: "JUBILADO" });
    expect(Object.keys(mal.errores).sort()).toEqual(["departamento", "estatus", "grado"]);
    expect(mal.consulta.filtros).toEqual({ estatus: "", departamento: "", grado: "" });
  });

  it("T2: sin departamentos ni grados los filtros vacíos funcionan y cualquier valor se ignora", () => {
    const vacio = listadoProfesores([], []);
    expect(analizarListado(vacio, {}).errores).toEqual({});
    expect(analizarListado(vacio, { departamento: "1" }).errores.departamento).toBeDefined();
  });

  it("T3: la búsqueda cubre código, nombres, apellidos, correo, departamento y grado (nombre y nomenclatura)", () => {
    const donde = filtroProfesores(analizar({ q: "ala" }).consulta) as { OR: object[] };
    expect(donde.OR).toEqual([
      { codigo: { contains: "ala", mode: "insensitive" } },
      { nombres: { contains: "ala", mode: "insensitive" } },
      { apellidos: { contains: "ala", mode: "insensitive" } },
      { correo: { contains: "ala", mode: "insensitive" } },
      { departamento: { nombre: { contains: "ala", mode: "insensitive" } } },
      { grado: { nombre: { contains: "ala", mode: "insensitive" } } },
      { grado: { nomenclatura: { contains: "ala", mode: "insensitive" } } },
    ]);
  });

  it("T4: la búsqueda escapa comodines y sin texto no hay OR", () => {
    const donde = filtroProfesores(analizar({ q: "a_b%" }).consulta) as { OR: { codigo: { contains: string } }[] };
    expect(donde.OR[0].codigo.contains).toBe("a\\_b\\%");
    expect(filtroProfesores(analizar().consulta)).toEqual({});
  });

  it("T5: los filtros se combinan con Y y con la búsqueda", () => {
    const donde = filtroProfesores(analizar({ q: "ana", estatus: "LICENCIA", departamento: "1", grado: "5" }).consulta);
    expect(donde).toMatchObject({ estatusLaboral: "LICENCIA", departamentoId: 1, gradoId: 5 });
    expect(donde).toHaveProperty("OR");
  });

  it("T6: nombre ordena por apellidos, luego nombres y luego id; otras columnas solo desempatan por id", () => {
    expect(ordenProfesores(analizar().consulta)).toEqual([{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }]);
    expect(ordenProfesores(analizar({ orden: "nombre", dir: "desc" }).consulta)).toEqual([{ apellidos: "desc" }, { nombres: "desc" }, { id: "desc" }]);
    expect(ordenProfesores(analizar({ orden: "estatus", dir: "desc" }).consulta)).toEqual([{ estatusLaboral: "desc" }, { id: "desc" }]);
    expect(ordenProfesores(analizar({ orden: "codigo" }).consulta)).toEqual([{ codigo: "asc" }, { id: "asc" }]);
  });

  it("T7: toda columna ordenable tiene texto para celular y orden definido; una columna ajena se rechaza", () => {
    expect(COLUMNAS_PROFESORES.map((c) => c.clave)).toEqual([...def.columnas]);
    for (const clave of def.columnas) expect(() => ordenProfesores(analizar({ orden: clave }).consulta)).not.toThrow();
    expect(analizar({ orden: "perfil" }).errores.orden).toBe("Ordena por una columna válida.");
  });

  it("T8: paginación de 54 profesores (pagina 99 muestra 51–54) y enlaces que conservan el estado", () => {
    const { consulta } = analizar({ pagina: "99", q: "a", estatus: "ACTIVO" });
    const p = paginar(54, consulta);
    expect([p.pagina, p.desde, p.hasta, p.totalPaginas]).toEqual([6, 51, 54, 6]);
    const url = enlaceListado("/profesores", def, { ...consulta, pagina: p.pagina }, { pagina: 5 });
    expect(Object.fromEntries(new URLSearchParams(url.split("?")[1]))).toEqual({ q: "a", estatus: "ACTIVO", pagina: "5" });
  });

  it("T9: buscar por nombre completo («Ana Pérez») no encuentra a nadie porque nombres y apellidos se buscan por separado (confirma la limitación)", () => {
    const donde = filtroProfesores(analizar({ q: "Ana Pérez" }).consulta) as { OR: { nombres?: { contains: string }; apellidos?: { contains: string } }[] };
    const nombres = donde.OR.find((c) => c.nombres)!.nombres!.contains;
    const apellidos = donde.OR.find((c) => c.apellidos)!.apellidos!.contains;
    // Ningún campo individual contiene «ana pérez» completo, así que la consulta sobre la base no coincide.
    expect(nombres).toBe("Ana Pérez");
    expect(apellidos).toBe("Ana Pérez");
  });

  it("T10: la búsqueda no cubre el tipo de contratación ni la etiqueta de estatus, que la fila sí muestra (confirma la limitación)", () => {
    const texto = JSON.stringify((filtroProfesores(analizar({ q: "tiempo completo" }).consulta) as { OR: object[] }).OR);
    expect(texto).not.toContain("tipoContratacion");
    expect(texto).not.toContain("estatusLaboral");
  });
});
```

</details>

## 8. Seguimiento: cambios aplicados por I1

Con el visto bueno de I1 para avanzar, se aplicaron los cambios de la revisión en la rama de la autora y se avisó en un comentario del PR.

| Commit | Qué se hizo |
|---|---|
| `18aa230` | Conflicto con `main` resuelto (sección 2) |
| `501359a` | Hallazgo 1: la búsqueda se divide en palabras y cada una debe aparecer en algún campo (máximo cinco). Hallazgo 3: también se busca por la etiqueta visible de tipo de contratación y estatus, sin distinguir acentos ni mayúsculas. Hallazgo 4: `sinResultados` pasó a `hayFiltros`. La descripción del PR se reescribió en español (hallazgo 5) |

Chequeos: pruebas de Profesores 66 pasan, lint y `next typegen` + `tsc --noEmit` sin errores. **Lectura real de la base (solo lectura):** el nombre completo de un profesor existente pasó de 0 a 1 resultado, y también funciona «Apellido Nombre»; `tiempo completo` 38, `asignatura` 16, `baja` 2, `demo` 50, `_` y `%` literales 0.

Quedan abiertos: los acentos en nombres propios (hallazgo 2, ahora D-213, pendiente de acordar porque exige la extensión `unaccent` con una migración) y la revisión visual en tema oscuro y celular (hallazgo 6).
