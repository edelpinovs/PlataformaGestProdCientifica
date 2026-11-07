# Prueba del PR #143: Listado paginado de cuerpos académicos (D-009, issue #112)

Registro de la revisión del [PR #143](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/143) de `marisleidysvazquez8293-arch` (rama `feat/M4-D-009-listado-ca`, commit `acee66e`). Cierra #112. El comentario está publicado en el PR.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/modules/cuerpos-academicos/cuerpos-listado.ts` (+ prueba) | Columnas, filtros (nivel, departamento), búsqueda y orden |
| `src/app/cuerpos-academicos/page.tsx` | Usa la pieza compartida; cuenta, pagina y ordena en la base |
| `src/modules/cuerpos-academicos/README.md` | Documenta el listado y la excepción de las tablas del detalle |

No cambia esquema, dependencias ni roles. Editar y Eliminar (#59) no se tocan.

## 2. Chequeos (copia aislada con `main` integrado)

| Chequeo | Resultado |
|---|---|
| `npm test` | 613 pasan (53 archivos), incluida `pauta-visual` |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores (tras regenerar el cliente de Prisma, por el esquema del #132) |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |

## 3. Lectura real de la base (solo lectura), 7 cuerpos académicos

Un script temporal (no se conserva) aplicó `filtroCuerpos` y `ordenCuerpos` con `count` y `findMany` (`take: 10`):

- Sin filtros: 7. `formacion` y `formación`: 3 en ambos casos. `2026`: 2. `0`: 7.
- `100%` y `_` literales: 0 (los comodines se escapan).
- Las 8 columnas en orden descendente: consultas válidas, 7 filas cada una.
- Sin escrituras.

## 4. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | Menor | La búsqueda no cubre «Sin líder», «Sin LGAC», «Asignar», «Designar» ni las palabras «integrantes» y «LGAC»; justificarlo en el issue |
| 2 | Menor | El líder se muestra «Apellidos Nombres (código)» y se busca por campo: «Pérez Juan» no encuentra nada |
| 3 | Menor | Vigencia ordena solo por año de registro |
| 4 | Menor | Sin acentos solo funciona en el nivel (D-213) |

**Dictamen: aprobable con comentarios.** Nada obligatorio antes de integrar.

## 5. No se probó

La pantalla en el navegador (claro, oscuro, celular, selector «Ordenar por»), el paso de página con más de 10 registros (la base tiene 7 cuerpos; lo cubre la pieza compartida) y `npm run build` en la copia. No se escribieron pruebas propias: bastaron las 8 del PR y la lectura de la base.
