# Prueba del PR #166: pieza compartida SelectorProfesor (D-215, issue #162)

Registro de la revisión del [PR #166](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/166) de `irybyron` (rama `feat/M2-RF-UI-selector-profesor`, commit `7ff2bc7`). Cierra #162. El comentario está publicado en el PR. Se integró con las correcciones de I1.

## 1. Alcance revisado

| Archivo | Qué hace |
|---|---|
| `src/components/selector-profesor.tsx` | Combobox con listbox: búsqueda por nombre, apellidos y código, teclado, selección en campo oculto |
| `src/lib/selectores/profesor.ts` (+ prueba) | Búsqueda, esquema Zod del identificador y `revalidarProfesorSeleccionado` (antes en `src/modules/profesores/`) |
| `src/components/pruebas-navegador.mjs`, `selector-profesor.navegador.mjs` | Prueba en Chrome aislado con profesores ficticios |
| `docs/diseno/PAUTA_VISUAL.md` | Contrato de la pieza |

No cambia esquema, dependencias ni permisos. No migra pantallas.

## 2. Chequeos (copia aislada con `main` integrado y los cambios de I1)

| Chequeo | Resultado |
|---|---|
| `npm test` | 635 pasan (55 archivos) |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores (tras regenerar el cliente de Prisma) |
| `npm run build` | no se ejecutó en la copia; el CI del PR pasó |
| `node src/components/selector-profesor.navegador.mjs` | correcto en claro, oscuro y celular, antes y después del cambio de I1; se miraron las capturas de oscuro y celular |

## 3. Hallazgos (publicados en el PR) y dictamen

| # | Tipo | Hallazgo |
|---|---|---|
| 1 | A corregir | El helper estaba en `src/modules/profesores/` (módulo de I2) y un componente compartido dependía de un módulo. Con el visto bueno de dpfuentes92 y del equipo, I1 lo movió a `src/lib/selectores/profesor.ts` (**D-218**) |
| 2 | Menor | El máximo del identificador era `Number.MAX_SAFE_INTEGER`, pero `Profesor.id` es un `Int` de 32 bits. I1 lo limitó a 2 147 483 647 y la prueba incluye `"2147483648"` |
| 3 | Menor | La pauta no explicaba que, dentro de `ModalAlta`, tras un error hay que pasar `valorInicial` desde `estado.valores`; I1 lo documentó |
| 4 | Menor | La lista de sugerencias se abre sola al enfocar el campo; dentro de un modal se abriría al abrirlo. Queda abierto |
| 5 | Menor | `pruebas-navegador.mjs` repite lo del modal; la rama lleva `M2` aunque la pieza es transversal. Queda abierto |

**Bien:** accesibilidad de combobox, la selección no se pierde al buscar, el profesor que deja de estar permitido se conserva con aviso y `revalidarProfesorSeleccionado` consulta de nuevo con Prisma, rechaza la respuesta de otro profesor y devuelve mensajes en español ante valores atípicos.

**Dictamen: aprobable con comentarios.** I1 aplicó los puntos 1 a 3 en la rama (commits `61664d6` y `9f4b448`). Integrado.

## 4. No se probó

El selector dentro de `ModalAlta` (el primer Escape cierra las sugerencias y el siguiente debe cerrar el modal; es lo primero del piloto), una Server Action real con permisos y elegibilidad, un lector de pantalla, `npm run build` en la copia y otros navegadores.
