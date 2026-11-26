# Revisión del PR #370: el aviso pasa de `<p>` a `<div>` para que la lista de errores quede dentro

Revisión del [PR #370](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/370) de `Grillo-de-Alambre`. Corrige un fallo que afectaba a todos los módulos y no está ligado a ningún issue.

| Campo | Valor |
|---|---|
| PR | #370 (sin `Closes` ni `Refs`) |
| Autor | @Grillo-de-Alambre |
| Rama | `fix/transversal-aviso-lista-errores` → `main` |
| Commit revisado | `656a6a3` |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`), con el PR mezclado con `main` en `d98e454`. La rama iba 9 commits atrás y se mezcló sin conflictos. Sin base de datos y sin `next dev` |
| Resultado | **Aprobable.** El cambio es mínimo, corrige el fallo en todas las pantallas a la vez y trae una prueba que falla sin él. Solo hay detalles menores |

## 1. Alcance

| Archivo | Cambio |
|---|---|
| `src/components/ui.tsx` | `<Aviso>` se dibuja como `<div>` en lugar de `<p>`, con las mismas clases y el mismo `role` (`alert` para los errores, `status` para lo demás) |
| `src/components/listado.test.tsx` | Prueba nueva: con `?orden=otra`, la lista de errores de `<BarraListado>` queda dentro del `div` con `role="alert"` y no dentro de un párrafo |

Sin cambios de esquema, migración ni dependencias. Toca `src/components/`, y el PR dice que se acordó en el chat del equipo.

## 2. El fallo que corrige

Comprobé que el diagnóstico es correcto. Un `<ul>` no puede ir dentro de un `<p>`. Al leer el HTML del servidor, el navegador cierra el `<p>` antes de la lista, así que:

- el aviso con `role="alert"` queda vacío y el lector de pantalla no anuncia el error;
- React encuentra un árbol distinto al que esperaba y da un error de hidratación.

Hoy ponen una lista de errores dentro de `<Aviso>`:

- `src/components/listado.tsx`, en `<BarraListado>`, que usan todos los listados;
- las cuatro pantallas de Reportes: `reportes/page.tsx`, `matriz`, `convocatoria` y `completo`.

Cambiar la pieza las corrige todas sin tocar cada pantalla.

## 3. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` (PR mezclado con `main`) | Correcto: 132 archivos, 1603 pruebas |
| La prueba nueva sin la corrección | **Falla**, como debe: con el `<Aviso>` de `main` la lista queda dentro del `<p>`. Con la corrección pasa |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| `pauta-visual.test.ts` | Correcto |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 4. Lo que se revisó y está bien

- **El aspecto no cambia.** Tailwind (preflight) ya quita el margen del `<p>`, y ningún estilo de `globals.css` ni ninguna clase (`[&_p]`, `> p`) dependía de que el aviso fuera un `<p>`.
- **Ninguna prueba dependía del `<p>`.** Las pruebas buscan `role="alert"` o el texto, no la etiqueta.
- **No hay casos nuevos de HTML inválido.** Revisé dónde se usa `<Aviso>`: ninguno está dentro de un `<p>`. El único que está dentro de un elemento de línea es el de `convocatorias/fila.tsx` (detalle menor, abajo), y ese ya era inválido con el `<p>`.
- **La accesibilidad mejora.** El `role` se conserva, y ahora el lector de pantalla recibe el mensaje completo.

## 5. Detalles menores

- **Sin issue.** AGENTS.md pide trabajar sobre un issue. Es un arreglo transversal pequeño, así que basta con abrir un issue o anotar en el PR por qué no lo tiene.
- **El acuerdo no consta en la bitácora.** No está anotado en `docs/DECISIONES.md`. Para un arreglo así es opcional, pero sirve de constancia de que el cambio a `src/components/` se acordó.
- **La prueba cubre solo los listados.** Comprueba `<BarraListado>` y no las cuatro pantallas de Reportes. Esas quedan cubiertas porque usan la misma pieza, así que no hace falta más.
- **`convocatorias/fila.tsx` pone `<Aviso>` dentro de un `<span>`.** Un bloque dentro de un `<span>` no es HTML válido, ni antes con el `<p>` ni ahora con el `<div>`. El navegador no lo reacomoda y no da error de hidratación, porque el `<span>` no se cierra solo como el `<p>`. Viene de antes y se arregla cambiando el `<span>` por un `<div>` en su propio módulo.

## 6. Lo que no se probó

- **El navegador.** El autor dice que revisó con un parámetro inválido en Participantes, Profesores y la matriz de Reportes, y que la consola ya no muestra el error de hidratación. Yo no abrí el navegador ni probé con un lector de pantalla.
- **Límite de esta revisión:** el revisor es otra persona que el autor, pero la revisión la hizo un agente. La aprobación en GitHub la da I1 (D-006).
