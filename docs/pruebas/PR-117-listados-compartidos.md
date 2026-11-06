# Prueba del PR #117: Pieza compartida de listados (D-009, issue #108)

Registro del [PR #117](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/117) (rama `feat/transversal-listados`, en borrador). Lo escribió I1 con ayuda de un agente de código, así que **la revisión independiente y la revisión visual siguen pendientes**: este registro describe lo que se probó al escribirlo, no una aprobación. Cierra #108 y desbloquea #109 a #115.

## 1. Alcance

| Archivo | Qué hace |
|---|---|
| `src/lib/listados/consulta.ts` | Reglas puras: `analizarListado`, `condicionTexto`, `ordenarPor`, `paginar`, `enlaceListado`, `siguienteOrden`, `hayFiltrosActivos` |
| `src/components/listado.tsx` | `<BarraListado>`, `<EncabezadoOrdenable>`, `<PaginacionListado>` |
| `src/modules/catalogos/grados-listado.ts` | Definición de columnas, búsqueda y orden de Grados (ejemplo de uso) |
| `src/app/catalogos/grados/page.tsx` | Grados usa la pieza completa |
| `docs/diseno/PAUTA_VISUAL.md`, `AGENTS.md` | Resumen de uso y referencia a la pieza |

No cambia `schema.prisma`, dependencias ni roles. Editar y Eliminar (#59) no se tocan.

## 2. Chequeos automáticos

| Chequeo | Resultado |
|---|---|
| `npm test` | 518 pruebas pasan (40 archivos); 33 son de esta entrega |
| `npm run lint` | sin errores |
| `npm run typecheck` | `next typegen` y `tsc --noEmit` sin errores |
| `npm run build` | correcto |
| CI del PR | `verificar`, Vercel y Vercel Preview Comments en verde |

Nota: en una corrida completa anterior falló una vez la prueba antigua `revision-pr63` (control del escaneo) por tiempo (8 s); en la siguiente pasó. Parece intermitente por la carga de la máquina y no depende de este cambio.

## 3. Pruebas de la entrega (33)

El código está en los propios archivos de prueba del PR.

**`src/lib/listados/consulta.test.ts` (23)**

| Grupo | Qué comprueba |
|---|---|
| `analizarListado` (7) | Valores iniciales; lectura de texto, página, orden y filtros; columna fuera de la lista permitida (por ejemplo, texto de inyección SQL) se ignora y se avisa; mensajes en español por parámetro; páginas decimales, negativas, con letras o enormes; parámetro repetido en la URL; definición mal hecha falla al instante |
| `condicionTexto` (3) | Sin texto no agrega condición; busca en todos los campos sin distinguir mayúsculas; escapa `% _ \` |
| `ordenarPor` (2) | Traduce la columna y desempata por `id`; columna sin orden definido falla |
| `paginar` (4) | Páginas de 10; fuera de rango muestra la última; sin resultados 0–0; exactamente 10 y 11 elementos |
| `enlaceListado` (5) | Sin cambios no agrega parámetros; cambiar solo la página conserva el estado; cambiar búsqueda, orden o filtro vuelve a la página 1; codifica `&`, `=`, `#` y `ñ` y vuelve a leerse igual; quitar un filtro lo elimina |
| `siguienteOrden` (1) | Primer clic ascendente, siguiente invierte |
| `hayFiltrosActivos` (1) | Detecta búsqueda o filtros |

**`src/components/listado.test.tsx` (7):** `aria-sort` solo en la columna activa y enlace al siguiente orden (ascendente y descendente); `BarraListado` con búsqueda, filtros, selector de celular y valores actuales; avisos de error con `role="alert"`; rango «Mostrando a–b de N», enlaces que conservan el estado; sin navegación con una sola página y «0–0» sin resultados; Anterior y Siguiente deshabilitados en los extremos.

**`src/modules/catalogos/grados-listado.test.ts` (3):** la búsqueda cubre nombre y nomenclatura; orden inicial y desempate por `id`; toda columna ordenable tiene texto para celular y orden definido.

## 4. Lo que no se probó

- La pantalla `/catalogos/grados` en el navegador, en tema claro, oscuro y celular.
- Una segunda página real: hay que registrar más de 10 grados en la base de desarrollo.
- Búsqueda, orden y paginación contra la base real (la consulta no se ejecutó con Prisma en un recorrido manual).
- Que Editar y Eliminar sigan funcionando tras buscar, ordenar y paginar (no se tocaron, pero no se recorrió a mano).

## 5. Lista de verificación para quien revise

Con la vista previa de Vercel del PR:

1. En `/catalogos/grados`, escribir un texto en «Buscar grados»: la lista se filtra por nombre y nomenclatura, y el título del panel muestra el total filtrado.
2. Pulsar los encabezados Nombre y Nomenclatura: ordena y vuelve a invertir; el encabezado activo muestra la flecha y el lector de pantalla anuncia el sentido.
3. Registrar más de 10 grados (datos ficticios) y comprobar «Mostrando 1–10 de N», Siguiente, Anterior y la página 2 con el mismo texto y orden.
4. Escribir una URL inválida, por ejemplo `?orden=otra&pagina=0`: no se rompe; se muestra el aviso en español y el listado con los valores iniciales.
5. En vista de celular (375 px): sin desplazamiento horizontal y con el selector «Ordenar por» y «Sentido».
6. Repetir en tema claro y oscuro (botón del menú).
7. Editar y Eliminar un grado desde la lista filtrada: funcionan y vuelven al listado con su mensaje.

## 6. Decisiones y límites

- Un parámetro inválido no rompe la pantalla: se ignora y se avisa. Producción (#98) hace lo contrario; se alinea en #114.
- Tras Editar o Eliminar la acción redirige sin el estado de búsqueda (conservarlo exigiría cambiar `FilaEditable`); queda fuera.
- Sin prueba de CI que detecte listados sin paginar; es opcional en el issue.

## 7. Estado

**Borrador, pendiente de revisión independiente y visual.** Cuando se revise, se actualiza la fila del #117 en `docs/SEGUIMIENTO.md`.
