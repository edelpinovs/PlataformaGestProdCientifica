# Prueba del PR #127: Listados de Divisiones y Departamentos (D-009, issue #109)

Registro del [PR #127](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/127) (rama `feat/M1-listados-divisiones-departamentos`, borrador). Lo escribió I1 con ayuda de un agente de código, así que **la revisión independiente y la visual siguen pendientes**. Cierra #109.

## 1. Alcance

| Archivo | Qué hace |
|---|---|
| `src/modules/catalogos/divisiones-listado.ts` (+ prueba) | Columnas, búsqueda (nombre y clave) y orden, incluida la cantidad de departamentos con `_count` |
| `src/modules/catalogos/departamentos-listado.ts` (+ prueba) | Columnas, búsqueda (nombre, nomenclatura, nombre y clave de la división), filtro por división con las divisiones existentes como valores permitidos y orden agrupado por división por omisión |
| `src/app/catalogos/divisiones/page.tsx`, `departamentos/page.tsx` | Usan `BarraListado`, `EncabezadoOrdenable` y `PaginacionListado` de la pieza compartida (#108) |

No cambia esquema, dependencias ni roles. Editar y Eliminar (#59) no se tocan.

## 2. Chequeos automáticos

| Chequeo | Resultado |
|---|---|
| `npm test` | 554 pruebas pasan (43 archivos); 10 son de esta entrega |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | correcto |

## 3. Pruebas nuevas (10)

- **Divisiones (3):** la búsqueda cubre nombre y clave; orden por nombre y por cantidad de departamentos (`_count`) con desempate por `id`; toda columna ordenable tiene texto y orden definido.
- **Departamentos (7):** las divisiones existentes son los valores permitidos del filtro (y un valor inexistente se ignora con aviso); sin divisiones el filtro vacío funciona; la búsqueda cubre nombre, nomenclatura, nombre y clave de la división; búsqueda combinada con el filtro; orden por omisión agrupado por división y nombre; otras columnas no agregan la división; toda columna ordenable tiene texto y orden definido.

## 4. Lectura real de la base (solo lectura)

Con 3 divisiones y 6 departamentos: órdenes (incluida la cantidad de departamentos, descendente), búsqueda `a`, `_` (literal, 0 resultados), filtro por división y filtro combinado con búsqueda y orden. En Departamentos, recorrer todas las páginas dio las mismas filas sin repetir. Sin escrituras.

## 5. Lo que no se probó

- La pantalla en el navegador, en tema claro, oscuro y celular.
- La página 2: la base solo tiene 3 divisiones y 6 departamentos; hay que registrar más de 10 de cada uno (datos ficticios).
- Que Editar y Eliminar sigan funcionando tras buscar, ordenar y paginar (no se tocaron, pero no se recorrieron a mano).
- La tabla de Departamentos conserva su `overflow-x-auto` anterior; no se cambió en este PR.

## 6. Lista de verificación para quien revise

Con la vista previa de Vercel:

1. `/catalogos/divisiones`: buscar por nombre y por clave; ordenar por Nombre, Clave y Departamentos (numérico) y volver a invertir.
2. `/catalogos/departamentos`: buscar por nombre, nomenclatura y por el nombre o la clave de la división; filtrar por División y combinarlo con la búsqueda; ordenar por cada encabezado. Por omisión debe verse agrupado por división.
3. Registrar más de 10 filas (datos ficticios) y comprobar «Mostrando 1–10 de N», Siguiente, Anterior y la página 2 con el mismo texto, filtro y orden.
4. Una URL inválida (`?orden=otra&division=999&pagina=0`) no rompe la pantalla: muestra el aviso en español.
5. En celular (375 px): sin desplazamiento horizontal y con el selector «Ordenar por».
6. Tema claro y oscuro.
7. Editar y Eliminar una fila desde una lista filtrada.

## 7. Estado

**Borrador, pendiente de revisión independiente y visual.**
