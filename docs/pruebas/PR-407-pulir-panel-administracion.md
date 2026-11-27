# Revisión del PR #407: Administración pule iconos, avisos y confirmaciones del panel (#347)

Revisión del [PR #407](https://github.com/edelpinovs/PlataformaGestProdCientifica/pull/407) de `edelpinovs` (I1). Cierra [#347](https://github.com/edelpinovs/PlataformaGestProdCientifica/issues/347), que reúne los hallazgos menores de la revisión visual del panel (#282).

| Campo | Valor |
|---|---|
| PR | #407 (`Closes #347`) |
| Autor | @edelpinovs (I1) |
| Rama | `feat/M8-347-pulir-panel` → `main` |
| Commit revisado | `494a475` (ya contiene `main`) |
| Fecha de la revisión | 2026-11-26 |
| Revisó | @edelpinovs (I1), con Claude Code |
| Entorno | Local (Windows 10, Node 24), en una carpeta aparte (`git worktree`). Sin base de datos y sin `next dev` |
| Resultado | **Aprobable con comentarios.** Los seis puntos del issue quedan corregidos o descartados con una nota. Falta la revisión visual que pide el issue, y la tabla de Calidad puede desbordarse en celular con el cambio (hallazgo 1). El autor es I1, así que la aprobación tiene que darla otra persona (D-006) |

## 1. Alcance

| Punto del issue | Cambio | Archivo |
|---|---|---|
| Iconos de Desactivar y Reactivar | Pausa y «play» dentro de un círculo, sin el rojo ni el bote de basura de *Eliminar*. Los iconos se definen en la fila, no en `ICONOS` | `usuarios/fila-usuario.tsx` |
| Etiquetas de «Problema» | La celda lleva `whitespace-nowrap` | `calidad/page.tsx` |
| Guardar sin cambios | Redirige con `?sinCambios=` y la página muestra «No había cambios que guardar en «…».» como `aviso`, no como éxito | `usuarios/actions.ts`, `page.tsx` y `actions.test.ts` |
| Desactivar el propio usuario | La confirmación avisa «No puedes desactivar tu propio acceso. Pídeselo a otro administrador.», no ofrece el botón y cambia *Cancelar* por *Cerrar*. El servidor lo sigue rechazando | `usuarios/fila-usuario.tsx` |
| Selector de profesor en la edición | *Guardar* y *Cancelar* pasan debajo del formulario. **Descartado:** el hueco entre el campo y «Seleccionado: …» viene de `SelectorProfesor`, que es una pieza compartida | `usuarios/fila-usuario.tsx` |
| Descarga sin sesión | El redireccionamiento a `/login` ya no conserva los parámetros de la página pedida (`url.search = ""`) | `src/proxy.ts` |

Sin cambios de esquema, migración ni dependencias.

## 2. Verificaciones automáticas

| Verificación | Resultado |
|---|---|
| `npm test` | Correcto: 142 archivos, 1752 pruebas |
| `npm run lint` | Correcto |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto (el PR dice que no lo corrió; lo corrí aquí) |
| CI de GitHub (`verificar`) y vista previa de Vercel | Correctos |

## 3. Lo que se revisó y está bien

- **El servidor sigue protegiendo.** Ocultar el botón de desactivarse es solo una ayuda: `cambiarEstadoUsuario` sigue rechazando el caso. Las acciones siguen empezando con `requireModulo`.
- **Guardar sin cambios no escribe nada.** La prueba comprueba que no hay transacción, ni cambio en el perfil, ni registro en la bitácora, y ahora también el redireccionamiento con `sinCambios`.
- **El cambio en `src/proxy.ts` es seguro.** `/login` solo lee `error`, y nadie llega ahí desde una ruta protegida con ese parámetro. Las rutas públicas (`/login` y `/auth`) no pasan por esa rama, así que los enlaces de invitación y el `code` de `/auth` no cambian. El fragmento `#…` de los enlaces de Supabase no llega al servidor.
- **Los iconos nuevos** son trazos SVG con el mismo `Icono`. El círculo se dibuja con dos arcos, y el `title` y el `aria-label` siguen igual. No usan colores fijos y `pauta-visual.test.ts` pasa.
- **El descarte del hueco en el selector** se explica en el PR, como permite el issue («corregido o descartado con una nota»).

## 4. Hallazgos

### Hallazgo 1 (medio): falta la revisión visual, y la tabla de Calidad puede desbordarse en celular

El *Terminado cuando* del issue pide revisar en tema claro, oscuro y celular (390 × 844). El PR dice que no se hizo.

En Calidad, la tabla no apila sus columnas en celular: es un `<table>` con cuatro columnas (Registro, Problema, Detalle y Corregir). Con `whitespace-nowrap`, una etiqueta larga como «Integrante de baja o trasladado» o «Cuerpo académico sin líder» ya no puede partirse. A 390 px, la suma de las columnas puede rebasar el ancho y producir desplazamiento horizontal, que AGENTS.md prohíbe. No lo vi en pantalla, así que hay que comprobarlo.

**Qué hacer:**

- Ver Calidad y Usuarios en la vista previa de Vercel en los tres modos.
- Si Calidad se desborda, aplicar el ajuste solo desde pantallas medianas (`sm:whitespace-nowrap`), o apilar la tabla en celular como los demás listados.

### Hallazgo 2 (bajo): `src/proxy.ts` es transversal y el acuerdo no consta

AGENTS.md pide detenerse y acordarlo en el chat antes de tocar archivos fuera del módulo. El PR lo señala en «Para quien revisa», pero no dice que se acordó. El cambio es de una línea y afecta a toda ruta protegida que se visita sin sesión.

**Qué hacer:** confirmarlo en el chat, o anotarlo en el PR al aprobar. No hace falta una decisión en `docs/DECISIONES.md`.

### Detalles menores

- **Sin prueba de la pantalla.** No hay prueba de que la página muestre el aviso de tipo `aviso` con `sinCambios`, ni de que la confirmación del propio usuario oculte el botón. Las dos cosas se ven en la interfaz y tienen poca lógica, pero el aviso depende de una condición (`typeof sinCambios === "string" && typeof editado !== "string"`). Sería más claro calcular el tipo de aviso junto con `resultado`, en la misma cadena de casos.
- **Iconos locales.** `ICONO_PAUSA` e `ICONO_REACTIVAR` viven en la fila para no tocar `src/components/ui.tsx`. Si otro módulo los necesita, conviene pasarlos a `ICONOS`.
- **`proxy.ts` no tiene prueba.** Ya no la tenía. El cambio es simple, pero una prueba que arme la redirección sin sesión evitaría que vuelva el ruido.

## 5. Lo que no se probó

- **El navegador.** No abrí las pantallas ni probé la descarga sin sesión. La revisión se hizo sobre el código y las pruebas.
- **Las acciones con la base real.**
- **Límite de esta revisión:** el autor y el revisor son la misma persona (I1, con un agente). La aprobación en GitHub debe darla otra persona del equipo (D-006).
